export interface AnalyzeRoomParams {
  imageBase64: string
  style: string
}

export interface AIProductPlacement {
  productId: string
  variantId: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  viewAngle?: number
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
  products?: string[]  // product names to include in the redesign
}

export interface GenerateRoomResult {
  imageUrl: string
  fallback?: boolean  // true = Gemini image gen failed, imageUrl is the original photo
}

export interface LocateProductInput {
  productId: string
  variantId: string
  name: string
  description: string
}

export interface LocateProductsParams {
  imageBase64: string
  products: LocateProductInput[]
}

export interface LocateProductsResult {
  placements: AIProductPlacement[]
}
