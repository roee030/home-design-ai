import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { analytics } from '@/utils/analytics'
import { logger } from '@/utils/logger'
import { imageUrlToBase64 } from '@/utils/imageUtils'
import { analyzeRoom, generateRoom, locateProducts } from '@/api/aiService'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { DESIGN_STYLES } from '@/constants/designStyles'
import type { TenantConfig, CanvasItem } from '@/types'
import type { AIProductPlacement } from '@/api/types'
import styles from './Processing.module.css'

type Phase =
  | 'loading-image'
  | 'analyzing'
  | 'generating'
  | 'locating'
  | 'placing'
  | 'done'
  | 'error'

const PHASE_LABELS: Record<Phase, string> = {
  'loading-image': 'Loading your room…',
  analyzing:       'Selecting furniture for your space…',
  generating:      'Generating your AI redesign…',
  locating:        'Pinning items to your new room…',
  placing:         'Finalising your design…',
  done:            'Your design is ready ✦',
  error:           'Using a curated design for you…',
}

const PHASE_PROGRESS: Record<Phase, number> = {
  'loading-image': 8,
  analyzing:       30,
  generating:      60,
  locating:        82,
  placing:         94,
  done:            100,
  error:           100,
}

interface Props { tenant: TenantConfig }

export function Processing({ tenant }: Props) {
  const { uploadedImageUrl, selectedStyle, goTo, setGeneratedImage, setStyleDescription, setHasAIAnalysis } =
    useWidgetStore()
  const setCanvasItems      = useCanvasStore((s) => s.setItems)
  const setRoomAIGenerated  = useCanvasStore((s) => s.setRoomAIGenerated)
  const resetCanvas         = useCanvasStore((s) => s.reset)

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

        // ── 2. Analyze original image → select catalog products ──────────
        // This tells us WHAT to add and approximately WHERE (in original image coords)
        setPhase('analyzing')
        const selection = await analyzeRoom({ imageBase64, style: selectedStyle })
        logger.info('Products selected', { count: selection.selectedProducts.length })

        // ── 3. Build product descriptions for image generation ───────────
        const productDescriptions = selection.selectedProducts
          .map((p) => {
            const product = MOCK_TENANT.catalog.find((c) => c.id === p.productId)
            const variant = product?.variants.find((v) => v.id === p.variantId) ?? product?.variants[0]
            return product ? `${product.name} (${variant?.name ?? ''}, ${product.category})` : null
          })
          .filter((d): d is string => Boolean(d))

        // ── 4. Generate redesigned room WITH those specific products ──────
        setPhase('generating')
        let finalImageUrl = uploadedImageUrl!
        let generatedBase64: string | null = null
        let roomWasAIGenerated = false

        try {
          const genResult = await generateRoom({
            imageBase64,
            style: selectedStyle,
            products: productDescriptions,
          })
          if (!genResult.fallback && genResult.imageUrl) {
            finalImageUrl = genResult.imageUrl
            generatedBase64 = await imageUrlToBase64(finalImageUrl)
            roomWasAIGenerated = true
            logger.info('Room generated with products')
          }
        } catch (err) {
          logger.warn('generateRoom failed — using original photo', { err: String(err) })
        }

        // ── 5. Locate products in generated image (or use original coords) ──
        setPhase('locating')
        let finalPlacements: AIProductPlacement[] = selection.selectedProducts

        if (generatedBase64) {
          try {
            const locateInput = selection.selectedProducts.map((p) => {
              const product = MOCK_TENANT.catalog.find((c) => c.id === p.productId)
              const variant = product?.variants.find((v) => v.id === p.variantId) ?? product?.variants[0]
              return {
                productId:   p.productId,
                variantId:   p.variantId,
                name:        product?.name ?? p.productId,
                description: `${variant?.name ?? ''} ${product?.category ?? ''}`.trim(),
              }
            })

            const located = await locateProducts({ imageBase64: generatedBase64, products: locateInput })
            if (located.placements?.length) {
              finalPlacements = located.placements
              logger.info('Products located in generated image', { count: finalPlacements.length })
            }
          } catch (err) {
            logger.warn('locateProducts failed — using original positions', { err: String(err) })
          }
        }

        // ── 6. Build canvas items ────────────────────────────────────────
        setPhase('placing')
        const canvasItems: CanvasItem[] = finalPlacements.map((p, i) => ({
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

        resetCanvas()
        setCanvasItems(canvasItems)
        setRoomAIGenerated(roomWasAIGenerated)
        setGeneratedImage(finalImageUrl)
        setStyleDescription(selection.styleDescription)
        setHasAIAnalysis(selection.isAIGenerated)

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
            opacity: phase === 'done' ? [1, 0.8, 1] : [0.6, 1, 0.6],
          }}
          transition={{ repeat: Infinity, duration: phase === 'done' ? 1 : 2, ease: 'easeInOut' }}
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
