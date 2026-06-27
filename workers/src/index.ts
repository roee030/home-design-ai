// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ai = any

export interface Env {
  GEMINI_API_KEY: string
  FAL_AI_KEY: string
  ALLOWED_ORIGIN?: string
  AI: Ai
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
  budget: number
  catalog: CatalogProduct[]
}

interface GenerateRoomBody {
  imageBase64: string
  style: string
  products?: string[]
}

interface GenerateTemplateBody {
  roomType: string
  style?: string
}

// ─── Style maps ───────────────────────────────────────────────────────────

const STYLE_DESCRIPTIONS: Record<string, string> = {
  japandi: 'Japandi (Japanese-Scandinavian fusion) — natural wood, neutral tones, zen simplicity, organic shapes',
  'mid-century': 'Mid-Century Modern — warm walnut wood, geometric forms, retro accent colours, tapered legs',
  scandinavian: 'Scandinavian — light birch wood, white tones, hygge cosiness, functional minimalism',
  industrial: 'Industrial Loft — exposed materials, dark metal frames, Edison bulbs, raw textures',
  coastal: 'Coastal Beach House — whitewashed wood, navy-white palette, rattan, breezy natural light',
  bohemian: 'Bohemian Eclectic — layered textiles, macramé, earthy tones, mixed patterns and plants',
  contemporary: 'Contemporary Modern — clean lines, neutral palette, statement lighting, minimalist luxury',
}

const STYLE_PROMPTS: Record<string, string> = {
  japandi:
    'same room layout and furniture arrangement, japandi interior design style, natural wood furniture, neutral beige linen, washi paper light, zen minimalism, professional interior photography, 8k uhd, soft morning light',
  'mid-century':
    'same room layout and furniture arrangement, mid century modern style, warm walnut wood, mustard yellow accent chair, geometric shapes, retro floor lamp, professional photography, warm golden light, 8k',
  scandinavian:
    'same room layout and furniture arrangement, scandinavian interior design, light birch furniture, white walls, grey wool throw, hygge candles, cosy minimalism, professional interior photography, 8k',
  industrial:
    'same room layout and furniture arrangement, industrial loft interior, exposed concrete wall, black steel frame shelves, Edison pendant bulbs, reclaimed wood table, moody atmospheric lighting, 8k',
  coastal:
    'same room layout and furniture arrangement, coastal beach house style, whitewashed driftwood furniture, navy and white stripe cushions, rattan pendant light, breezy sheer curtains, golden afternoon light, 8k',
  bohemian:
    'same room layout and furniture arrangement, bohemian eclectic style, layered kilim rugs, macrame wall hanging, rattan chair, terracotta pots with plants, warm earthy tones, golden hour light, 8k',
  contemporary:
    'same room layout and furniture arrangement, contemporary modern interior, sleek marble coffee table, grey linen sofa, geometric brass floor lamp, minimalist art print, soft diffused studio light, 8k',
}

const NEGATIVE_PROMPT =
  'blurry, low quality, distorted, people, text, watermark, ugly, oversaturated, cartoon, painting'

// ─── Utilities ────────────────────────────────────────────────────────────

function detectMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

function base64ToBytes(base64: string): number[] {
  const binary = atob(base64)
  const bytes = new Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// ─── Gemini: room analysis + product matching ─────────────────────────────

async function handleAnalyzeRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as AnalyzeRoomBody
  const { imageBase64, style, budget, catalog } = body

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

Budget: ₪${budget}
Catalog (JSON):
${JSON.stringify(catalogSummary, null, 2)}

Instructions:
• Select 4–5 products that best fit the "${style}" aesthetic
• Total price must not exceed ₪${budget}
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
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`
    const geminiRes = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody })

    if (!geminiRes.ok) {
      lastErr = await geminiRes.text()
      console.warn(`[Gemini/${model}] failed ${geminiRes.status}:`, lastErr.slice(0, 120))
      continue
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>
      error?: { message: string }
    }

    if (geminiData.error) {
      lastErr = geminiData.error.message
      console.warn(`[Gemini/${model}] API error:`, lastErr.slice(0, 120))
      continue
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    try {
      const result = JSON.parse(rawText)
      console.log(`[Gemini/${model}] success`)
      return json(result)
    } catch {
      lastErr = `JSON parse failed: ${rawText.slice(0, 80)}`
      console.warn(`[Gemini/${model}] JSON parse failed`)
      continue
    }
  }

  console.error('[Gemini] all models failed, last error:', lastErr.slice(0, 200))
  return json({ error: 'AI analysis failed', detail: lastErr }, 502)
}

// ─── Cloudflare Workers AI: img2img (FREE, no API key needed) ────────────

async function generateRoomWithWorkersAI(imageBase64: string, style: string, env: Env): Promise<string> {
  if (!env.AI) throw new Error('Workers AI binding not available')

  const stylePrompt = STYLE_PROMPTS[style] ?? `${style} interior design, professional photography, realistic lighting, 8k`

  const imageBytes = base64ToBytes(imageBase64)

  const result = await env.AI.run('@cf/runwayml/stable-diffusion-v1-5-img2img', {
    prompt: stylePrompt,
    negative_prompt: NEGATIVE_PROMPT,
    image: imageBytes,
    strength: 0.55,      // 0 = no change, 1 = full generation — 0.55 keeps room structure
    num_steps: 20,
    guidance: 7.5,
  })

  // Workers AI returns ReadableStream or Uint8Array
  let imageData: Uint8Array
  if (result instanceof ReadableStream) {
    imageData = new Uint8Array(await new Response(result).arrayBuffer())
  } else if (result instanceof Uint8Array) {
    imageData = result
  } else {
    throw new Error(`Workers AI unexpected response type: ${typeof result}`)
  }

  if (!imageData.length) throw new Error('Workers AI returned empty image')

  const base64Out = bytesToBase64(imageData)
  return `data:image/png;base64,${base64Out}`
}

// ─── Gemini image generation (secondary attempt) ──────────────────────────

async function generateRoomWithGemini(imageBase64: string, style: string, env: Env): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new Error('No Gemini key')

  const styleDesc = STYLE_DESCRIPTIONS[style] ?? style
  const prompt = `You are an expert interior designer. Redesign this room in ${styleDesc} style.

Rules:
- Keep the EXACT same room layout, camera angle, perspective and room dimensions
- Keep windows, doors and architectural elements in the same positions
- Replace all furniture, materials and decor with beautiful ${style} style items
- Preserve natural lighting direction and intensity
- Output a professional interior design photograph quality image
- Do NOT add people, text, logos or watermarks`

  const IMAGE_GEN_MODELS = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-image',
    'gemini-2.0-flash-preview-image-generation',
  ]

  const imgBody = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: detectMimeType(imageBase64), data: imageBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE'], temperature: 0.35 },
  })

  for (const model of IMAGE_GEN_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: imgBody })

    if (!res.ok) { console.warn(`[Gemini Image/${model}] failed ${res.status}`); continue }

    const data = (await res.json()) as {
      candidates?: Array<{
        content: { parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> }
      }>
      error?: { message: string }
    }

    if (data.error) { console.warn(`[Gemini Image/${model}] error:`, data.error.message); continue }

    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    if (!imagePart?.inlineData) { console.warn(`[Gemini Image/${model}] no image part`); continue }

    console.log(`[Gemini Image/${model}] success`)
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
  }

  throw new Error('Gemini image generation: all models failed')
}

// ─── fal.ai (tertiary attempt) ────────────────────────────────────────────

async function generateRoomWithFal(imageBase64: string, style: string, env: Env): Promise<string> {
  const prompt = STYLE_PROMPTS[style] ?? `${style} interior design, professional photography, high quality, realistic lighting`

  const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
    method: 'POST',
    headers: {
      Authorization: `Key ${env.FAL_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: `data:image/jpeg;base64,${imageBase64}`,
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      strength: 0.18,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
      output_format: 'jpeg',
    }),
  })

  if (!falRes.ok) {
    const err = await falRes.text()
    throw new Error(`fal.ai ${falRes.status}: ${err}`)
  }

  const falData = (await falRes.json()) as { images?: Array<{ url: string }>; error?: string }
  if (falData.error) throw new Error(falData.error)
  const imageUrl = falData.images?.[0]?.url
  if (!imageUrl) throw new Error('fal.ai returned no image')
  return imageUrl
}

// ─── generate-room handler ────────────────────────────────────────────────

async function handleGenerateRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as GenerateRoomBody
  const { imageBase64, style } = body

  if (!imageBase64 || !style) {
    return json({ error: 'Missing required fields: imageBase64, style' }, 400)
  }

  // 1st: Cloudflare Workers AI img2img (free, built-in, no extra key)
  try {
    const imageUrl = await generateRoomWithWorkersAI(imageBase64, style, env)
    console.log('[Workers AI] img2img success')
    return json({ imageUrl })
  } catch (err) {
    console.warn('[Workers AI] failed, trying Gemini:', String(err).slice(0, 120))
  }

  // 2nd: Gemini image generation
  try {
    const imageUrl = await generateRoomWithGemini(imageBase64, style, env)
    console.log('[Gemini Image] success')
    return json({ imageUrl })
  } catch (err) {
    console.warn('[Gemini Image] failed, trying fal.ai:', String(err).slice(0, 80))
  }

  // 3rd: fal.ai
  try {
    const imageUrl = await generateRoomWithFal(imageBase64, style, env)
    console.log('[fal.ai] success')
    return json({ imageUrl })
  } catch (falErr) {
    const errMsg = String(falErr)
    console.error('[fal.ai] error:', errMsg)
    return json({ error: 'Image generation failed', detail: errMsg }, 502)
  }
}

// ─── fal.ai: text-to-image room template generation ──────────────────────

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

  const falRes = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      Authorization: `Key ${env.FAL_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'people, text, watermark, blurry, low quality, cartoon, distorted',
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
  if (!imageUrl) return json({ error: 'fal.ai returned no image' }, 502)

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
    } else if (url.pathname === '/api/health') {
      res = json({ status: 'ok', ts: new Date().toISOString() })
    } else {
      res = json({ error: 'Not found' }, 404)
    }

    return withCors(res, cors)
  },
}
