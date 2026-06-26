import type { CanvasItem } from '@/types'

export const ROOM_IMAGE_URL =
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1400&q=85'

export const INITIAL_CANVAS_ITEMS: CanvasItem[] = [
  {
    id: 'ci-sofa',
    productId: 'sofa-oslo',
    variantId: 'sofa-oslo-cream',
    x: 18,
    y: 52,
    width: 42,
    height: 28,
    zIndex: 2,
    rotation: 0,
  },
  {
    id: 'ci-table',
    productId: 'table-cedar',
    variantId: 'table-cedar-oak',
    x: 26,
    y: 68,
    width: 22,
    height: 14,
    zIndex: 3,
    rotation: 0,
  },
  {
    id: 'ci-lamp',
    productId: 'lamp-arc',
    variantId: 'lamp-arc-brass',
    x: 70,
    y: 28,
    width: 10,
    height: 34,
    zIndex: 4,
    rotation: 0,
  },
  {
    id: 'ci-chair',
    productId: 'chair-lounge',
    variantId: 'chair-lounge-ivory',
    x: 68,
    y: 55,
    width: 18,
    height: 22,
    zIndex: 2,
    rotation: 0,
  },
  {
    id: 'ci-rug',
    productId: 'rug-wool',
    variantId: 'rug-wool-sand',
    x: 15,
    y: 72,
    width: 55,
    height: 22,
    zIndex: 1,
    rotation: 0,
  },
]
