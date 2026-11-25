import { BadgeCheck, ChevronDown, ExternalLink, GalleryHorizontal, Inbox, MessageSquareText, ShieldAlert, UserCog, LayoutDashboard, LogOut, Menu, Moon, Package, Palette, ReceiptText, Settings, Sun, Tags, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useTheme } from '../hooks/useTheme'
import { useStore } from '../store/StoreContext'
import PageLoader from '../components/ui/PageLoader'
import { inr } from './analytics'
import { useAuth } from './auth'
import { usePopover } from './ui/usePopover'
import Avatar from './ui/Avatar'
import { api } from '../lib/api'

/** Poll for unread contact messages count. Returns [unread, refresh]. */
function useUnreadCount(authed: boolean | null): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!authed) return
    const load = () => api<{ unread: number }>('/admin/contacts/unread').then((d) => setCount(d.unread)).catch(() => {})
    void load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [authed])
  return count
}

interface Item { to: string; label: string; Icon: LucideIcon; end?: boolean }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [{ to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true }] },
  { title: 'Sales', items: [{ to: '/admin/orders', label: 'Orders', Icon: ReceiptText }, { to: '/admin/inbox', label: 'Inbox', Icon: Inbox }] },
  { title: 'Catalog', items: [{ to: '/admin/products', label: 'Products', Icon: Package }, { to: '/admin/categories', label: 'Categories', Icon: Tags }, { to: '/admin/brands', label: 'Brands', Icon: BadgeCheck }] },
  { title: 'Website', items: [{ to: '/admin/slider', label: 'Hero slider', Icon: GalleryHorizontal }, { to: '/admin/whatsapp', label: 'WhatsApp message', Icon: MessageSquareText }, { to: '/admin/settings', label: 'Site settings', Icon: Settings }] },
  { title: 'Account', items: [{ to: '/admin/account', label: 'My account', Icon: UserCog }] },
]
const ALL = GROUPS.flatMap((g) => g.items)

export default function AdminLayout() {
  const { authed, logout, profile, prefs, usingDefaults } = useAuth()
  const { settings, saveError, saving, ready, newOrders } = useStore()
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const { theme, setTheme } = useTheme()
  const menu = usePopover<HTMLButtonElement>()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const unreadMessages = useUnreadCount(authed)

  useEffect(() => setOpen(false), [pathname])

  // New order: toast + short beep + browser-tab count.
  useEffect(() => {
    if (!newOrders.seq) return
    const n = newOrders.orders.length
    setToast({ id: newOrders.seq, text: n === 1 ? `New order ${newOrders.orders[0].id} — ${inr(newOrders.orders[0].total)}` : `${n} new orders just came in` })
    try {
      const ctx = new AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      o.connect(g).connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.4)
    } catch {
      /* browsers may block sound until the page has been clicked */
    }
    const t = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(t)
  }, [newOrders])

  useEffect(() => {
    document.title = 'Admin — Raut Traders'
    return () => {
      document.title = 'Raut Traders'
    }
  }, [])

  // Auto sign-out after the chosen idle time (any mouse / key / touch / scroll activity resets it).
  useEffect(() => {
    if (!authed || !prefs.idleMinutes) return
    let t = window.setTimeout(logout, prefs.idleMinutes * 60000)
    const reset = () => {
      window.clearTimeout(t)
      t = window.setTimeout(logout, prefs.idleMinutes * 60000)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      window.clearTimeout(t)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [authed, prefs.idleMinutes, logout])

  if (authed === null || (authed && !ready)) return <PageLoader label="Loading admin panel…" />
  if (!authed) return <Navigate to="/admin/login" replace />

  // Force admin to change their temporary password before accessing anything else
  if (usingDefaults && pathname !== '/admin/account') {
    return <Navigate to="/admin/account" replace />
  }

  const current = ALL.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'Admin'

  return (
    <div className="min-h-screen bg-[#f4f4f7] dark:bg-[#26272b]">
      {/* Temporary-password warning banner — stays visible on every page until changed */}
      {usingDefaults && (
        <div className="sticky top-0 z-[60] flex items-center gap-3 bg-[#c62f2c] px-6 py-2.5 text-[13px] font-semibold text-white max-lg:px-4 max-md:flex-wrap max-md:gap-2 max-md:px-3 max-md:py-2 max-md:text-[12px]">
          <ShieldAlert size={16} aria-hidden className="shrink-0" />
          <span>You are using a temporary password. Change it now to secure your admin panel.</span>
          <Link to="/admin/account" className="ml-auto shrink-0 rounded-lg bg-white/20 px-3 py-1 text-white no-underline hover:bg-white/30 max-md:ml-0">Change password →</Link>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[#ececf0] bg-white transition-transform dark:border-[#45464c] dark:bg-[#2d2e33] lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#ececf0] px-5 dark:border-[#45464c]">
          <img src={logo} alt="" className="logo-outline h-9 w-auto object-contain" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="m-0 truncate text-[15px] font-extrabold text-ink">{settings.business.name}</p>
            <p className="m-0 text-[11px] font-semibold text-muted">Admin panel</p>
          </div>
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink lg:hidden">
            <X size={18} aria-hidden />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="mb-5">
              <p className="m-0 mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{g.title}</p>
              {g.items.map(({ to, label, Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `group mb-0.5 flex items-center gap-3 rounded-xl p-1.5 pr-3 text-[14px] font-semibold no-underline transition-colors ${isActive ? 'bg-brand/10 text-brand dark:bg-brand/20' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors ${isActive ? 'bg-brand text-white shadow-[0_4px_10px_rgba(239,83,80,0.4)]' : 'bg-black/5 text-muted group-hover:text-brand dark:bg-white/10'}`}>
                        <Icon size={18} aria-hidden />
                      </span>
                      {label}
                      {/* Unread badge on Inbox */}
                      {to === '/admin/inbox' && unreadMessages > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[#ececf0] p-3 dark:border-[#45464c]">
          <Link to="/" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand/10 text-[13px] font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-white dark:bg-brand/20">
            <ExternalLink size={15} aria-hidden /> View store
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#ececf0] bg-white/90 px-6 backdrop-blur-md dark:border-[#45464c] dark:bg-[#34353a]/90 max-lg:h-14 max-lg:px-4 max-md:gap-2 max-md:px-3">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink hover:bg-brand/10 max-md:h-9 max-md:w-9 lg:hidden">
            <Menu size={20} aria-hidden />
          </button>
          <h1 className="m-0 text-[17px] font-semibold text-ink max-md:text-[15px]">{current}</h1>
          <div className="ml-auto">
            <button
              ref={menu.anchor}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menu.open}
              onClick={() => menu.setOpen((o) => !o)}
              className={`flex cursor-pointer items-center gap-3 rounded-full border bg-white py-1.5 pl-1.5 pr-3 text-left outline-none transition-colors dark:bg-[#2b2c30] ${menu.open ? 'border-brand' : 'border-[#d8d8df] hover:border-brand/60 dark:border-[#55565d]'}`}
            >
              <Avatar photo={profile.photo} name={profile.name} size={36} />
              <span className="min-w-0 pl-0.5 leading-tight max-md:hidden">
                <span className="block max-w-[190px] truncate text-[13px] font-bold text-ink">{profile.name}</span>
                <span className="block max-w-[190px] truncate text-[11px] text-muted">{profile.email}</span>
              </span>
              <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${menu.open ? 'rotate-180' : ''}`} />
            </button>

            {menu.open &&
              createPortal(
                <div
                  ref={menu.pop}
                  role="menu"
                  aria-label="Account"
                  style={{ position: 'fixed', top: menu.pos.top, bottom: menu.pos.bottom, right: Math.max(12, menu.pos.right) }}
                  className="z-[300] w-[260px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#e3e3e8] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:border-[#55565d] dark:bg-[#34353a]"
                >
                  <div className="flex items-center gap-3 border-b border-[#ececf0] px-4 py-3.5 dark:border-[#45464c]">
                    <Avatar photo={profile.photo} name={profile.name} size={40} />
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[14px] font-extrabold text-ink">{profile.name}</p>
                      <p className="m-0 truncate text-xs text-muted">{profile.email}</p>
                    </div>
                  </div>
                  <div className="border-b border-[#ececf0] p-2 dark:border-[#45464c]">
                    <Link to="/admin/account" role="menuitem" onClick={() => menu.setOpen(false)} className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-ink no-underline transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                      <UserCog size={16} aria-hidden className="text-brand" /> My account
                    </Link>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Palette size={16} aria-hidden className="shrink-0 text-brand" />
                      <span id="theme-label" className="flex-1 text-[13px] font-semibold text-ink">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={theme === 'dark'}
                        aria-labelledby="theme-label"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors ${theme === 'dark' ? 'bg-brand' : 'bg-[#c9c9ce] dark:bg-[#55565d]'}`}
                      >
                        <span className={`absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#6b6c74] shadow transition-transform ${theme === 'dark' ? 'translate-x-5 text-brand' : ''}`}>
                          {theme === 'dark' ? <Moon size={11} aria-hidden /> : <Sun size={11} aria-hidden />}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-[#ececf0] p-2 dark:border-[#45464c]">
                    <button type="button" role="menuitem" onClick={logout} className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl border-0 bg-transparent px-3 text-left text-[13px] font-semibold text-[#c62f2c] transition-colors hover:bg-[#fdeaea] dark:text-[#ff8a87] dark:hover:bg-[#4a2f2f]">
                      <LogOut size={16} aria-hidden /> Sign out
                    </button>
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </header>
        <main className="p-6 max-lg:p-4 max-md:p-3">
          {saveError && (
            <p role="alert" className="mb-4 rounded-xl bg-[#fdeaea] px-4 py-3 text-[13px] font-semibold text-[#c62f2c]">
              Your last change could not be saved to the server ({saveError}). Check your connection — it will retry on your next edit.
            </p>
          )}
          <Outlet />
        </main>
      </div>

      {saving && <span className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-[#e3e3e8] bg-white px-4 py-2 text-[12px] font-semibold text-ink shadow-[0_6px_18px_rgba(0,0,0,0.12)] dark:border-[#45464c] dark:bg-[#34353a] lg:ml-[132px]">Saving…</span>}
      {toast && (
        <div role="status" className="fixed bottom-5 right-5 z-[120] flex max-w-[380px] items-stretch rounded-2xl border border-[#f6c9c7] bg-[#fff1f0] text-ink shadow-[0_12px_32px_rgba(239,83,80,0.28)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] max-sm:left-4 max-sm:right-4 max-sm:max-w-none">
          <Link to="/admin/orders" onClick={() => setToast(null)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-ink no-underline">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_4px_10px_rgba(239,83,80,0.4)]"><ReceiptText size={17} aria-hidden /></span>
            <span className="min-w-0 text-[13px] font-semibold leading-snug">{toast.text}<span className="block text-[11px] font-normal text-muted">Click to open Orders</span></span>
          </Link>
          <button type="button" aria-label="Dismiss notification" title="Dismiss" onClick={() => setToast(null)} className="m-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-start rounded-full border-0 bg-transparent text-muted transition-colors hover:bg-black/10 hover:text-ink dark:hover:bg-white/10">
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
