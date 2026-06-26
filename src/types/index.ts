export type DesignStyle =
  | 'japandi'
  | 'mid-century'
  | 'scandinavian'
  | 'industrial'
  | 'coastal'
  | 'bohemian'
  | 'contemporary'

export interface ProductVariant {
  id: string
  name: string
  color: string
  imageUrl: string
  priceDelta: number
}

export type ProductCategory =
  | 'Seating'
  | 'Tables'
  | 'Lighting'
  | 'Storage'
  | 'Bedroom'
  | 'Rugs'
  | 'Decor'

export type RoomType =
  | 'living-room'
  | 'bedroom'
  | 'dining-room'
  | 'home-office'
  | 'kitchen'
  | 'kids-room'

export type ColorFamily = 'neutral' | 'warm' | 'cool' | 'dark' | 'colorful'

export interface Product {
  id: string
  name: string
  category: ProductCategory | string
  basePrice: number
  imageUrl: string
  thumbnailUrl: string
  overlayUrl?: string    // transparent PNG for canvas overlay (relative to Vite base)
  variants: ProductVariant[]
  styles: DesignStyle[]
  inStock: boolean
  // Rich metadata for smart filtering & AI matching
  brand?: string
  material?: string[]
  colorFamily?: ColorFamily
  roomTypes?: RoomType[]
  tags?: Array<'bestseller' | 'new' | 'eco' | 'flat-pack' | 'solid-wood' | 'limited'>
  dimensions?: { w: number; d: number; h: number }  // cm
}

export interface CanvasItem {
  id: string
  productId: string
  variantId: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  rotation: number
}

export interface TenantConfig {
  id: string
  name: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  textColor: string
  surfaceColor: string
  buttonRadius: string
  fontFamily: string
  checkoutEndpoint: string
  catalog: Product[]
}

export type WidgetScreen =
  | 'launcher'
  | 'upload'
  | 'style'
  | 'budget'
  | 'processing'
  | 'canvas'

export interface AnalyticsEvent {
  name: string
  tenantId: string
  sessionId: string
  timestamp: number
  properties: Record<string, unknown>
}
