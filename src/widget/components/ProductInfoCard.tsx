import { motion } from 'framer-motion'
import type { Product, ProductVariant } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { analytics } from '@/utils/analytics'
import styles from './ProductInfoCard.module.css'

interface Props {
  product: Product
  activeVariant: ProductVariant
  itemId: string
  tenantId: string
}

export function ProductInfoCard({ product, activeVariant, itemId, tenantId }: Props) {
  const swapVariant = useCanvasStore((s) => s.swapVariant)

  const price = product.basePrice + activeVariant.priceDelta
  const formattedPrice = `₪${price.toLocaleString()}`

  const handleVariantClick = (variant: ProductVariant) => {
    swapVariant(itemId, variant.id)
    analytics.variantSwapped(tenantId, product.id, variant.id)
  }

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
    >
      <div className={styles.header}>
        <span className={styles.category}>{product.category}</span>
        <span className={styles.price}>{formattedPrice}</span>
      </div>

      <p className={styles.name}>{product.name}</p>

      {product.variants.length > 1 && (
        <div className={styles.variants}>
          {product.variants.map((v) => (
            <button
              key={v.id}
              className={`${styles.swatch} ${v.id === activeVariant.id ? styles.swatchActive : ''}`}
              style={{ background: v.color }}
              onClick={() => handleVariantClick(v)}
              title={v.name}
              aria-label={v.name}
            />
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <span className={styles.variantLabel}>{activeVariant.name}</span>
        <button className={styles.buyBtn}>Add to Cart →</button>
      </div>
    </motion.div>
  )
}
