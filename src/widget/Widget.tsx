import { AnimatePresence, motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import { RoomUpload } from './screens/RoomUpload'
import { StyleSelector } from './screens/StyleSelector'
import { Processing } from './screens/Processing'
import { CanvasEditor } from './screens/CanvasEditor'
import type { TenantConfig } from '@/types'
import styles from './Widget.module.css'

interface Props {
  tenant: TenantConfig
  fullPage?: boolean
}

const SCREEN_TITLES: Record<string, string> = {
  upload:     'Design My Room',
  style:      'Choose a Style',
  processing: '',
  canvas:     'Your AI Design',
}

export function Widget({ tenant, fullPage }: Props) {
  const { isOpen, screen, close, goTo, reset } = useWidgetStore()

  const handleClose = () => {
    if (fullPage) {
      // In full-page mode "close" → restart flow
      reset()
    } else {
      analytics.widgetClosed(tenant.id, screen)
      close()
    }
  }

  const handleBack = () => {
    const prev: Record<string, string> = { style: 'upload', canvas: 'upload' }
    if (prev[screen]) goTo(prev[screen] as typeof screen)
  }

  const canGoBack   = ['style', 'canvas'].includes(screen)
  const isFullScreen = screen === 'canvas' || screen === 'processing'

  const panelClass = [
    styles.panel,
    !fullPage && isFullScreen ? styles.fullscreen : '',
    fullPage ? styles.fullPage : '',
  ].filter(Boolean).join(' ')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — only in embedded (non-fullPage) mode */}
          {!fullPage && (
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
          )}

          <motion.div
            className={panelClass}
            initial={fullPage ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.97 }}
            animate={fullPage ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={fullPage ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          >
            {screen !== 'processing' && (
              <div className={styles.header}>
                <button
                  className={styles.backBtn}
                  onClick={canGoBack ? handleBack : undefined}
                  style={{ visibility: canGoBack ? 'visible' : 'hidden' }}
                  aria-label="Go back"
                >
                  ←
                </button>

                <div className={styles.headerCenter}>
                  {fullPage && (
                    <span className={styles.brandMark}>✦</span>
                  )}
                  <span className={styles.headerTitle}>{SCREEN_TITLES[screen]}</span>
                </div>

                <button
                  className={styles.closeBtn}
                  onClick={handleClose}
                  aria-label={fullPage ? 'Start over' : 'Close'}
                >
                  {fullPage && screen !== 'upload' ? '↺' : '✕'}
                </button>
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
                  {screen === 'upload'     && <RoomUpload tenant={tenant} />}
                  {screen === 'style'      && <StyleSelector tenant={tenant} />}
                  {screen === 'processing' && <Processing tenant={tenant} />}
                  {screen === 'canvas'     && <CanvasEditor tenant={tenant} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
