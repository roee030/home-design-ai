import { motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './BudgetInput.module.css'

interface Props { tenant: TenantConfig }

const PRESETS = [2000, 5000, 10000, 20000]

export function BudgetInput({ tenant }: Props) {
  const { budget, setBudget, goTo } = useWidgetStore()

  const handleNext = () => {
    analytics.budgetSet(tenant.id, budget)
    goTo('processing')
  }

  return (
    <div className={styles.container}>
      <motion.h2 className={styles.title} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        Set Your Budget
      </motion.h2>
      <motion.p className={styles.subtitle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        The AI will select only products within your budget
      </motion.p>

      <motion.div className={styles.amountDisplay} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}>
        <span className={styles.currency}>₪</span>
        <span className={styles.amount}>{budget.toLocaleString()}</span>
      </motion.div>

      <input
        type="range"
        min={500}
        max={50000}
        step={500}
        value={budget}
        onChange={(e) => setBudget(Number(e.target.value))}
        className={styles.slider}
      />

      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p}
            className={`${styles.preset} ${budget === p ? styles.presetActive : ''}`}
            onClick={() => setBudget(p)}
          >
            ₪{p.toLocaleString()}
          </button>
        ))}
      </div>

      <div className={styles.spacer} />

      <motion.button
        className={styles.nextBtn}
        onClick={handleNext}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ✦ Generate My Design
      </motion.button>
    </div>
  )
}
