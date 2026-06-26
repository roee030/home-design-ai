import { MOCK_TENANT } from '@/constants/mockTenant'
import { useTenant } from '@/hooks/useTenant'
import { DemoPage } from '@/demo/DemoPage'

export function App() {
  useTenant(MOCK_TENANT)
  return <DemoPage />
}
