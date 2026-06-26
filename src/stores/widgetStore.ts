import { create } from 'zustand'
import type { WidgetScreen, DesignStyle } from '@/types'

interface WidgetState {
  isOpen: boolean
  screen: WidgetScreen
  uploadedImageUrl: string | null
  selectedStyle: DesignStyle | null
  budget: number
  open: () => void
  close: () => void
  goTo: (screen: WidgetScreen) => void
  setUploadedImage: (url: string) => void
  setStyle: (style: DesignStyle) => void
  setBudget: (budget: number) => void
  reset: () => void
}

const INITIAL: Pick<WidgetState, 'isOpen' | 'screen' | 'uploadedImageUrl' | 'selectedStyle' | 'budget'> = {
  isOpen: false,
  screen: 'upload',
  uploadedImageUrl: null,
  selectedStyle: null,
  budget: 5000,
}

export const useWidgetStore = create<WidgetState>((set) => ({
  ...INITIAL,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  goTo: (screen) => set({ screen }),
  setUploadedImage: (url) => set({ uploadedImageUrl: url }),
  setStyle: (style) => set({ selectedStyle: style }),
  setBudget: (budget) => set({ budget }),
  reset: () => set(INITIAL),
}))
