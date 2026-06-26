import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import { DESIGN_STYLES } from '@/constants/designStyles'
import styles from './Processing.module.css'

const STEPS = [
  'Analyzing your room dimensions…',
  'Matching your chosen style…',
  'Searching product catalog…',
  'Applying budget constraints…',
  'Generating your design…',
  'Placing furniture precisely…',
]

interface Props { tenant: TenantConfig }

export function Processing({ tenant }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const { selectedStyle, goTo } = useWidgetStore()

  const styleInfo = selectedStyle ? DESIGN_STYLES[selectedStyle] : null

  useEffect(() => {
    if (stepIndex < STEPS.length - 1) {
      const t = setTimeout(() => setStepIndex((i) => i + 1), 800)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => {
        analytics.designGenerated(tenant.id, selectedStyle ?? 'unknown')
        goTo('canvas')
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [stepIndex, goTo, tenant.id, selectedStyle])

  const progress = ((stepIndex + 1) / STEPS.length) * 100

  return (
    <div className={styles.container}>
      {styleInfo && (
        <motion.div className={styles.styleBadge} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>{styleInfo.emoji}</span>
          <span>{styleInfo.label}</span>
        </motion.div>
      )}

      <div className={styles.orb}>
        <motion.div
          className={styles.orbInner}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
        <span className={styles.orbIcon}>✦</span>
      </div>

      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stepIndex}
          className={styles.step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
        >
          {STEPS[stepIndex]}
        </motion.p>
      </AnimatePresence>

      <p className={styles.hint}>Powered by ShopTheRoom AI</p>
    </div>
  )
}
