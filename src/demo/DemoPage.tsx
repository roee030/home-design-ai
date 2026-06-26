import { motion } from 'framer-motion'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { Widget } from '@/widget/Widget'
import { WidgetLauncher } from '@/widget/components/WidgetLauncher'
import styles from './DemoPage.module.css'

const FEATURED_PRODUCTS = MOCK_TENANT.catalog.slice(0, 4)

export function DemoPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoName}>{MOCK_TENANT.name}</span>
        </div>
        <nav className={styles.nav}>
          <a href="#" className={styles.navLink}>Living Room</a>
          <a href="#" className={styles.navLink}>Bedroom</a>
          <a href="#" className={styles.navLink}>Dining</a>
          <a href="#" className={styles.navLink}>Storage</a>
        </nav>
        <div className={styles.headerActions}>
          <WidgetLauncher tenant={MOCK_TENANT} />
        </div>
      </header>

      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.heroBadge}>✦ AI-Powered Room Design</div>
          <h1 className={styles.heroTitle}>
            See Your Room<br />Transformed
          </h1>
          <p className={styles.heroSubtitle}>
            Upload a photo of your space. Pick a style. Our AI designs your dream room
            using only furniture from our actual catalog — within your budget.
          </p>
          <WidgetLauncher tenant={MOCK_TENANT} />
        </motion.div>

        <motion.div
          className={styles.heroVisual}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <img
            src="https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=85"
            alt="AI designed living room"
            className={styles.heroImage}
          />
          <div className={styles.heroImageBadge}>
            <span>✦</span>
            <span>AI-generated design using our catalog</span>
          </div>
        </motion.div>
      </section>

      <section className={styles.products}>
        <h2 className={styles.sectionTitle}>Featured Collection</h2>
        <div className={styles.productGrid}>
          {FEATURED_PRODUCTS.map((product, i) => (
            <motion.div
              key={product.id}
              className={styles.productCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <div className={styles.productImageWrap}>
                <img src={product.thumbnailUrl} alt={product.name} className={styles.productImage} />
              </div>
              <div className={styles.productInfo}>
                <span className={styles.productCategory}>{product.category}</span>
                <p className={styles.productName}>{product.name}</p>
                <p className={styles.productPrice}>₪{product.basePrice.toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.steps}>
          {[
            { n: '01', icon: '📷', title: 'Upload Your Room', desc: 'Take a photo or upload an image of the space you want to redesign.' },
            { n: '02', icon: '🎨', title: 'Choose Your Style', desc: 'Select from Japandi, Mid-Century, Scandinavian, and more design directions.' },
            { n: '03', icon: '✦', title: 'AI Designs It', desc: 'Our AI places real products from our catalog, respecting your budget.' },
            { n: '04', icon: '🛒', title: 'Shop the Look', desc: 'Click any item to swap colors, adjust positions, and add everything to cart.' },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              className={styles.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span className={styles.stepNumber}>{step.n}</span>
              <span className={styles.stepIcon}>{step.icon}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Widget tenant={MOCK_TENANT} />
    </div>
  )
}
