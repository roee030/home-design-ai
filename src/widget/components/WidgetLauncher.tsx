import { motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './WidgetLauncher.module.css'

interface Props {
  tenant: TenantConfig
}

export function WidgetLauncher({ tenant }: Props) {
  const open = useWidgetStore((s) => s.open)

  const handleClick = () => {
    analytics.widgetOpened(tenant.id)
    open()
  }

  return (
    <motion.button
      className={styles.launcher}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      aria-label="Design my room with AI"
    >
      <span className={styles.icon}>✦</span>
      <span className={styles.label}>Design My Room</span>
    </motion.button>
  )
}
