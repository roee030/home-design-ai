import { create } from 'zustand'
import type { WidgetScreen, DesignStyle } from '@/types'

interface WidgetState {
  isOpen: boolean
  screen: WidgetScreen
  uploadedImageUrl: string | null
  selectedStyle: DesignStyle | null
  budget: number

  // Set after AI processing completes
  generatedImageUrl: string | null
  styleDescription: string | null

  open: () => void
  close: () => void
  goTo: (screen: WidgetScreen) => void
  setUploadedImage: (url: string) => void
  setStyle: (style: DesignStyle) => void
  setBudget: (budget: number) => void
  setGeneratedImage: (url: string) => void
  setStyleDescription: (desc: string) => void
  reset: () => void
}

const INITIAL = {
  isOpen: false,
  screen: 'upload' as WidgetScreen,
  uploadedImageUrl: null,
  selectedStyle: null,
  budget: 5000,
  generatedImageUrl: null,
  styleDescription: null,
}

export const useWidgetStore = create<WidgetState>((set) => ({
  ...INITIAL,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  goTo: (screen) => set({ screen }),
  setUploadedImage: (url) => set({ uploadedImageUrl: url }),
  setStyle: (style) => set({ selectedStyle: style }),
  setBudget: (budget) => set({ budget }),
  setGeneratedImage: (url) => set({ generatedImageUrl: url }),
  setStyleDescription: (desc) => set({ styleDescription: desc }),
  reset: () => set(INITIAL),
}))
