export interface Env {
  GEMINI_API_KEY: string
  ALLOWED_ORIGIN?: string
}

// ─── CORS ─────────────────────────────────────────────────────────────────

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGIN ?? '*'
  const origin = request.headers.get('Origin') ?? ''
  const isAllowed =
    allowed === '*' ||
    origin === allowed ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

function withCors(res: Response, cors: Record<string, string>): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

// ─── Types ────────────────────────────────────────────────────────────────

interface CatalogProduct {
  id: string
  name: string
  category: string
  basePrice: number
  styles: string[]
  variants: Array<{ id: string; name: string; color: string; priceDelta: number }>
  brand?: string
  material?: string[]
  colorFamily?: string
  roomTypes?: string[]
  tags?: string[]
}

interface AnalyzeRoomBody {
  imageBase64: string
  style: string
  catalog: CatalogProduct[]
  excludeProductIds?: string[]
}

interface GenerateRoomBody {
  imageBase64: string
  style: string
  products?: string[]
}

interface DesignPlacementInput {
  productId: string
  variantId: string
  imageUrl: string      // product image URL to fetch and send as visual reference
  name: string
  category: string
  x: number             // left edge % of image width
  y: number             // top edge % of image height
  width: number         // % of image width
  height: number        // % of image height
  zIndex: number
  viewAngle?: number
}

interface DesignRoomBody {
  roomImageBase64: string
  style: string
  placements: DesignPlacementInput[]
}

// ─── Style descriptions ────────────────────────────────────────────────────

const STYLE_DESCRIPTIONS: Record<string, string> = {
  japandi: 'Japandi (Japanese-Scandinavian fusion) — natural wood, neutral tones, zen simplicity, organic shapes',
  'mid-century': 'Mid-Century Modern — warm walnut wood, geometric forms, retro accent colours, tapered legs',
  scandinavian: 'Scandinavian — light birch wood, white tones, hygge cosiness, functional minimalism',
  industrial: 'Industrial Loft — exposed materials, dark metal frames, Edison bulbs, raw textures',
  coastal: 'Coastal Beach House — whitewashed wood, navy-white palette, rattan, breezy natural light',
  bohemian: 'Bohemian Eclectic — layered textiles, macramé, earthy tones, mixed patterns and plants',
  contemporary: 'Contemporary Modern — clean lines, neutral palette, statement lighting, minimalist luxury',
}

// ─── Utilities ────────────────────────────────────────────────────────────

function detectMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

function geminiUrl(model: string, key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { cf: { cacheEverything: true, cacheTtl: 3600 } } as RequestInit)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let b64 = ''
    // chunk to avoid call stack limits
    for (let i = 0; i < bytes.length; i += 8192) {
      b64 += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    const mimeType = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
    return { data: btoa(b64), mimeType }
  } catch {
    return null
  }
}

// ─── analyze-room: Gemini vision → product placement ──────────────────────

async function handleAnalyzeRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as AnalyzeRoomBody
  const { imageBase64, style, catalog, excludeProductIds } = body

  if (!imageBase64 || !style || !catalog?.length) {
    return json({ error: 'Missing required fields: imageBase64, style, catalog' }, 400)
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'GEMINI_KEY_INVALID' }, 502)
  }

  const styleDesc = STYLE_DESCRIPTIONS[style] ?? style

  const catalogSummary = catalog.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.basePrice,
    brand: p.brand,
    styles: p.styles,
    colorFamily: p.colorFamily,
    material: p.material,
    roomTypes: p.roomTypes,
    variants: p.variants.map((v) => ({ id: v.id, name: v.name, color: v.name, priceDelta: v.priceDelta })),
  }))

  const excludeLine = excludeProductIds?.length
    ? `\n• AVOID selecting these product IDs (already shown to user): ${excludeProductIds.join(', ')}`
    : ''

  const prompt = `You are an expert AI interior designer working for a furniture retailer.

Analyse the uploaded room photo and select the best products from the catalog for a ${styleDesc} redesign.

Catalog (JSON):
${JSON.stringify(catalogSummary, null, 2)}

Instructions:
• Select 4–5 products that best fit the "${style}" aesthetic and suit this room type${excludeLine}
• Identify existing furniture in the photo and place the catalog items at those exact positions
• x = left edge of bounding box as % of image WIDTH (0 = left, 100 = right)
• y = top edge of bounding box as % of image HEIGHT (0 = top, 100 = bottom)
• width / height = bounding box size as % of image
• viewAngle = horizontal rotation angle in degrees of how the furniture is oriented:
    0 = frontal/straight-on view
    negative = furniture is turned LEFT (you see its right side)
    positive = furniture is turned RIGHT (you see its left side)
    typical range: -45 to +45
• zIndex: foreground items (rugs) = 1, mid (sofas, chairs) = 2–3, background (lamps, art) = 4–5
• Pick the variant whose colour best matches the style palette
• Write styleDescription in English, 2–3 sentences describing the redesign

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "selectedProducts": [
    {
      "productId": "string",
      "variantId": "string",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "zIndex": number,
      "viewAngle": number
    }
  ],
  "totalPrice": number,
  "styleDescription": "string"
}`

  const ANALYSIS_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ]

  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: detectMimeType(imageBase64), data: imageBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
  })

  let lastErr = ''
  for (const model of ANALYSIS_MODELS) {
    const res = await fetch(geminiUrl(model, env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })

    if (!res.ok) {
      lastErr = await res.text()
      console.warn(`[Gemini/${model}] failed ${res.status}:`, lastErr.slice(0, 120))
      continue
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>
      error?: { message: string }
    }

    if (data.error) {
      lastErr = data.error.message
      console.warn(`[Gemini/${model}] API error:`, lastErr.slice(0, 120))
      continue
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    try {
      const result = JSON.parse(rawText)
      console.log(`[Gemini/${model}] analyze-room success`)
      return json(result)
    } catch {
      lastErr = `JSON parse failed: ${rawText.slice(0, 80)}`
      console.warn(`[Gemini/${model}] JSON parse failed`)
      continue
    }
  }

  console.error('[Gemini] all analyze models failed:', lastErr.slice(0, 200))
  return json({ error: 'AI analysis failed', detail: lastErr }, 502)
}

// ─── design-room: multi-image composite — room + product photos → new image ─
// This is the core new endpoint. We receive:
//   • roomImageBase64 — the uploaded room photo
//   • placements[]   — each with: imageUrl (product photo URL), name, category, x/y/width/height
// We fetch each product image, build a multi-part Gemini prompt, and return a
// composited room image where each product is placed at its specified position.
// Positions are KNOWN from the analyze step — no locate step needed.

async function handleDesignRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as DesignRoomBody
  const { roomImageBase64, style, placements } = body

  if (!roomImageBase64 || !style || !placements?.length) {
    return json({ error: 'Missing required fields: roomImageBase64, style, placements' }, 400)
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'GEMINI_KEY_INVALID' }, 502)
  }

  const styleDesc = STYLE_DESCRIPTIONS[style] ?? style
  const roomMime  = detectMimeType(roomImageBase64)

  // Fetch all product images in parallel (timeout ~8s per image)
  const productImgs = await Promise.all(
    placements.map((p) => urlToBase64(p.imageUrl))
  )

  // Build multi-part Gemini request
  // Structure: [room image] → style instruction → [product1 image] → product1 placement → … → final instruction
  type GeminiPart = { inline_data: { mime_type: string; data: string } } | { text: string }
  const parts: GeminiPart[] = [
    { inline_data: { mime_type: roomMime, data: roomImageBase64 } },
    { text: `You are an expert interior designer and photo compositor. Redesign this room in ${styleDesc} style by inserting the reference furniture products below at their specified positions.` },
  ]

  for (let i = 0; i < placements.length; i++) {
    const p   = placements[i]
    const img = productImgs[i]
    if (img) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
      parts.push({
        text: `Reference furniture ${i + 1}: "${p.name}" (${p.category}).
Place this EXACT item at position: left=${p.x}% from image left, top=${p.y}% from image top, width=${p.width}% of image width, height=${p.height}% of image height.`,
      })
    } else {
      // Image fetch failed — fall back to text description
      parts.push({
        text: `Furniture ${i + 1}: "${p.name}" (${p.category}) — place a beautiful ${style} ${p.category.toLowerCase()} at left=${p.x}%, top=${p.y}%, ${p.width}% wide, ${p.height}% tall.`,
      })
    }
  }

  parts.push({
    text: `Final instructions:
• REMOVE the existing furniture in each placement zone
• INSERT each reference product image at its specified position with correct perspective, realistic scale, and room lighting
• Each product must cast shadows/reflections matching the room's existing light source
• Keep EXACTLY unchanged: walls, floor, ceiling, windows, doors, architectural features
• Maintain the original room's camera angle and perspective throughout
• Output: a single photorealistic interior design photograph, magazine quality
• Do NOT invent new furniture, do NOT alter the appearance of the reference products`,
  })

  const IMAGE_EDIT_MODELS = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.5-flash-preview-image-generation',
  ]

  const requestBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.2,
    },
  })

  let lastErr = ''
  for (const model of IMAGE_EDIT_MODELS) {
    const res = await fetch(geminiUrl(model, env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })

    if (!res.ok) {
      lastErr = await res.text()
      console.warn(`[Gemini Image/${model}] design-room failed ${res.status}:`, lastErr.slice(0, 120))
      continue
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content: { parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> }
      }>
      error?: { message: string }
    }

    if (data.error) {
      lastErr = data.error.message
      console.warn(`[Gemini Image/${model}] design-room error:`, lastErr.slice(0, 120))
      continue
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    if (!imagePart?.inlineData) {
      lastErr = 'no image part in response'
      console.warn(`[Gemini Image/${model}] design-room: no image part`)
      continue
    }

    console.log(`[Gemini Image/${model}] design-room success`)
    return json({
      imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      placements,   // echo back the positions (positions were input, not discovered)
    })
  }

  // All models failed — return original room with fallback flag
  console.warn('[design-room] all Gemini image models failed:', lastErr.slice(0, 200))
  return json({
    imageUrl: `data:${roomMime};base64,${roomImageBase64}`,
    placements,
    fallback: true,
  })
}

// ─── locate-products: find where products appear in an image ──────────────

interface LocateProductsBody {
  imageBase64: string
  products: Array<{ productId: string; variantId: string; name: string; description: string }>
}

async function handleLocateProducts(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as LocateProductsBody
  const { imageBase64, products } = body

  if (!imageBase64 || !products?.length) {
    return json({ error: 'Missing imageBase64 or products' }, 400)
  }

  if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_KEY_INVALID' }, 502)

  const productList = products
    .map((p) => `• productId="${p.productId}" variantId="${p.variantId}" — ${p.name} (${p.description})`)
    .join('\n')

  const prompt = `You are an expert interior designer analyzing a redesigned room photo.

The following furniture products were placed in this room:
${productList}

For EACH product above, locate it in the photo and return its bounding box.

Rules:
• x = left edge as % of image WIDTH (0=left, 100=right)
• y = top edge as % of image HEIGHT (0=top, 100=bottom)
• width / height = bounding box size as % of image
• viewAngle: 0=frontal, positive=turned right, negative=turned left (range ±45)
• zIndex: rugs/floor=1, sofas/chairs/beds=2, lamps/art=3
• Return the EXACT productId and variantId from the list above — do not change them

Return ONLY valid JSON:
{
  "placements": [
    { "productId": "string", "variantId": "string", "x": number, "y": number, "width": number, "height": number, "zIndex": number, "viewAngle": number }
  ]
}`

  const LOCATE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: detectMimeType(imageBase64), data: imageBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.1, maxOutputTokens: 1024 },
  })

  for (const model of LOCATE_MODELS) {
    const res = await fetch(geminiUrl(model, env.GEMINI_API_KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody,
    })

    if (!res.ok) { console.warn(`[Gemini/${model}] locate failed ${res.status}`); continue }

    const data = (await res.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>
      error?: { message: string }
    }

    if (data.error) { console.warn(`[Gemini/${model}] locate error:`, data.error.message); continue }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    try {
      const result = JSON.parse(rawText)
      console.log(`[Gemini/${model}] locate-products success`)
      return json(result)
    } catch {
      console.warn(`[Gemini/${model}] locate JSON parse failed`)
      continue
    }
  }

  return json({ error: 'locate-products failed' }, 502)
}

// ─── generate-room: legacy text-prompt image editing (kept for compat) ────

async function handleGenerateRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as GenerateRoomBody
  const { imageBase64, style, products } = body

  if (!imageBase64 || !style) {
    return json({ error: 'Missing required fields: imageBase64, style' }, 400)
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'GEMINI_KEY_INVALID' }, 502)
  }

  const styleDesc = STYLE_DESCRIPTIONS[style] ?? style
  const productLine = products?.length
    ? `Include these specific furniture pieces: ${products.join(', ')}.`
    : ''

  const editPrompt = `You are an expert interior designer and photo editor.

Edit this room photo to redesign it in ${styleDesc} style.

Instructions:
- REMOVE all existing furniture (beds, chairs, sofas, tables, lamps, rugs, shelves, decor)
- REPLACE them with beautiful ${style} style furniture. ${productLine}
- KEEP EXACTLY: the room's walls, floor, ceiling, windows, doors, and architectural features
- PRESERVE: the original camera angle, perspective, and natural lighting direction
- The result must look like a professional interior design photograph — photorealistic, high quality
- Do NOT add people, text, logos, or watermarks

Return only the edited room photo.`

  const IMAGE_EDIT_MODELS = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.5-flash-preview-image-generation',
  ]

  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: detectMimeType(imageBase64), data: imageBase64 } },
        { text: editPrompt },
      ],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.3,
    },
  })

  let lastErr = ''
  for (const model of IMAGE_EDIT_MODELS) {
    const res = await fetch(geminiUrl(model, env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })

    if (!res.ok) {
      lastErr = await res.text()
      console.warn(`[Gemini Image/${model}] failed ${res.status}:`, lastErr.slice(0, 120))
      continue
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content: { parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> }
      }>
      error?: { message: string }
    }

    if (data.error) {
      lastErr = data.error.message
      console.warn(`[Gemini Image/${model}] error:`, lastErr.slice(0, 120))
      continue
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    if (!imagePart?.inlineData) {
      lastErr = 'no image part in response'
      console.warn(`[Gemini Image/${model}] no image part`)
      continue
    }

    console.log(`[Gemini Image/${model}] generate-room success`)
    return json({
      imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    })
  }

  console.warn('[generate-room] all Gemini image models failed:', lastErr.slice(0, 200))
  return json({
    imageUrl: `data:${detectMimeType(imageBase64)};base64,${imageBase64}`,
    fallback: true,
  })
}

// ─── Main fetch handler ───────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    let res: Response

    if (url.pathname === '/api/analyze-room' && request.method === 'POST') {
      res = await handleAnalyzeRoom(request, env)
    } else if (url.pathname === '/api/design-room' && request.method === 'POST') {
      res = await handleDesignRoom(request, env)
    } else if (url.pathname === '/api/generate-room' && request.method === 'POST') {
      res = await handleGenerateRoom(request, env)
    } else if (url.pathname === '/api/locate-products' && request.method === 'POST') {
      res = await handleLocateProducts(request, env)
    } else if (url.pathname === '/api/health') {
      res = json({ status: 'ok', ts: new Date().toISOString() })
    } else {
      res = json({ error: 'Not found' }, 404)
    }

    return withCors(res, cors)
  },
}
