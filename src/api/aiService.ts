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
      { productId: 'bed-linen-platform',  variantId: 'bed-linen-natural',      x: 20, y: 38, width: 50, height: 40, zIndex: 1, viewAngle:   0 },
      { productId: 'nightstand-pebble',   variantId: 'nightstand-oak',         x:  8, y: 58, width: 17, height: 28, zIndex: 2, viewAngle:  30 },
      { productId: 'nightstand-pebble',   variantId: 'nightstand-walnut',      x: 74, y: 58, width: 17, height: 28, zIndex: 2, viewAngle: -30 },
      { productId: 'lamp-globe-pendant',  variantId: 'globe-smoke-brass',      x: 22, y:  2, width: 10, height: 36, zIndex: 3, viewAngle:  10 },
      { productId: 'lamp-globe-pendant',  variantId: 'globe-clear-chrome',     x: 67, y:  2, width: 10, height: 36, zIndex: 3, viewAngle: -10 },
      { productId: 'rug-beni',            variantId: 'rug-beni-natural',       x: 10, y: 72, width: 50, height: 23, zIndex: 1, viewAngle:   0 },
      { productId: 'mirror-arch',         variantId: 'mirror-arch-black',      x: 83, y: 14, width: 12, height: 40, zIndex: 2, viewAngle: -45 },
    ],
    totalPrice: 4890 + 890 + 890 + 590 + 590 + 1890 + 1090,
    styleDescription: 'Japandi bedroom with a linen platform bed, pebble nightstands, globe pendants, and a hand-loomed Beni rug.',
    isAIGenerated: false,
  }
}
