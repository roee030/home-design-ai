import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useCanvasStore } from '@/stores/canvasStore'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { ROOM_IMAGE_URL } from '@/constants/mockCanvas'
import { ProductLayer } from '@/widget/components/ProductLayer'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './CanvasEditor.module.css'

interface Props { tenant: TenantConfig }

export function CanvasEditor({ tenant }: Props) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const items = useCanvasStore((s) => s.items)
  const [cartAdded, setCartAdded] = useState(false)

  const totalPrice = items.reduce((sum, item) => {
    const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
    const variant = product?.variants.find((v) => v.id === item.variantId)
    return sum + (product?.basePrice ?? 0) + (variant?.priceDelta ?? 0)
  }, 0)

  const handleAddAll = () => {
    analytics.addToCart(
      tenant.id,
      items.map((i) => i.productId),
      totalPrice
    )
    setCartAdded(true)

    window.parent.postMessage(
      { type: 'STR_ADD_TO_CART', products: items.map((i) => ({ productId: i.productId, variantId: i.variantId })) },
      '*'
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.hint}>✦ Hover items to explore • Drag to reposition • Swap colors</span>
        <div className={styles.cartArea}>
          <span className={styles.total}>₪{totalPrice.toLocaleString()}</span>
          <motion.button
            className={`${styles.cartBtn} ${cartAdded ? styles.cartAdded : ''}`}
            onClick={handleAddAll}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {cartAdded ? '✓ Added to Cart' : 'Add Room to Cart'}
          </motion.button>
        </div>
      </div>

      <div className={styles.canvasWrapper} ref={containerRef}>
        <img
          src={ROOM_IMAGE_URL}
          alt="AI-designed room"
          className={styles.roomImage}
          draggable={false}
        />
        {items.map((item) => (
          <ProductLayer key={item.id} item={item} tenant={tenant} containerRef={containerRef} />
        ))}
      </div>

      <div className={styles.itemStrip}>
        {items.map((item) => {
          const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
          const variant = product?.variants.find((v) => v.id === item.variantId)
          if (!product || !variant) return null
          const price = product.basePrice + (variant.priceDelta ?? 0)
          return (
            <div key={item.id} className={styles.stripItem}>
              <div className={styles.stripColor} style={{ background: variant.color }} />
              <div className={styles.stripInfo}>
                <span className={styles.stripName}>{product.name}</span>
                <span className={styles.stripPrice}>₪{price.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
