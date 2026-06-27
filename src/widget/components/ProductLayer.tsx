import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CanvasItem } from '@/types'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { useCanvasStore } from '@/stores/canvasStore'
import { analytics } from '@/utils/analytics'
import { ProductInfoCard } from './ProductInfoCard'
import styles from './ProductLayer.module.css'

interface Props {
  item: CanvasItem
}

export function ProductLayer({ item }: Props) {
  const [hovered, setHovered] = useState(false)
  const setActive     = useCanvasStore((s) => s.setActive)
  const setStoreHover = useCanvasStore((s) => s.setHovered)
  const activeItemId  = useCanvasStore((s) => s.activeItemId)

  const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
  if (!product) return null
  const variant = product.variants.find((v) => v.id === item.variantId) ?? product.variants[0]

  const pinX = item.x + item.width / 2
  const pinY = item.y + item.height / 2
  const cardPosition = pinY < 30 ? 'below' : 'above'
  const isActive = activeItemId === item.id

  const handleClick = () => {
    setActive(isActive ? null : item.id)
    if (!isActive) analytics.productHovered(MOCK_TENANT.id, item.productId)
  }

  return (
    <div
      className={styles.pinRoot}
      style={{
        left:   `${pinX}%`,
        top:    `${pinY}%`,
        zIndex: item.zIndex + (isActive ? 100 : 0),
      }}
      onMouseEnter={() => { setHovered(true);  setStoreHover(item.id) }}
      onMouseLeave={() => { setHovered(false); setStoreHover(null) }}
      onClick={handleClick}
    >
      {/* Pulse rings */}
      {!isActive && (
        <>
          <motion.div
            className={styles.pulseRing}
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            style={{ borderColor: variant.color }}
          />
          <motion.div
            className={styles.pulseRing}
            animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
            style={{ borderColor: variant.color }}
          />
        </>
      )}

      {/* Pin dot */}
      <motion.div
        className={styles.dot}
        animate={{
          scale: isActive || hovered ? 1.3 : 1,
          boxShadow: isActive
            ? `0 0 0 3px #fff, 0 0 0 5.5px ${variant.color}, 0 8px 24px rgba(0,0,0,0.32)`
            : hovered
            ? `0 0 0 2.5px #fff, 0 0 0 4.5px ${variant.color}, 0 5px 16px rgba(0,0,0,0.25)`
            : `0 0 0 2px rgba(255,255,255,0.9), 0 2px 10px rgba(0,0,0,0.22)`,
        }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{ background: variant.color }}
      />

      {/* Product info card */}
      <AnimatePresence>
        {(hovered || isActive) && (
          <ProductInfoCard
            product={product}
            activeVariant={variant}
            itemId={item.id}
            tenantId={MOCK_TENANT.id}
            position={cardPosition}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
