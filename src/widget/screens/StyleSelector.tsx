import { motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import { DESIGN_STYLES } from '@/constants/designStyles'
import type { DesignStyle, TenantConfig } from '@/types'
import styles from './StyleSelector.module.css'

interface Props { tenant: TenantConfig }

export function StyleSelector({ tenant }: Props) {
  const { selectedStyle, setStyle, goTo } = useWidgetStore()

  const handleSelect = (style: DesignStyle) => {
    setStyle(style)
    analytics.styleSelected(tenant.id, style)
  }

  const handleNext = () => {
    if (selectedStyle) goTo('budget')
  }

  return (
    <div className={styles.container}>
      <motion.h2 className={styles.title} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        Pick Your Style
      </motion.h2>
      <motion.p className={styles.subtitle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        Choose a design direction for your redesigned room
      </motion.p>

      <div className={styles.grid}>
        {(Object.entries(DESIGN_STYLES) as [DesignStyle, typeof DESIGN_STYLES[DesignStyle]][]).map(
          ([key, info], i) => (
            <motion.button
              key={key}
              className={`${styles.styleCard} ${selectedStyle === key ? styles.selected : ''}`}
              onClick={() => handleSelect(key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className={styles.palette}>
                {info.palette.map((c) => (
                  <span key={c} className={styles.dot} style={{ background: c }} />
                ))}
              </div>
              <span className={styles.emoji}>{info.emoji}</span>
              <span className={styles.label}>{info.label}</span>
              <span className={styles.desc}>{info.description}</span>
            </motion.button>
          )
        )}
      </div>

      <motion.button
        className={styles.nextBtn}
        onClick={handleNext}
        disabled={!selectedStyle}
        whileHover={selectedStyle ? { scale: 1.02 } : {}}
        whileTap={selectedStyle ? { scale: 0.98 } : {}}
      >
        Continue →
      </motion.button>
    </div>
  )
}
