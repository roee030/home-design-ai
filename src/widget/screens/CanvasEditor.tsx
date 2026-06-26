import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore } from '@/stores/canvasStore'
import { useWidgetStore } from '@/stores/widgetStore'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { ROOM_IMAGE_URL } from '@/constants/mockCanvas'
import { ProductLayer } from '@/widget/components/ProductLayer'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './CanvasEditor.module.css'

interface Props { tenant: TenantConfig }

export function CanvasEditor({ tenant }: Props) {
  const items        = useCanvasStore((s) => s.items)
  const activeItemId = useCanvasStore((s) => s.activeItemId)
  const setActive    = useCanvasStore((s) => s.setActive)

  const generatedImageUrl = useWidgetStore((s) => s.generatedImageUrl)
  const styleDescription  = useWidgetStore((s) => s.styleDescription)
  const hasAIAnalysis     = useWidgetStore((s) => s.hasAIAnalysis)

  const [cartAdded, setCartAdded] = useState(false)
  const [showDesc, setShowDesc]   = useState(true)

  // Image coordinates: track where the image is actually rendered
  // (object-fit: contain may add letterbox bars)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)
  const [imgBounds, setImgBounds] = useState({ left: 0, top: 0, width: 0, height: 0 })

  const roomImage = generatedImageUrl ?? ROOM_IMAGE_URL

  const recalcBounds = useCallback(() => {
    const img = imgRef.current
    const box = containerRef.current
    if (!img || !box || !img.naturalWidth) return

    const cW = box.clientWidth
    const cH = box.clientHeight
    const scale = Math.min(cW / img.naturalWidth, cH / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale

    setImgBounds({
      left:   (cW - w) / 2,
      top:    (cH - h) / 2,
      width:  w,
      height: h,
    })
  }, [])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    img.addEventListener('load', recalcBounds)
    window.addEventListener('resize', recalcBounds)
    if (img.complete && img.naturalWidth) recalcBounds()
    return () => {
      img.removeEventListener('load', recalcBounds)
      window.removeEventListener('resize', recalcBounds)
    }
  }, [roomImage, recalcBounds])

  const totalPrice = items.reduce((sum, item) => {
    const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
    const variant = product?.variants.find((v) => v.id === item.variantId)
    return sum + (product?.basePrice ?? 0) + (variant?.priceDelta ?? 0)
  }, 0)

  const handleAddAll = () => {
    analytics.addToCart(tenant.id, items.map((i) => i.productId), totalPrice)
    setCartAdded(true)
    window.parent.postMessage(
      { type: 'STR_ADD_TO_CART', products: items.map((i) => ({ productId: i.productId, variantId: i.variantId })) },
      '*'
    )
  }

  return (
    <div className={styles.container}>
      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        className={styles.canvasWrapper}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[class*="pinRoot"]')) return
          setActive(null)
        }}
      >
        {/* Room image — object-fit: contain so coordinates align with pins */}
        <img
          ref={imgRef}
          src={roomImage}
          alt="AI-designed room"
          className={styles.roomImage}
          draggable={false}
          onLoad={recalcBounds}
        />

        {/* Pin overlay — positioned exactly over the displayed image area */}
        {imgBounds.width > 0 && (
          <div
            className={styles.pinOverlay}
            data-canvas
            style={{
              left:   imgBounds.left,
              top:    imgBounds.top,
              width:  imgBounds.width,
              height: imgBounds.height,
            }}
          >
            {items.map((item) => (
              <ProductLayer key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Subtle badge when using mock positions (Gemini unavailable) */}
        {!hasAIAnalysis && (
          <div className={styles.demoBadge}>📍 Demo layout</div>
        )}

        {/* Style description overlay */}
        <AnimatePresence>
          {showDesc && styleDescription && (
            <motion.div
              className={styles.descCard}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <span className={styles.descText}>{styleDescription}</span>
              <button className={styles.descClose} onClick={() => setShowDesc(false)}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint badge */}
        <div className={styles.hintBadge}>
          <span>✦</span> Hover pins · Swap colors · Drag to reposition
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottomBar}>
        {/* Item chips — color dot updates live on variant swap */}
        <div className={styles.chipRow}>
          {items.map((item) => {
            const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
            const variant = product?.variants.find((v) => v.id === item.variantId)
            if (!product || !variant) return null
            const price    = product.basePrice + (variant.priceDelta ?? 0)
            const isActive = item.id === activeItemId
            return (
              <motion.button
                key={item.id}
                className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                onClick={() => setActive(isActive ? null : item.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                layout
              >
                <motion.span
                  className={styles.chipDot}
                  style={{ background: variant.color }}
                  animate={{ scale: isActive ? 1.2 : 1 }}
                />
                <span className={styles.chipName}>{product.name.split(' ').slice(0, 2).join(' ')}</span>
                <span className={styles.chipPrice}>₪{price.toLocaleString()}</span>
              </motion.button>
            )
          })}
        </div>

        <div className={styles.ctaRow}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalAmount}>₪{totalPrice.toLocaleString()}</span>
          </div>
          <motion.button
            className={`${styles.cartBtn} ${cartAdded ? styles.cartAdded : ''}`}
            onClick={handleAddAll}
            whileHover={!cartAdded ? { scale: 1.03 } : {}}
            whileTap={!cartAdded ? { scale: 0.97 } : {}}
          >
            <AnimatePresence mode="wait">
              {cartAdded
                ? <motion.span key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>✓ Added to Cart</motion.span>
                : <motion.span key="cta" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>Add Room to Cart →</motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
