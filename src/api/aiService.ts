import type {
  AnalyzeRoomParams,
  AnalyzeRoomResult,
  GenerateRoomParams,
  GenerateRoomResult,
} from './types'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { logger } from '@/utils/logger'

// Set VITE_API_URL to your deployed Cloudflare Worker URL.
// In local dev, run `npm run dev` inside /workers — it starts on :8787 and Vite proxies /api to it.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = API_BASE ? `${API_BASE}${path}` : path
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function analyzeRoom(params: AnalyzeRoomParams): Promise<AnalyzeRoomResult> {
  if (!API_BASE) {
    logger.info('No VITE_API_URL — using mock analysis')
    return getMockAnalysis()
  }

  try {
    const result = await post<AnalyzeRoomResult>('/api/analyze-room', {
      ...params,
      catalog: MOCK_TENANT.catalog,
    })
    logger.info('Room analysis complete', { products: result.selectedProducts.length })
    return { ...result, isAIGenerated: true }
  } catch (err) {
    logger.warn('analyzeRoom failed — falling back to mock', { err: String(err) })
    return getMockAnalysis()
  }
}

export async function generateRoom(params: GenerateRoomParams): Promise<GenerateRoomResult> {
  if (!API_BASE && !import.meta.env.DEV) {
    throw new Error('No VITE_API_URL configured')
  }
  // Throws on failure — caller decides the fallback (original uploaded image, not stock)
  const result = await post<GenerateRoomResult>('/api/generate-room', params)
  logger.info('Room generation complete', { url: result.imageUrl.slice(0, 60) })
  return result
}

function getMockAnalysis(): AnalyzeRoomResult {
  // Demo placements matching a standard bedroom — visible even when Gemini quota is exhausted
  return {
    selectedProducts: [
      { productId: 'bed-frame-oak',       variantId: 'bed-oak-natural',     x: 20, y: 38, width: 50, height: 40, zIndex: 1, viewAngle:   0 },
      { productId: 'nightstand-linen',    variantId: 'nightstand-beige',    x:  8, y: 58, width: 17, height: 28, zIndex: 2, viewAngle:  30 },
      { productId: 'nightstand-linen',    variantId: 'nightstand-charcoal', x: 74, y: 58, width: 17, height: 28, zIndex: 2, viewAngle: -30 },
      { productId: 'lamp-rattan-pendant', variantId: 'lamp-rattan-natural', x: 22, y:  2, width: 10, height: 36, zIndex: 3, viewAngle:  10 },
      { productId: 'lamp-rattan-pendant', variantId: 'lamp-rattan-black',   x: 67, y:  2, width: 10, height: 36, zIndex: 3, viewAngle: -10 },
      { productId: 'rug-wool',            variantId: 'rug-wool-sand',       x: 10, y: 72, width: 50, height: 23, zIndex: 1, viewAngle:   0 },
      { productId: 'mirror-round',        variantId: 'mirror-gold-frame',   x: 83, y: 14, width: 12, height: 40, zIndex: 2, viewAngle: -45 },
    ],
    totalPrice: 3200 + 520 + 520 + 320 + 320 + 680 + 480,
    styleDescription: 'Japandi bedroom with natural oak bed, linen nightstands, and rattan pendant lights.',
    isAIGenerated: false,
  }
}
