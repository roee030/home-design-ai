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

export interface Product {
  id: string
  name: string
  category: string
  basePrice: number
  imageUrl: string
  thumbnailUrl: string
  variants: ProductVariant[]
  styles: DesignStyle[]
  inStock: boolean
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
