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
  const updateItem    = useCanvasStore((s) => s.updateItem)
  const setActive     = useCanvasStore((s) => s.setActive)
  const setStoreHover = useCanvasStore((s) => s.setHovered)
  const activeItemId  = useCanvasStore((s) => s.activeItemId)

  const roomAIGenerated = useCanvasStore((s) => s.roomAIGenerated)
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, ix: 0, iy: 0 })

  const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
  if (!product) return null
  const variant = product.variants.find((v) => v.id === item.variantId) ?? product.variants[0]

  const pinX = item.x + item.width / 2
  const pinY = item.y + item.height / 2
  const cardPosition = pinY < 30 ? 'below' : 'above'
  const isActive = activeItemId === item.id
  const isHighlighted = isActive || hovered

  // Show PNG overlay only when Gemini redesigned the room.
  // When falling back to original photo, overlays are catalog images that look bad.
  const overlayUrl = (roomAIGenerated && product.overlayUrl)
    ? `${import.meta.env.BASE_URL}${product.overlayUrl}`
    : null

  // CSS 3D perspective: rotate furniture PNG to match room viewing angle.
  // viewAngle > 0 → furniture faces right (show left side) → rotateY(angle)
  // viewAngle < 0 → furniture faces left (show right side) → rotateY(angle)
  const angle = item.viewAngle ?? 0
  const perspectiveTransform = angle !== 0
    ? `perspective(900px) rotateY(${angle}deg)`
    : undefined

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
    <>
      {/* ── Furniture image overlay ── */}
      {overlayUrl && (
        <div
          className={styles.furnitureWrapper}
          style={{
            left:   `${item.x}%`,
            top:    `${item.y}%`,
            width:  `${item.width}%`,
            height: `${item.height}%`,
            zIndex: item.zIndex,
            ...(perspectiveTransform ? { transform: perspectiveTransform, transformOrigin: 'bottom center' } : {}),
          }}
        >
          <img
            src={overlayUrl}
            alt={product.name}
            draggable={false}
            className={`${styles.furnitureImg} ${isHighlighted ? styles.furnitureImgActive : ''}`}
          />
        </div>
      )}

      {/* ── Interactive pin dot + card ── */}
      <div
        className={styles.pinRoot}
        style={{
          left:   `${pinX}%`,
          top:    `${pinY}%`,
          zIndex: item.zIndex + (isActive ? 100 : 0),
        }}
        onMouseEnter={() => { setHovered(true);  setStoreHover(item.id) }}
        onMouseLeave={() => { setHovered(false); setStoreHover(null) }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* Pulse rings (only when not active) */}
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
    </>
  )
}
