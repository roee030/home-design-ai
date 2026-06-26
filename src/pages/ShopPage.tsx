import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/NavBar'
import { MOCK_TENANT } from '@/constants/mockTenant'
import styles from './ShopPage.module.css'

const ALL_CATEGORIES = ['All', ...Array.from(new Set(MOCK_TENANT.catalog.map((p) => p.category)))]

export function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries(MOCK_TENANT.catalog.map((p) => [p.id, p.variants[0].id]))
  )
  const [added, setAdded] = useState<Record<string, boolean>>({})

  const filtered =
    activeCategory === 'All'
      ? MOCK_TENANT.catalog
      : MOCK_TENANT.catalog.filter((p) => p.category === activeCategory)

  const handleVariant = (productId: string, variantId: string) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }))
  }

  const handleAdd = (productId: string) => {
    setAdded((prev) => ({ ...prev, [productId]: true }))
    setTimeout(() => setAdded((prev) => ({ ...prev, [productId]: false })), 1800)
  }

  return (
    <div className={styles.page}>
      <NavBar active="shop" />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Catalog</p>
            <h1 className={styles.title}>Shop the Collection</h1>
            <p className={styles.sub}>
              {MOCK_TENANT.catalog.length} curated pieces · All styles · Free design consultation
            </p>
          </div>
          <a href="#/design" className={styles.designCta}>
            ✦ Design My Room
          </a>
        </div>

        {/* Category filter */}
        <div className={styles.filters}>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.filter} ${activeCategory === cat ? styles.filterActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className={styles.grid}>
          {filtered.map((product, i) => {
            const variantId = selectedVariants[product.id]
            const variant   = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
            const price     = product.basePrice + (variant.priceDelta ?? 0)
            const isAdded   = added[product.id]

            return (
              <motion.div
                key={product.id}
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                layout
              >
                {/* Image */}
                <div className={styles.imgWrap}>
                  <img
                    src={variant.imageUrl ?? product.imageUrl}
                    alt={product.name}
                    className={styles.img}
                  />
                  <div className={styles.categoryBadge}>{product.category}</div>
                  {!product.inStock && (
                    <div className={styles.outOfStock}>Out of Stock</div>
                  )}
                </div>

                {/* Info */}
                <div className={styles.info}>
                  <div className={styles.infoTop}>
                    <h3 className={styles.name}>{product.name}</h3>
                    <span className={styles.price}>₪{price.toLocaleString()}</span>
                  </div>

                  {/* Style tags */}
                  <div className={styles.styleTags}>
                    {product.styles.slice(0, 3).map((s) => (
                      <span key={s} className={styles.styleTag}>{s}</span>
                    ))}
                  </div>

                  {/* Variant swatches */}
                  <div className={styles.swatches}>
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        className={`${styles.swatch} ${v.id === variantId ? styles.swatchActive : ''}`}
                        style={{ background: v.color }}
                        onClick={() => handleVariant(product.id, v.id)}
                        title={v.name}
                        aria-label={v.name}
                      />
                    ))}
                    <span className={styles.variantName}>{variant.name}</span>
                  </div>

                  {/* Add to cart */}
                  <button
                    className={`${styles.addBtn} ${isAdded ? styles.addBtnDone : ''}`}
                    onClick={() => handleAdd(product.id)}
                    disabled={!product.inStock}
                  >
                    {isAdded ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerLogo}>✦ ShopTheRoom AI</span>
        <span className={styles.footerCopy}>© 2026 FurniStyle · All prices in ILS</span>
      </footer>
    </div>
  )
}
