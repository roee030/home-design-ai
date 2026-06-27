export interface Env {
  GEMINI_API_KEY: string
  FAL_AI_KEY: string
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
}

interface GenerateRoomBody {
  imageBase64: string
  style: string
  products?: string[]  // optional list of product names to include in the redesign
}

interface GenerateTemplateBody {
  roomType: string
  style?: string
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

// ─── Gemini helpers ────────────────────────────────────────────────────────

function geminiUrl(model: string, key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
}

// ─── analyze-room: Gemini vision → product placement + view angles ─────────

async function handleAnalyzeRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as AnalyzeRoomBody
  const { imageBase64, style, catalog } = body

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

  const prompt = `You are an expert AI interior designer working for a furniture retailer.

Analyse the uploaded room photo and select the best products from the catalog for a ${styleDesc} redesign.

Catalog (JSON):
${JSON.stringify(catalogSummary, null, 2)}

Instructions:
• Select 4–5 products that best fit the "${style}" aesthetic and suit this room type
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

// ─── locate-products: find where specific products appear in an image ─────────

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

// ─── generate-room: Gemini image editing (remove old furniture, add new) ──────

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

  // Models that support image input → image output (editing)
  const IMAGE_EDIT_MODELS = [
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
      responseModalities: ['IMAGE'],
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

  // All Gemini image models failed — return original image so the flow continues
  console.warn('[Gemini Image] all models failed, returning original image:', lastErr.slice(0, 200))
  return json({
    imageUrl: `data:${detectMimeType(imageBase64)};base64,${imageBase64}`,
    fallback: true,
  })
}

// ─── generate-template: fal.ai text-to-image ─────────────────────────────

const ROOM_TYPE_PROMPTS: Record<string, string> = {
  'living-room':
    'modern living room interior, stylish sofa, coffee table, floor lamp, hardwood floor, large window, professional interior photography, natural golden light, 8k',
  'bedroom':
    'modern bedroom interior, king size bed with linen bedding, bedside tables, soft warm lighting, wooden floor, professional interior photography, 8k',
  'dining-room':
    'elegant dining room interior, round dining table, 4 chairs, statement pendant lighting, natural wood accents, professional interior photography, 8k',
  'kitchen':
    'modern kitchen interior, white shaker cabinets, marble countertop, kitchen island with bar stools, pendant lights, professional interior photography, 8k',
  'home-office':
    'home office interior, large wooden desk, ergonomic chair, bookshelves, plants, floor-to-ceiling windows, natural light, professional photography, 8k',
  'kids-room':
    'children bedroom interior, single bed with colourful duvet, study desk, wooden toy shelf, pastel walls, professional interior photography, 8k',
}

async function handleGenerateTemplate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as GenerateTemplateBody
  const { roomType, style } = body

  if (!roomType) {
    return json({ error: 'Missing required field: roomType' }, 400)
  }

  const base   = ROOM_TYPE_PROMPTS[roomType] ?? `${roomType} interior, professional photography, 8k`
  const prompt = style ? `${base}, ${STYLE_DESCRIPTIONS[style] ?? style} aesthetic` : base
  const negative = 'people, text, watermark, blurry, low quality, cartoon, distorted'

  const falRes = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      Authorization: `Key ${env.FAL_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negative,
      image_size: 'landscape_4_3',
      num_inference_steps: 24,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
    }),
  })

  if (!falRes.ok) {
    const err = await falRes.text()
    return json({ error: 'Template generation failed', detail: err }, 502)
  }

  const falData = (await falRes.json()) as { images?: Array<{ url: string }>; error?: string }
  if (falData.error) return json({ error: falData.error }, 502)
  const imageUrl = falData.images?.[0]?.url
  if (!imageUrl) return json({ error: 'No image returned' }, 502)

  return json({ imageUrl })
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
    } else if (url.pathname === '/api/generate-room' && request.method === 'POST') {
      res = await handleGenerateRoom(request, env)
    } else if (url.pathname === '/api/generate-template' && request.method === 'POST') {
      res = await handleGenerateTemplate(request, env)
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
