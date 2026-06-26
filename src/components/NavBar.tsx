import styles from './NavBar.module.css'

type Page = 'home' | 'design' | 'shop'

interface Props {
  active?: Page
}

export function NavBar({ active }: Props) {
  return (
    <header className={styles.nav}>
      <a href="#/" className={styles.logo}>
        <span className={styles.mark}>✦</span>
        ShopTheRoom<span className={styles.ai}> AI</span>
      </a>

      <nav className={styles.links}>
        <a href="#/" className={`${styles.link} ${active === 'home' ? styles.linkActive : ''}`}>
          Home
        </a>
        <a href="#/design" className={`${styles.link} ${active === 'design' ? styles.linkActive : ''}`}>
          Design
        </a>
        <a href="#/shop" className={`${styles.link} ${active === 'shop' ? styles.linkActive : ''}`}>
          Shop
        </a>
      </nav>

      <a href="#/design" className={styles.cta}>
        Start Designing
      </a>

      <span className={styles.version} title="Build version">
        {__GIT_HASH__}
      </span>
    </header>
  )
}
