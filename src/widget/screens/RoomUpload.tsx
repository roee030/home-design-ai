import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useWidgetStore } from '@/stores/widgetStore'
import { analytics } from '@/utils/analytics'
import type { TenantConfig } from '@/types'
import styles from './RoomUpload.module.css'

interface Props { tenant: TenantConfig }

export function RoomUpload({ tenant }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { setUploadedImage, goTo } = useWidgetStore()

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

  const handleDemoClick = () => {
    setUploadedImage('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80')
    analytics.roomUploaded(tenant.id)
    goTo('style')
  }

  return (
    <div className={styles.container}>
      <motion.h2 className={styles.title} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        Upload Your Room
      </motion.h2>
      <motion.p className={styles.subtitle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        Take a photo or upload an image of the room you want to redesign
      </motion.p>

      <motion.div
        className={styles.dropzone}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        whileHover={{ borderColor: 'var(--tenant-accent, #C9A84C)' }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
      >
        <span className={styles.uploadIcon}>📷</span>
        <p className={styles.dropText}>Click to upload or drag & drop</p>
        <p className={styles.dropHint}>JPG, PNG up to 20MB</p>
        <input ref={inputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleInput} />
      </motion.div>

      <div className={styles.divider}><span>or</span></div>

      <motion.button
        className={styles.demoBtn}
        onClick={handleDemoClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ✦ Try with a demo room
      </motion.button>
    </div>
  )
}
