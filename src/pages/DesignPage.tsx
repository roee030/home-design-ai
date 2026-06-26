import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { RoomUpload } from '@/widget/screens/RoomUpload'
import { StyleSelector } from '@/widget/screens/StyleSelector'
import { Processing } from '@/widget/screens/Processing'
import { CanvasEditor } from '@/widget/screens/CanvasEditor'
import { NavBar } from '@/components/NavBar'
import { MOCK_TENANT } from '@/constants/mockTenant'
import styles from './DesignPage.module.css'

const STEP_LABELS: Partial<Record<string, string>> = {
  upload:     'Upload Your Room',
  style:      'Choose a Style',
  processing: '',
  canvas:     'Your AI Design',
}

export function DesignPage() {
  const screen = useWidgetStore((s) => s.screen)
  const goTo   = useWidgetStore((s) => s.goTo)
  const reset  = useWidgetStore((s) => s.reset)
  const resetCanvas = useCanvasStore((s) => s.reset)

  // Start fresh when entering the design page
  useEffect(() => {
    reset()
    resetCanvas()
  }, [reset, resetCanvas])

  const isFullBleed = screen === 'canvas' || screen === 'processing'

  const handleBack = () => {
    const prev: Partial<Record<string, string>> = {
      style: 'upload', canvas: 'upload',
    }
    const target = prev[screen]
    if (target) goTo(target as Parameters<typeof goTo>[0])
  }

  const canGoBack = ['style', 'canvas'].includes(screen)

  return (
    <div className={styles.page}>
      {/* Nav bar is hidden in canvas/processing — they're full bleed */}
      {!isFullBleed && <NavBar active="design" />}

      <main className={isFullBleed ? styles.mainFull : styles.mainNormal}>
        {/* Back + step label */}
        {!isFullBleed && screen !== 'upload' && (
          <div className={styles.stepHeader}>
            {canGoBack && (
              <button className={styles.backBtn} onClick={handleBack}>
                ← Back
              </button>
            )}
            <span className={styles.stepLabel}>{STEP_LABELS[screen]}</span>
            <span />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className={isFullBleed ? styles.screenFull : styles.screenNormal}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {screen === 'upload'     && <RoomUpload tenant={MOCK_TENANT} />}
            {screen === 'style'      && <StyleSelector tenant={MOCK_TENANT} />}
            {screen === 'processing' && <Processing tenant={MOCK_TENANT} />}
            {screen === 'canvas'     && <CanvasEditor tenant={MOCK_TENANT} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
