import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import PromoModal from './components/PromoModal/PromoModal'
import { useStore } from './store/StoreContext'
import ShopSection from './components/Shop/ShopSection'
import AboutSection from './components/About/AboutSection'
import ContactSection from './components/Contact/ContactSection'
import OrderModal from './components/Order/OrderModal'
import FloatingActions from './components/ui/FloatingActions'
import PageLoader from './components/ui/PageLoader'
import Footer from './components/Footer/Footer'
import { useShopCart } from './hooks/useShopCart'
import { useLanguage } from './hooks/useLanguage'
import { useTheme } from './hooks/useTheme'

const scrollToShop = () => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function App() {
  const { products: allProducts, ready } = useStore()
  const [showLoader, setShowLoader] = useState(!ready)
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setShowLoader(false), 300)
    return () => window.clearTimeout(t)
  }, [ready])
  const showcaseProducts = useMemo(() => allProducts.filter((p) => p.active), [allProducts])
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { qtys, setQty, itemCount } = useShopCart()
  const [query, setQuery] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [myOrderOpen, setMyOrderOpen] = useState(false)

  const basketItems = useMemo(
    () =>
      showcaseProducts
        .filter((p) => (qtys[p.id] ?? 0) > 0)
        .map((p) => ({ id: p.id, name: p.name, company: p.company, size: p.size, price: p.price, qty: qtys[p.id], image: p.image, isLogo: p.isLogo, mrp: p.mrp })),
    [qtys, showcaseProducts],
  )
  const removeFromBasket = useCallback((id: string) => setQty(id, 0), [setQty])

  const onSearch = useCallback((q: string) => {
    setQuery(q)
    scrollToShop()
  }, [])

  return (
    <>
      {showLoader && <PageLoader overlay visible={!ready} label="Loading catalogue…" />}
      <Navbar theme={theme} onThemeChange={setTheme} language={language} onLanguageChange={setLanguage} searchQuery={query} onSearchChange={setQuery} onSearch={onSearch} cartCount={itemCount} basketItems={basketItems} onRemoveItem={removeFromBasket} onQtyChange={setQty} onBag={scrollToShop} onCheckout={() => setOrdering(true)} basketOpen={myOrderOpen} onBasketOpenChange={setMyOrderOpen} />
      <main>
        <PromoModal onPrimary={scrollToShop} onSecondary={() => setMyOrderOpen(true)} />
        <ShopSection query={query} qtys={qtys} onQty={setQty} />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingActions />
      {ordering && basketItems.length > 0 && (
        <OrderModal
          items={basketItems}
          onClose={() => setOrdering(false)}
          onSent={() => {
            basketItems.forEach((i) => setQty(i.id, 0))
            setOrdering(false)
          }}
        />
      )}
    </>
  )
}
