import { useEffect } from 'react'
import type { TenantConfig } from '@/types'

export function useTenant(config: TenantConfig) {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--tenant-primary', config.primaryColor)
    root.style.setProperty('--tenant-accent', config.accentColor)
    root.style.setProperty('--tenant-text', config.textColor)
    root.style.setProperty('--tenant-surface', config.surfaceColor)
    root.style.setProperty('--tenant-radius-button', config.buttonRadius)
    root.style.setProperty('--tenant-font', config.fontFamily)
  }, [config])
}
