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
  viewAngle?: number  // horizontal rotation in degrees (0=frontal, ±45=side view)
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
