import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCanvasStore } from '@/stores/canvasStore'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { ROOM_IMAGE_URL } from '@/constants/mockCanvas'
import { ProductLayer } from '@/widget/components/ProductLayer'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './CanvasEditor.module.css'

interface Props { tenant: TenantConfig }

export function CanvasEditor({ tenant }: Props) {
  const items = useCanvasStore((s) => s.items)
  const activeItemId = useCanvasStore((s) => s.activeItemId)
  const setActive = useCanvasStore((s) => s.setActive)
  const [cartAdded, setCartAdded] = useState(false)

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
      {/* Canvas area */}
      <div
        className={styles.canvasWrapper}
        data-canvas
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[class*="pinRoot"]')) return
          setActive(null)
        }}
      >
        <img src={ROOM_IMAGE_URL} alt="AI-designed room" className={styles.roomImage} draggable={false} />

        {items.map((item) => (
          <ProductLayer key={item.id} item={item} />
        ))}

        {/* Hint overlay — fades out after first interaction */}
        <div className={styles.hintBadge}>
          <span>✦</span> Hover pins · Swap colors · Drag to reposition
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        {/* Item chips — reactive to variant color changes */}
        <div className={styles.chipRow}>
          {items.map((item) => {
            const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
            const variant = product?.variants.find((v) => v.id === item.variantId)
            if (!product || !variant) return null
            const price = product.basePrice + (variant.priceDelta ?? 0)
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

        {/* Total + CTA */}
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
