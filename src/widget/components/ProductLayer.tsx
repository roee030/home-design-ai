import { useState, useRef } from 'react'
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
  const updateItem = useCanvasStore((s) => s.updateItem)
  const setActive = useCanvasStore((s) => s.setActive)
  const activeItemId = useCanvasStore((s) => s.activeItemId)

  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, ix: 0, iy: 0 })

  const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
  if (!product) return null
  const variant = product.variants.find((v) => v.id === item.variantId) ?? product.variants[0]

  // Pin is positioned at center of the canvas item's bounding box
  const pinX = item.x + item.width / 2
  const pinY = item.y + item.height / 2

  // Show card above pin; if pin is in top third, show below
  const cardPosition = pinY < 30 ? 'below' : 'above'
  const isActive = activeItemId === item.id

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = false
    dragStart.current = { mx: e.clientX, my: e.clientY, ix: item.x, iy: item.y }

    const canvas = (e.currentTarget as HTMLElement).closest('[data-canvas]') as HTMLElement | null
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return

    const onMove = (me: MouseEvent) => {
      const dx = ((me.clientX - dragStart.current.mx) / rect.width) * 100
      const dy = ((me.clientY - dragStart.current.my) / rect.height) * 100
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragging.current = true
      updateItem(item.id, {
        x: Math.max(0, Math.min(90, dragStart.current.ix + dx)),
        y: Math.max(0, Math.min(90, dragStart.current.iy + dy)),
      })
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (dragging.current) analytics.productMoved(MOCK_TENANT.id, item.productId)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleClick = () => {
    if (dragging.current) return
    setActive(isActive ? null : item.id)
    if (!isActive) analytics.productHovered(MOCK_TENANT.id, item.productId)
  }

  return (
    <div
      className={styles.pinRoot}
      style={{ left: `${pinX}%`, top: `${pinY}%`, zIndex: item.zIndex + (isActive ? 100 : 0) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Animated pulse rings */}
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

      {/* Pin dot — color reflects active variant */}
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
