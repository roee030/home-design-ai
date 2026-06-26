export interface AnalyzeRoomParams {
  imageBase64: string
  style: string
  budget: number
}

export interface AIProductPlacement {
  productId: string
  variantId: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export interface AnalyzeRoomResult {
  selectedProducts: AIProductPlacement[]
  totalPrice: number
  styleDescription: string
  isAIGenerated: boolean
}

export interface GenerateRoomParams {
  imageBase64: string
  style: string
}

export interface GenerateRoomResult {
  imageUrl: string
}
