import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { analytics } from '@/utils/analytics'
import { logger } from '@/utils/logger'
import { imageUrlToBase64 } from '@/utils/imageUtils'
import { analyzeRoom, designRoom } from '@/api/aiService'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { DESIGN_STYLES } from '@/constants/designStyles'
import type { TenantConfig, CanvasItem } from '@/types'
import type { DesignPlacement } from '@/api/types'
import styles from './Processing.module.css'

type Phase = 'loading-image' | 'analyzing' | 'designing' | 'placing' | 'done' | 'error'

const PHASE_LABELS: Record<Phase, string> = {
  'loading-image': 'Loading your room…',
  analyzing:       'Selecting furniture for your space…',
  designing:       'Compositing your AI redesign…',
  placing:         'Finalising your design…',
  done:            'Your design is ready ✦',
  error:           'Using a curated design for you…',
}

const PHASE_PROGRESS: Record<Phase, number> = {
  'loading-image': 10,
  analyzing:       35,
  designing:       78,
  placing:         94,
  done:            100,
  error:           100,
}

interface Props { tenant: TenantConfig }

export function Processing({ tenant }: Props) {
  const {
    uploadedImageUrl, selectedStyle, goTo,
    setGeneratedImage, setStyleDescription, setHasAIAnalysis,
    setRoomImageBase64, addShownProducts, shownProductIds,
  } = useWidgetStore()

  const setCanvasItems         = useCanvasStore((s) => s.setItems)
  const setRoomAIGenerated     = useCanvasStore((s) => s.setRoomAIGenerated)
  const setDesignPlacements    = useCanvasStore((s) => s.setDesignPlacements)
  const resetCanvas            = useCanvasStore((s) => s.reset)

  const [phase, setPhase] = useState<Phase>('loading-image')
  const ran = useRef(false)

  const styleInfo = selectedStyle ? DESIGN_STYLES[selectedStyle] : null
  const progress  = PHASE_PROGRESS[phase]

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const run = async () => {
      if (!uploadedImageUrl || !selectedStyle) { setPhase('error'); return }

      try {
        // ── 1. Load image ────────────────────────────────────────────────
        setPhase('loading-image')
        const imageBase64 = await imageUrlToBase64(uploadedImageUrl)
        setRoomImageBase64(imageBase64) // store for later re-generation on swap

        // ── 2. Analyze room → choose products + positions ────────────────
        // Pass previously shown products so AI picks fresh items each time
        setPhase('analyzing')
        const selection = await analyzeRoom({
          imageBase64,
          style: selectedStyle,
          excludeProductIds: shownProductIds,
        })
        logger.info('Products selected', { count: selection.selectedProducts.length })

        // ── 3. Build design placements (product image URLs included) ─────
        const placements: DesignPlacement[] = selection.selectedProducts
          .map((sp) => {
            const product = MOCK_TENANT.catalog.find((c) => c.id === sp.productId)
            const variant = product?.variants.find((v) => v.id === sp.variantId) ?? product?.variants[0]
            if (!product || !variant) return null
            return {
              ...sp,
              imageUrl:  variant.imageUrl ?? product.thumbnailUrl,
              name:      product.name,
              category:  product.category,
            }
          })
          .filter((p): p is DesignPlacement => p !== null)

        // ── 4. Design room — send room + product images at positions ─────
        // AI sees the actual product photos and composites them into the room
        setPhase('designing')
        let finalImageUrl = uploadedImageUrl
        let roomWasAIGenerated = false

        try {
          const designResult = await designRoom({
            roomImageBase64: imageBase64,
            style: selectedStyle,
            placements,
          })
          if (!designResult.fallback && designResult.imageUrl) {
            finalImageUrl = designResult.imageUrl
            roomWasAIGenerated = true
            logger.info('Room designed with product images')
          }
        } catch (err) {
          logger.warn('designRoom failed — using original photo', { err: String(err) })
        }

        // ── 5. Build canvas items from KNOWN positions (from analysis) ───
        // Positions come from step 2 — no locate step needed
        setPhase('placing')
        const canvasItems: CanvasItem[] = placements.map((p, i) => ({
          id:        `ai-${p.productId}-${i}`,
          productId: p.productId,
          variantId: p.variantId,
          x:         clamp(p.x, 2, 90),
          y:         clamp(p.y, 2, 90),
          width:     clamp(p.width  ?? 20, 8, 55),
          height:    clamp(p.height ?? 20, 6, 45),
          zIndex:    p.zIndex ?? i + 1,
          rotation:  0,
          viewAngle: p.viewAngle,
        }))

        // ── 6. Commit to stores ──────────────────────────────────────────
        resetCanvas()
        setCanvasItems(canvasItems)
        setDesignPlacements(placements)  // save full placements for swap re-generation
        setRoomAIGenerated(roomWasAIGenerated)
        setGeneratedImage(finalImageUrl)
        setStyleDescription(selection.styleDescription)
        setHasAIAnalysis(selection.isAIGenerated)

        // Track shown products for variety on next design run
        addShownProducts(placements.map((p) => p.productId))

        await delay(600)
        setPhase('done')
        analytics.designGenerated(tenant.id, selectedStyle)

        await delay(800)
        goTo('canvas')
      } catch (err) {
        logger.error('AI processing failed', { err: String(err) })
        setPhase('error')
        await delay(1500)
        goTo('canvas')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.container}>
      {styleInfo && (
        <motion.div
          className={styles.styleBadge}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span>{styleInfo.emoji}</span>
          <span>{styleInfo.label}</span>
        </motion.div>
      )}

      <div className={styles.orb}>
        <motion.div
          className={styles.orbInner}
          animate={{
            scale:   phase === 'done' ? [1, 1.2, 1] : [1, 1.1, 1],
            opacity: phase === 'done' ? [1, 0.7, 1] : [0.5, 1, 0.5],
          }}
          transition={{ repeat: Infinity, duration: phase === 'done' ? 1 : 2.2, ease: 'easeInOut' }}
        />
        <motion.span
          className={styles.orbIcon}
          animate={{ rotate: phase === 'done' ? 0 : 360 }}
          transition={phase === 'done' ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          ✦
        </motion.span>
      </div>

      <div className={styles.progressTrack}>
        <motion.div
          className={`${styles.progressFill} ${phase === 'done' ? styles.progressDone : ''}`}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          className={styles.step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          {PHASE_LABELS[phase]}
        </motion.p>
      </AnimatePresence>

      <p className={styles.poweredBy}>Powered by Gemini AI</p>
    </div>
  )
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
