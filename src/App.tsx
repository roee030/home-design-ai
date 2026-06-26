import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MOCK_TENANT } from '@/constants/mockTenant'
import { useTenant } from '@/hooks/useTenant'
import { HomePage } from '@/pages/HomePage'
import { DesignPage } from '@/pages/DesignPage'
import { ShopPage } from '@/pages/ShopPage'

type Page = 'home' | 'design' | 'shop'

function getPage(): Page {
  const hash = window.location.hash
  if (hash.startsWith('#/design')) return 'design'
  if (hash.startsWith('#/shop'))   return 'shop'
  return 'home'
}

export function App() {
  useTenant(MOCK_TENANT)
  const [page, setPage] = useState<Page>(getPage)

  useEffect(() => {
    const onChange = () => setPage(getPage())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {page === 'home' && (
        <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <HomePage />
        </motion.div>
      )}
      {page === 'design' && (
        <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <DesignPage />
        </motion.div>
      )}
      {page === 'shop' && (
        <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <ShopPage />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
