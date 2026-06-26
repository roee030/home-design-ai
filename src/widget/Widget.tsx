import { AnimatePresence, motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import { RoomUpload } from './screens/RoomUpload'
import { StyleSelector } from './screens/StyleSelector'
import { BudgetInput } from './screens/BudgetInput'
import { Processing } from './screens/Processing'
import { CanvasEditor } from './screens/CanvasEditor'
import type { TenantConfig } from '@/types'
import styles from './Widget.module.css'

interface Props { tenant: TenantConfig }

const SCREEN_TITLES: Record<string, string> = {
  upload: 'Room Upload',
  style: 'Style',
  budget: 'Budget',
  processing: '',
  canvas: 'Your Design',
}

export function Widget({ tenant }: Props) {
  const { isOpen, screen, close, goTo } = useWidgetStore()

  const handleClose = () => {
    analytics.widgetClosed(tenant.id, screen)
    close()
  }

  const handleBack = () => {
    const prev: Record<string, string> = { style: 'upload', budget: 'style', canvas: 'upload' }
    if (prev[screen]) goTo(prev[screen] as typeof screen)
  }

  const canGoBack = ['style', 'budget', 'canvas'].includes(screen)
  const isFullScreen = screen === 'canvas' || screen === 'processing'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className={`${styles.panel} ${isFullScreen ? styles.fullscreen : ''}`}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          >
            {screen !== 'processing' && (
              <div className={styles.header}>
                <button
                  className={styles.backBtn}
                  onClick={handleBack}
                  style={{ visibility: canGoBack ? 'visible' : 'hidden' }}
                  aria-label="Go back"
                >
                  ←
                </button>
                <span className={styles.headerTitle}>{SCREEN_TITLES[screen]}</span>
                <button className={styles.closeBtn} onClick={handleClose} aria-label="Close widget">✕</button>
              </div>
            )}

            <div className={styles.body}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={screen}
                  className={styles.screenWrapper}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                >
                  {screen === 'upload' && <RoomUpload tenant={tenant} />}
                  {screen === 'style' && <StyleSelector tenant={tenant} />}
                  {screen === 'budget' && <BudgetInput tenant={tenant} />}
                  {screen === 'processing' && <Processing tenant={tenant} />}
                  {screen === 'canvas' && <CanvasEditor tenant={tenant} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
