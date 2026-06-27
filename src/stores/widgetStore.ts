import { create } from 'zustand'
import type { WidgetScreen, DesignStyle } from '@/types'

interface WidgetState {
  isOpen: boolean
  screen: WidgetScreen
  uploadedImageUrl: string | null
  roomImageBase64: string | null   // base64 of uploaded room (used for re-generation on swap)
  selectedStyle: DesignStyle | null
  budget: number

  // Set after AI processing completes
  generatedImageUrl: string | null
  styleDescription: string | null
  hasAIAnalysis: boolean

  // Track which products were shown (for variety — avoid repeating same picks)
  shownProductIds: string[]

  open: () => void
  close: () => void
  goTo: (screen: WidgetScreen) => void
  setUploadedImage: (url: string) => void
  setRoomImageBase64: (b64: string) => void
  setStyle: (style: DesignStyle) => void
  setBudget: (budget: number) => void
  setGeneratedImage: (url: string) => void
  setStyleDescription: (desc: string) => void
  setHasAIAnalysis: (v: boolean) => void
  addShownProducts: (ids: string[]) => void
  reset: () => void
}

const INITIAL = {
  isOpen: false,
  screen: 'upload' as WidgetScreen,
  uploadedImageUrl: null,
  roomImageBase64: null,
  selectedStyle: null,
  budget: 5000,
  generatedImageUrl: null,
  styleDescription: null,
  hasAIAnalysis: false,
  shownProductIds: [] as string[],
}

export const useWidgetStore = create<WidgetState>((set) => ({
  ...INITIAL,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  goTo: (screen) => set({ screen }),
  setUploadedImage: (url) => set({ uploadedImageUrl: url }),
  setRoomImageBase64: (b64) => set({ roomImageBase64: b64 }),
  setStyle: (style) => set({ selectedStyle: style }),
  setBudget: (budget) => set({ budget }),
  setGeneratedImage: (url) => set({ generatedImageUrl: url }),
  setStyleDescription: (desc) => set({ styleDescription: desc }),
  setHasAIAnalysis: (v) => set({ hasAIAnalysis: v }),
  addShownProducts: (ids) =>
    set((s) => ({ shownProductIds: [...new Set([...s.shownProductIds, ...ids])] })),
  reset: () => set(INITIAL),
}))
