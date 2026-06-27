import { create } from 'zustand'
import type { CanvasItem } from '@/types'
import type { DesignPlacement } from '@/api/types'
import { INITIAL_CANVAS_ITEMS } from '@/constants/mockCanvas'

interface CanvasState {
  items: CanvasItem[]
  activeItemId: string | null
  hoveredItemId: string | null
  roomAIGenerated: boolean
  isRegenerating: boolean           // true while swap re-design is in progress
  designPlacements: DesignPlacement[] // full placement data (incl. imageUrls) for re-generation

  setItems: (items: CanvasItem[]) => void
  setRoomAIGenerated: (v: boolean) => void
  setIsRegenerating: (v: boolean) => void
  setDesignPlacements: (placements: DesignPlacement[]) => void
  updateItem: (id: string, patch: Partial<CanvasItem>) => void
  swapVariant: (itemId: string, variantId: string) => void
  swapProduct: (itemId: string, productId: string, variantId: string) => void
  setActive: (id: string | null) => void
  setHovered: (id: string | null) => void
  reset: () => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  items: INITIAL_CANVAS_ITEMS,
  activeItemId: null,
  hoveredItemId: null,
  roomAIGenerated: false,
  isRegenerating: false,
  designPlacements: [],

  setItems: (items) => set({ items }),
  setRoomAIGenerated: (v) => set({ roomAIGenerated: v }),
  setIsRegenerating: (v) => set({ isRegenerating: v }),
  setDesignPlacements: (placements) => set({ designPlacements: placements }),

  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  swapVariant: (itemId, variantId) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, variantId } : item
      ),
    })),

  swapProduct: (itemId, productId, variantId) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, productId, variantId } : item
      ),
    })),

  setActive: (id) => set({ activeItemId: id }),
  setHovered: (id) => set({ hoveredItemId: id }),

  reset: () => set({
    items: INITIAL_CANVAS_ITEMS,
    activeItemId: null,
    hoveredItemId: null,
    roomAIGenerated: false,
    isRegenerating: false,
    designPlacements: [],
  }),
}))
