import { useEffect } from 'react'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { useTenant } from '@/hooks/useTenant'
import { useWidgetStore } from '@/stores/widgetStore'
import { Widget } from '@/widget/Widget'

export function App() {
  useTenant(MOCK_TENANT)
  const open = useWidgetStore((s) => s.open)

  // Auto-open: the widget IS the app
  useEffect(() => { open() }, [open])

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <Widget tenant={MOCK_TENANT} fullPage />
    </div>
  )
}
