import type {
  AnalyzeRoomParams,
  AnalyzeRoomResult,
  GenerateRoomParams,
  GenerateRoomResult,
} from './types'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { ROOM_IMAGE_URL } from '@/constants/mockCanvas'
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
    logger.info('No VITE_API_URL — using stock room image')
    return { imageUrl: ROOM_IMAGE_URL }
  }

  try {
    const result = await post<GenerateRoomResult>('/api/generate-room', params)
    logger.info('Room generation complete', { url: result.imageUrl.slice(0, 60) })
    return result
  } catch (err) {
    logger.warn('generateRoom failed — using stock room image', { err: String(err) })
    return { imageUrl: ROOM_IMAGE_URL }
  }
}

function getMockAnalysis(): AnalyzeRoomResult {
  // No pins when AI is unavailable — wrong positions are worse than none
  return {
    selectedProducts: [],
    totalPrice: 0,
    styleDescription: '',
    isAIGenerated: false,
  }
}
