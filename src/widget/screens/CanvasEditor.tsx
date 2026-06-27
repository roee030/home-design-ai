import { useState, useRef, useCallback, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore } from '@/stores/canvasStore'
import { useWidgetStore } from '@/stores/widgetStore'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { ROOM_IMAGE_URL } from '@/constants/mockCanvas'
import { ProductLayer } from '@/widget/components/ProductLayer'
import { analytics } from '@/utils/analytics'
import { designRoom } from '@/api/aiService'
import { logger } from '@/utils/logger'
import type { TenantConfig } from '@/types'
import type { DesignPlacement } from '@/api/types'
import styles from './CanvasEditor.module.css'

interface Props { tenant: TenantConfig }

export function CanvasEditor({ tenant }: Props) {
  const items              = useCanvasStore((s) => s.items)
  const activeItemId       = useCanvasStore((s) => s.activeItemId)
  const hoveredItemId      = useCanvasStore((s) => s.hoveredItemId)
  const designPlacements   = useCanvasStore((s) => s.designPlacements)
  const isRegenerating     = useCanvasStore((s) => s.isRegenerating)
  const setActive          = useCanvasStore((s) => s.setActive)
  const swapProduct        = useCanvasStore((s) => s.swapProduct)
  const setIsRegenerating  = useCanvasStore((s) => s.setIsRegenerating)
  const setDesignPlacements = useCanvasStore((s) => s.setDesignPlacements)

  const generatedImageUrl  = useWidgetStore((s) => s.generatedImageUrl)
  const roomImageBase64    = useWidgetStore((s) => s.roomImageBase64)
  const selectedStyle      = useWidgetStore((s) => s.selectedStyle)
  const styleDescription   = useWidgetStore((s) => s.styleDescription)
  const hasAIAnalysis      = useWidgetStore((s) => s.hasAIAnalysis)
  const setGeneratedImage  = useWidgetStore((s) => s.setGeneratedImage)

  const [cartAdded, setCartAdded] = useState(false)
  const [showDesc, setShowDesc]   = useState(true)

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

    setImgBounds({ left: (cW - w) / 2, top: (cH - h) / 2, width: w, height: h })
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

  // Swap a product AND trigger AI re-design with new product image at same position
  const handleSwap = async (itemId: string, newProductId: string, newVariantId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    // Update canvas item immediately (instant chip feedback)
    swapProduct(itemId, newProductId, newVariantId)

    // Re-design: rebuild placements with swapped product, same positions
    if (!roomImageBase64 || !selectedStyle) return

    const newProduct = MOCK_TENANT.catalog.find((p) => p.id === newProductId)
    const newVariant = newProduct?.variants.find((v) => v.id === newVariantId) ?? newProduct?.variants[0]
    if (!newProduct || !newVariant) return

    const currentPlacements = designPlacements.length > 0
      ? designPlacements
      : items.map((ci) => {
          const p = MOCK_TENANT.catalog.find((cp) => cp.id === ci.productId)
          const v = p?.variants.find((cv) => cv.id === ci.variantId) ?? p?.variants[0]
          return p && v
            ? { productId: ci.productId, variantId: ci.variantId,
                imageUrl: v.imageUrl ?? p.thumbnailUrl, name: p.name, category: p.category,
                x: ci.x, y: ci.y, width: ci.width, height: ci.height,
                zIndex: ci.zIndex, viewAngle: ci.viewAngle } as DesignPlacement
            : null
        }).filter((p): p is DesignPlacement => p !== null)

    const newPlacements: DesignPlacement[] = currentPlacements.map((p) =>
      p.productId === item.productId && p.variantId === item.variantId
        ? { ...p, productId: newProductId, variantId: newVariantId,
            imageUrl: newVariant.imageUrl ?? newProduct.thumbnailUrl,
            name: newProduct.name, category: newProduct.category }
        : p
    )

    setIsRegenerating(true)
    try {
      const result = await designRoom({
        roomImageBase64,
        style: selectedStyle,
        placements: newPlacements,
      })
      if (!result.fallback && result.imageUrl) {
        setGeneratedImage(result.imageUrl)
        setDesignPlacements(newPlacements)
        logger.info('Swap re-design complete')
      }
    } catch (err) {
      logger.warn('Swap re-design failed', { err: String(err) })
    } finally {
      setIsRegenerating(false)
    }
  }

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
        <img
          ref={imgRef}
          src={roomImage}
          alt="AI-designed room"
          className={styles.roomImage}
          draggable={false}
          onLoad={recalcBounds}
        />

        {/* Home button */}
        <button className={styles.homeBtn} onClick={() => { window.location.hash = '/' }}>
          ← Home
        </button>

        {/* Pin overlay */}
        {imgBounds.width > 0 && (
          <div
            className={styles.pinOverlay}
            data-canvas
            style={{ left: imgBounds.left, top: imgBounds.top, width: imgBounds.width, height: imgBounds.height }}
          >
            {items.map((item) => {
              const isHighlighted = item.id === activeItemId || item.id === hoveredItemId
              const bProduct = isHighlighted ? MOCK_TENANT.catalog.find((p) => p.id === item.productId) : null
              const bVariant = bProduct?.variants.find((v) => v.id === item.variantId) ?? bProduct?.variants[0]
              return (
                <Fragment key={item.id}>
                  <AnimatePresence>
                    {isHighlighted && (
                      <motion.div
                        className={styles.boundingBox}
                        style={{
                          left: `${item.x}%`, top: `${item.y}%`,
                          width: `${item.width}%`, height: `${item.height}%`,
                          borderColor: bVariant?.color ?? 'var(--tenant-accent, #C9A84C)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      />
                    )}
                  </AnimatePresence>
                  <ProductLayer item={item} />
                </Fragment>
              )
            })}
          </div>
        )}

        {/* Regenerating overlay */}
        <AnimatePresence>
          {isRegenerating && (
            <motion.div
              className={styles.regenOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.regenSpinner}>✦</div>
              <p className={styles.regenText}>Redesigning with new product…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo badge */}
        {!hasAIAnalysis && (
          <div className={styles.demoBadge}>
            {items.length === 0 ? '⚡ AI analysis unavailable' : '📍 Demo layout'}
          </div>
        )}

        {/* Style description */}
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

        <div className={styles.hintBadge}>
          <span>✦</span> Click pins for product details
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottomBar}>
        {/* Item chips */}
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

        {/* Swap row — shows similar products + triggers AI redesign */}
        {activeItemId && (() => {
          const activeItem    = items.find((i) => i.id === activeItemId)
          const activeProduct = activeItem && MOCK_TENANT.catalog.find((p) => p.id === activeItem.productId)
          const similar       = activeProduct
            ? MOCK_TENANT.catalog.filter((p) => p.category === activeProduct.category && p.id !== activeProduct.id)
            : []
          if (!activeProduct || !similar.length) return null
          return (
            <div className={styles.swapRow}>
              <span className={styles.swapLabel}>
                ↔ Swap {activeProduct.category}
                {roomImageBase64 && <span className={styles.swapHint}> · redesigns automatically</span>}
              </span>
              <div className={styles.swapScroll}>
                {similar.map((p) => (
                  <motion.button
                    key={p.id}
                    className={styles.swapCard}
                    onClick={() => handleSwap(activeItemId, p.id, p.variants[0].id)}
                    whileHover={{ y: -2, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={isRegenerating}
                    layout
                  >
                    <img src={p.thumbnailUrl} alt={p.name} className={styles.swapThumb} />
                    <span className={styles.swapName}>{p.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span className={styles.swapPrice}>₪{p.basePrice.toLocaleString()}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )
        })()}

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
                : <motion.span key="cta"  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>Add Room to Cart →</motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
