import type { CanvasItem } from '@/types'

// Japandi living room — pins calibrated to furniture positions in this image
export const ROOM_IMAGE_URL =
  'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1400&q=85'

export const INITIAL_CANVAS_ITEMS: CanvasItem[] = [
  { id: 'ci-sofa',   productId: 'sofa-oslo',   variantId: 'sofa-oslo-cream',    x: 38, y: 63, zIndex: 2, width: 38, height: 24, rotation: 0 },
  { id: 'ci-table',  productId: 'table-cedar', variantId: 'table-cedar-oak',    x: 42, y: 74, zIndex: 3, width: 20, height: 12, rotation: 0 },
  { id: 'ci-lamp',   productId: 'lamp-arc',    variantId: 'lamp-arc-brass',     x: 75, y: 38, zIndex: 4, width: 10, height: 32, rotation: 0 },
  { id: 'ci-chair',  productId: 'chair-lounge',variantId: 'chair-lounge-ivory', x: 70, y: 60, zIndex: 2, width: 18, height: 22, rotation: 0 },
  { id: 'ci-rug',    productId: 'rug-wool',    variantId: 'rug-wool-sand',      x: 40, y: 79, zIndex: 1, width: 52, height: 18, rotation: 0 },
]
