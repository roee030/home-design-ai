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
  position: 'above' | 'below'
}

export function ProductInfoCard({ product, activeVariant, itemId, tenantId, position }: Props) {
  const swapVariant = useCanvasStore((s) => s.swapVariant)
  const price = product.basePrice + activeVariant.priceDelta

  const handleVariant = (v: ProductVariant) => {
    swapVariant(itemId, v.id)
    analytics.variantSwapped(tenantId, product.id, v.id)
  }

  return (
    <motion.div
      className={`${styles.card} ${position === 'below' ? styles.below : styles.above}`}
      initial={{ opacity: 0, y: position === 'above' ? 10 : -10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position === 'above' ? 10 : -10, scale: 0.94 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Arrow */}
      <div className={`${styles.arrow} ${position === 'below' ? styles.arrowUp : styles.arrowDown}`} />

      <div className={styles.inner}>
        {/* Thumbnail */}
        <div className={styles.thumbWrap} style={{ borderColor: activeVariant.color }}>
          <img
            src={activeVariant.imageUrl}
            alt={product.name}
            className={styles.thumb}
          />
          <div className={styles.thumbTint} style={{ background: activeVariant.color + '22' }} />
        </div>

        {/* Info */}
        <div className={styles.info}>
          <div className={styles.meta}>
            <span className={styles.category}>{product.category}</span>
            <span className={styles.price}>₪{price.toLocaleString()}</span>
          </div>
          <p className={styles.name}>{product.name}</p>

          {product.variants.length > 1 && (
            <div className={styles.swatches}>
              {product.variants.map((v) => (
                <motion.button
                  key={v.id}
                  className={styles.swatch}
                  style={{ background: v.color }}
                  title={v.name}
                  onClick={() => handleVariant(v)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  animate={v.id === activeVariant.id
                    ? { boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${v.color}` }
                    : { boxShadow: '0 0 0 0px transparent' }
                  }
                />
              ))}
              <span className={styles.variantName}>{activeVariant.name}</span>
            </div>
          )}

          <motion.button
            className={styles.cta}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Add to Cart
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
