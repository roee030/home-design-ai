import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { CanvasItem, TenantConfig } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { analytics } from '@/utils/analytics'
import { ProductInfoCard } from './ProductInfoCard'
import styles from './ProductLayer.module.css'

interface Props {
  item: CanvasItem
  tenant: TenantConfig
  containerRef: React.RefObject<HTMLDivElement>
}

export function ProductLayer({ item, tenant, containerRef }: Props) {
  const updateItem = useCanvasStore((s) => s.updateItem)
  const [showCard, setShowCard] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const product = MOCK_TENANT.catalog.find((p) => p.id === item.productId)
  const variant = product?.variants.find((v) => v.id === item.variantId) ?? product?.variants[0]

  if (!product || !variant) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowCard(false)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dx = ((ev.clientX - dragRef.current.startX) / rect.width) * 100
      const dy = ((ev.clientY - dragRef.current.startY) / rect.height) * 100
      updateItem(item.id, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
    }

    const onUp = () => {
      analytics.productMoved(tenant.id, item.productId)
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className={styles.layer}
      style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: item.zIndex }}
      onMouseEnter={() => { setShowCard(true); analytics.productHovered(tenant.id, item.productId) }}
      onMouseLeave={() => setShowCard(false)}
      onMouseDown={handleMouseDown}
    >
      <div className={`${styles.hotspot} ${showCard ? styles.hotspotActive : ''}`} />

      <AnimatePresence>
        {showCard && (
          <ProductInfoCard
            product={product}
            activeVariant={variant}
            itemId={item.id}
            tenantId={tenant.id}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
