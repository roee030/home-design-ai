import { motion } from 'framer-motion'
import { NavBar } from '@/components/NavBar'
import { MOCK_TENANT } from '@/constants/mockTenant'
import styles from './HomePage.module.css'

const STEPS = [
  {
    icon: '📸',
    title: 'Upload Your Room',
    desc: 'Take any photo of your current space — living room, bedroom, kitchen.',
  },
  {
    icon: '🎨',
    title: 'Choose a Style',
    desc: 'Japandi, Mid-Century, Scandinavian, Coastal and more — pick your aesthetic.',
  },
  {
    icon: '🛋️',
    title: 'Shop the Design',
    desc: 'Gemini AI redesigns your room and places real products from our catalog on it.',
  },
]

const FEATURES = [
  { label: 'AI-Powered', value: 'Gemini 2.0 + FLUX' },
  { label: 'Products', value: String(MOCK_TENANT.catalog.length) + ' items' },
  { label: 'Styles', value: '7 design styles' },
  { label: 'Time to design', value: '< 30 seconds' },
]

export function HomePage() {
  return (
    <div className={styles.page}>
      <NavBar active="home" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <motion.div
            className={styles.heroBadge}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            ✦ Powered by Gemini AI × fal.ai
          </motion.div>

          <motion.h1
            className={styles.heroTitle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Design Your Room.<br />
            <span className={styles.heroAccent}>Shop the Vision.</span>
          </motion.h1>

          <motion.p
            className={styles.heroSub}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Upload a photo of your space, pick a design style, and get an AI-generated
            redesign with real furniture you can buy — pinned directly onto the image.
          </motion.p>

          <motion.div
            className={styles.heroCtas}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <a href="#/design" className={styles.ctaPrimary}>
              Start Designing →
            </a>
            <a href="#/shop" className={styles.ctaSecondary}>
              Browse Catalog
            </a>
          </motion.div>
        </div>

        <div className={styles.heroVisual}>
          <motion.div
            className={styles.heroImgWrap}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <img
              src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=900&q=85"
              alt="AI-designed living room"
              className={styles.heroImg}
            />
            <div className={styles.heroImgOverlay} />
            <div className={styles.heroPinDemo}>
              <span className={styles.heroPinDot} />
              <div className={styles.heroPinCard}>Oslo Velvet Sofa · ₪2,799</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <section className={styles.statsBar}>
        {FEATURES.map((f) => (
          <div key={f.label} className={styles.stat}>
            <span className={styles.statValue}>{f.value}</span>
            <span className={styles.statLabel}>{f.label}</span>
          </div>
        ))}
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>How it works</p>
          <h2 className={styles.sectionTitle}>Three steps to your dream room</h2>

          <div className={styles.stepsGrid}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                className={styles.stepCard}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
              >
                <div className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className={styles.howCta}>
            <a href="#/design" className={styles.ctaPrimary}>
              Try It Now — It's Free
            </a>
          </div>
        </div>
      </section>

      {/* ── Catalog preview ───────────────────────────────────── */}
      <section className={styles.catalogSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Our catalog</p>
          <h2 className={styles.sectionTitle}>Curated furniture for every style</h2>

          <div className={styles.previewGrid}>
            {MOCK_TENANT.catalog.slice(0, 3).map((product) => (
              <motion.div
                key={product.id}
                className={styles.previewCard}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className={styles.previewImgWrap}>
                  <img src={product.imageUrl} alt={product.name} className={styles.previewImg} />
                  <div className={styles.previewCategory}>{product.category}</div>
                </div>
                <div className={styles.previewInfo}>
                  <span className={styles.previewName}>{product.name}</span>
                  <span className={styles.previewPrice}>from ₪{product.basePrice.toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className={styles.howCta}>
            <a href="#/shop" className={styles.ctaSecondary}>
              View Full Catalog →
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.footerLogo}>✦ ShopTheRoom AI</span>
        <span className={styles.footerCopy}>© 2026 FurniStyle · Powered by Gemini AI × fal.ai</span>
      </footer>
    </div>
  )
}
