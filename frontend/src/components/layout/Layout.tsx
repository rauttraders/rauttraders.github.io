import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from '../Navbar/Navbar'
import type { NavItem } from '../Navbar/NavigationLinks'
import { getCompanies } from '../../data/catalog'
import { useCart } from '../../context/CartContext'
import WhatsAppBar from './WhatsAppBar'

const navItems: NavItem[] = getCompanies()
  .slice(0, 6)
  .map((c) => ({ label: c.name, href: `/products?company=${c.id}` }))

export default function Layout() {
  const navigate = useNavigate()
  const { itemCount } = useCart()
  return (
    <>
      <Navbar
        items={navItems}
        cartCount={itemCount}
        onLogoClick={() => navigate('/')}
        onNavigate={(item) => navigate(item.href)}
        onSearch={(q) => navigate(`/products?q=${encodeURIComponent(q)}`)}
        onBag={() => navigate('/cart')}
      />
      <main className="mx-auto min-h-[calc(100vh-48px)] max-w-[1200px] px-4 pb-28 pt-6 md:px-10">
        <Outlet />
      </main>
      <WhatsAppBar />
    </>
  )
}
