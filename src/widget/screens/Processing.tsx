import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { analytics } from '@/utils/analytics'
import { logger } from '@/utils/logger'
import { imageUrlToBase64 } from '@/utils/imageUtils'
import { analyzeRoom, generateRoom } from '@/api/aiService'
import { DESIGN_STYLES } from '@/constants/designStyles'
import type { TenantConfig, CanvasItem } from '@/types'
import styles from './Processing.module.css'

type Phase =
  | 'loading-image'
  | 'analyzing'
  | 'generating'
  | 'matching'
  | 'placing'
  | 'done'
  | 'error'

const PHASE_LABELS: Record<Phase, string> = {
  'loading-image': 'Loading your room…',
  analyzing:       'Analyzing your room with Gemini AI…',
  generating:      'Generating your AI redesign…',
  matching:        'Matching catalog products to your style…',
  placing:         'Placing furniture in your space…',
  done:            'Your design is ready ✦',
  error:           'Using a curated design for you…',
}

const PHASE_PROGRESS: Record<Phase, number> = {
  'loading-image': 8,
  analyzing:       30,
  generating:      60,
  matching:        78,
  placing:         92,
  done:            100,
  error:           100,
}

interface Props { tenant: TenantConfig }

export function Processing({ tenant }: Props) {
  const { uploadedImageUrl, selectedStyle, budget, goTo, setGeneratedImage, setStyleDescription, setHasAIAnalysis } =
    useWidgetStore()
  const setCanvasItems = useCanvasStore((s) => s.setItems)
  const resetCanvas = useCanvasStore((s) => s.reset)

  const [phase, setPhase] = useState<Phase>('loading-image')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const ran = useRef(false)

  const styleInfo = selectedStyle ? DESIGN_STYLES[selectedStyle] : null
  const progress = PHASE_PROGRESS[phase]

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const run = async () => {
      if (!uploadedImageUrl || !selectedStyle) {
        setPhase('error')
        return
      }

      try {
        // ── 1. Convert image to base64 ──────────────────────────────────
        setPhase('loading-image')
        const imageBase64 = await imageUrlToBase64(uploadedImageUrl)
        logger.info('Image compressed to base64', { bytes: imageBase64.length })

        // ── 2. Generate restyled room image ─────────────────────────────
        // On failure: fall back to the original uploaded image (not a random stock photo)
        setPhase('generating')
        let finalImageUrl: string = uploadedImageUrl!
        let analysisBase64: string = imageBase64  // reuse already-loaded base64

        try {
          const generatedResult = await generateRoom({ imageBase64, style: selectedStyle })
          finalImageUrl = generatedResult.imageUrl
          // Need to re-encode generated image so Gemini analyses what the user sees
          analysisBase64 = await imageUrlToBase64(finalImageUrl)
        } catch (genErr) {
          logger.warn('Room generation failed — analysing original uploaded image', { err: String(genErr) })
          // analysisBase64 already = imageBase64 (original), finalImageUrl = uploadedImageUrl
        }

        // ── 3. Analyze whichever image we ended up with ─────────────────
        setPhase('analyzing')
        const analysisResult = await analyzeRoom({ imageBase64: analysisBase64, style: selectedStyle, budget })

        // ── 3. Apply product placements ─────────────────────────────────
        setPhase('matching')
        await delay(600)

        setPhase('placing')

        const canvasItems: CanvasItem[] = analysisResult.selectedProducts.map((p, i) => ({
          id: `ai-${p.productId}-${i}`,
          productId: p.productId,
          variantId: p.variantId,
          x: clamp(p.x, 5, 88),
          y: clamp(p.y, 5, 88),
          width: clamp(p.width ?? 20, 10, 50),
          height: clamp(p.height ?? 20, 8, 40),
          zIndex: p.zIndex ?? i + 1,
          rotation: 0,
        }))

        resetCanvas()
        setCanvasItems(canvasItems)
        setGeneratedImage(finalImageUrl)
        setStyleDescription(analysisResult.styleDescription)
        setHasAIAnalysis(analysisResult.isAIGenerated)

        await delay(700)

        // ── 4. Navigate ─────────────────────────────────────────────────
        setPhase('done')
        analytics.designGenerated(tenant.id, selectedStyle)

        await delay(900)
        goTo('canvas')
      } catch (err) {
        logger.error('AI processing failed', { err: String(err) })
        setErrorMsg(String(err))
        setPhase('error')
        analytics.designGenerated(tenant.id, selectedStyle ?? 'unknown')

        await delay(1500)
        goTo('canvas')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.container}>
      {/* Style badge */}
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

      {/* Pulsing AI orb */}
      <div className={styles.orb}>
        <motion.div
          className={styles.orbInner}
          animate={{
            scale: phase === 'done' ? [1, 1.2, 1] : [1, 1.1, 1],
            opacity: phase === 'done' ? [1, 0.8, 1] : [0.6, 1, 0.6],
          }}
          transition={{ repeat: Infinity, duration: phase === 'done' ? 1 : 2, ease: 'easeInOut' }}
        />
        <motion.span
          className={styles.orbIcon}
          animate={{ rotate: phase === 'done' ? 0 : 360 }}
          transition={phase === 'done'
            ? { duration: 0 }
            : { duration: 8, repeat: Infinity, ease: 'linear' }
          }
        >
          ✦
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <motion.div
          className={`${styles.progressFill} ${phase === 'done' ? styles.progressDone : ''}`}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Step label */}
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

      {errorMsg && (
        <p className={styles.errorHint}>Falling back to curated demo design…</p>
      )}

      <p className={styles.poweredBy}>Powered by Gemini AI</p>
    </div>
  )
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
