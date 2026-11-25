import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './admin/auth'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { ToastProvider } from './components/ui/Toast'
import AdminLayout from './admin/AdminLayout'
import AccountPage from './admin/pages/AccountPage'
import BrandsPage from './admin/pages/BrandsPage'
import CategoriesPage from './admin/pages/CategoriesPage'
import DashboardPage from './admin/pages/DashboardPage'
import LoginPage from './admin/pages/LoginPage'
import OrdersPage from './admin/pages/OrdersPage'
import ProductsPage from './admin/pages/ProductsPage'
import WhatsAppPage from './admin/pages/WhatsAppPage'
import SlidesPage from './admin/pages/SlidesPage'
import SettingsPage from './admin/pages/SettingsPage'
import InboxPage from './admin/pages/InboxPage'
import { StoreProvider } from './store/StoreContext'
import { blockFramedPage, isFramed, purgeLegacyStorage } from './lib/legacy'

purgeLegacyStorage()

if (isFramed()) {
  blockFramedPage()
} else {
  mount()
}

function mount() {
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <StoreProvider>
          <ConfirmProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
              <Route path="slider" element={<SlidesPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="inbox" element={<InboxPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ConfirmProvider>
        </StoreProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
}
