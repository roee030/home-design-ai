import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './RoomUpload.module.css'

const TEMPLATES = [
  { id: 'living-room', label: 'Living Room',  emoji: '🛋️', url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200&q=85' },
  { id: 'bedroom',     label: 'Bedroom',       emoji: '🛏️', url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=85' },
  { id: 'dining-room', label: 'Dining Room',   emoji: '🍽️', url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=85' },
  { id: 'kitchen',     label: 'Kitchen',       emoji: '🍳', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85' },
  { id: 'home-office', label: 'Home Office',   emoji: '💻', url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=85' },
  { id: 'kids-room',   label: 'Kids Room',     emoji: '🧸', url: 'https://images.unsplash.com/photo-1555436169-28b81f5ef2e4?w=1200&q=85' },
]

interface Props { tenant: TenantConfig }

export function RoomUpload({ tenant }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { setUploadedImage, goTo } = useWidgetStore()
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setUploadedImage(url)
    analytics.roomUploaded(tenant.id)
    goTo('style')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleTemplate = (url: string) => {
    setUploadedImage(url)
    analytics.roomUploaded(tenant.id)
    goTo('style')
  }

  return (
    <div className={styles.container}>
      <motion.h2
        className={styles.title}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Upload Your Room
      </motion.h2>
      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Upload a photo or choose a template room
      </motion.p>

      {/* Upload dropzone */}
      <motion.div
        className={styles.dropzone}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className={styles.uploadIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className={styles.dropText}>Click to upload or drag & drop</p>
        <p className={styles.dropHint}>JPG, PNG · up to 20 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleInput}
        />
      </motion.div>

      {/* Room templates */}
      <div className={styles.divider}><span>or choose a template</span></div>

      <motion.div
        className={styles.templateGrid}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {TEMPLATES.map((t, i) => (
          <motion.button
            key={t.id}
            className={`${styles.templateCard} ${hoveredTemplate === t.id ? styles.templateCardHover : ''}`}
            onClick={() => handleTemplate(t.url)}
            onMouseEnter={() => setHoveredTemplate(t.id)}
            onMouseLeave={() => setHoveredTemplate(null)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.28 + i * 0.04 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className={styles.templateImgWrap}>
              <img src={t.url} alt={t.label} className={styles.templateImg} />
              <div className={styles.templateOverlay} />
            </div>
            <div className={styles.templateLabel}>
              <span className={styles.templateEmoji}>{t.emoji}</span>
              {t.label}
            </div>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {hoveredTemplate && (
          <motion.p
            className={styles.templateHint}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            Click to use this room as your base
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
