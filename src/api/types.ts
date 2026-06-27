export interface AnalyzeRoomParams {
  imageBase64: string
  style: string
  excludeProductIds?: string[] // products shown in previous designs (for variety)
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

// ── New: multi-image composite approach ──────────────────────────────

export interface DesignPlacement extends AIProductPlacement {
  imageUrl: string   // product image URL (thumbnail) sent as visual reference to AI
  name: string
  category: string
}

export interface DesignRoomParams {
  roomImageBase64: string
  style: string
  placements: DesignPlacement[]
}

export interface DesignRoomResult {
  imageUrl: string
  placements: DesignPlacement[] // same positions that were sent in
  fallback?: boolean             // true = AI failed, original room returned
}

// ── Kept for backwards compat (locate is no longer used) ─────────────

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

// ── Legacy GenerateRoom (kept for worker compat) ──────────────────────

export interface GenerateRoomParams {
  imageBase64: string
  style: string
  products?: string[]
}

export interface GenerateRoomResult {
  imageUrl: string
  fallback?: boolean
}
