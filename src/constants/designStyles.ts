import type { DesignStyle } from '@/types'

export const DESIGN_STYLES: Record<
  DesignStyle,
  { label: string; emoji: string; description: string; palette: string[]; roomImage: string }
> = {
  japandi: {
    label: 'Japandi',
    emoji: '🌿',
    description: 'Japanese minimalism meets Scandinavian warmth',
    palette: ['#E8E0D5', '#A89080', '#4A4035', '#C5B5A0'],
    roomImage: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80',
  },
  'mid-century': {
    label: 'Mid-Century',
    emoji: '🪑',
    description: 'Iconic 50s–60s organic shapes and bold accents',
    palette: ['#F5E6C8', '#D4622A', '#1B5E3B', '#2C3E50'],
    roomImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
  },
  scandinavian: {
    label: 'Scandinavian',
    emoji: '❄️',
    description: 'Clean lines, neutral tones, cozy textures',
    palette: ['#F7F5F2', '#DCDAD5', '#9B8F80', '#3D3530'],
    roomImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
  },
  industrial: {
    label: 'Industrial',
    emoji: '🔩',
    description: 'Raw materials, metal accents, exposed brick vibes',
    palette: ['#2B2B2B', '#5C5C5C', '#B87333', '#E8E0D5'],
    roomImage: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&q=80',
  },
  coastal: {
    label: 'Coastal',
    emoji: '🌊',
    description: 'Breezy whites, ocean blues, natural textures',
    palette: ['#F0F8FF', '#6BA3BE', '#C4A882', '#2C5F7E'],
    roomImage: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80',
  },
  bohemian: {
    label: 'Bohemian',
    emoji: '🪷',
    description: 'Layered textiles, earthy hues, global patterns',
    palette: ['#8B4513', '#D2691E', '#CD853F', '#6B4226'],
    roomImage: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80',
  },
  contemporary: {
    label: 'Contemporary',
    emoji: '✦',
    description: 'Sleek, current, luxurious minimalism',
    palette: ['#1A1A1A', '#FFFFFF', '#C0A882', '#808080'],
    roomImage: 'https://images.unsplash.com/photo-1617104678098-de229db51175?w=600&q=80',
  },
}
