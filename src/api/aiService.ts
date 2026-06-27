import type {
  AnalyzeRoomParams,
  AnalyzeRoomResult,
  GenerateRoomParams,
  GenerateRoomResult,
  LocateProductsParams,
  LocateProductsResult,
} from './types'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { logger } from '@/utils/logger'

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

// Step 1: analyze original image → select catalog products + estimated positions
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

// Step 2: generate new room image with specific products placed in it
export async function generateRoom(params: GenerateRoomParams): Promise<GenerateRoomResult> {
  if (!API_BASE) {
    return { imageUrl: '', fallback: true }
  }
  try {
    const result = await post<GenerateRoomResult>('/api/generate-room', params)
    logger.info('Room generation complete', { fallback: result.fallback ?? false })
    return result
  } catch (err) {
    logger.warn('generateRoom failed', { err: String(err) })
    return { imageUrl: '', fallback: true }
  }
}

// Step 3: locate each product in the generated image → precise pin positions
export async function locateProducts(params: LocateProductsParams): Promise<LocateProductsResult> {
  if (!API_BASE) throw new Error('No API_BASE')

  const result = await post<LocateProductsResult>('/api/locate-products', params)
  logger.info('Product location complete', { placements: result.placements?.length ?? 0 })
  return result
}

function getMockAnalysis(): AnalyzeRoomResult {
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
