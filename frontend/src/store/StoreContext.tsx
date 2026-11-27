import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../admin/auth'
import { useToast } from '../components/ui/Toast'
import { defaultSettings } from '../data/company'
import { api } from '../lib/api'
import { imageFromStored, imageToStored, makeSampleOrders, seedLogoFor, slugify } from './seed'
import type { Brand, Category, Order, OrderCustomerInfo, OrderItem, Product, Settings, Slide, StoreState } from './types'

/**
 * All shared data lives on the Node server (server/index.mjs):
 *  - everyone loads the public catalogue from it;
 *  - customers' orders are posted to it;
 *  - the signed-in admin loads/edits everything and polls for new orders.
 * If the server can't be reached the storefront falls back to the built-in sample catalogue (read-only).
 */

function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  const d = structuredClone(defaultSettings)
  if (!saved) return d
  return {
    business: { ...d.business, ...saved.business },
    // Older saved settings still say "Sign up"; the second hero button now opens "My order".
    hero: { ...d.hero, ...saved.hero, badges: saved.hero?.badges ?? d.hero.badges, secondaryLabel: !saved.hero?.secondaryLabel || saved.hero.secondaryLabel === 'Sign up' ? d.hero.secondaryLabel : saved.hero.secondaryLabel },
    shop: { ...d.shop, ...saved.shop },
    about: { ...d.about, ...saved.about, highlights: saved.about?.highlights ?? d.about.highlights },
    contact: { ...d.contact, ...saved.contact },
    whatsapp: { ...d.whatsapp, ...saved.whatsapp },
  }
}

interface Catalogue {
  products: Product[]
  categories: Category[]
  brands: Brand[]
  slides: Slide[]
  settings: Settings | null
  /** Version of the shop data; sent back on save so two people (or tabs) cannot silently overwrite each other. */
  version?: number
}

/** Server → app: bundled-asset keys become real URLs; blank brand logos get the shipped one when we have it. */
function fromServer(c: Catalogue): Omit<StoreState, 'orders'> {
  return {
    products: c.products.map((p) => ({ ...p, image: imageFromStored(p.image) })),
    categories: c.categories,
    brands: c.brands.map((b) => ({ ...b, logo: imageFromStored(b.logo) || seedLogoFor(b.name) })),
    slides: c.slides.map((x) => ({ ...x, image: imageFromStored(x.image) })),
    settings: mergeSettings(c.settings),
  }
}

/** App → server: bundled asset URLs become stable keys (they change on every build). */
function toServer(s: Omit<StoreState, 'orders'>): Catalogue {
  return {
    products: s.products.map((p) => ({ ...p, image: imageToStored(p.image) })),
    categories: s.categories,
    brands: s.brands.map((b) => ({ ...b, logo: imageToStored(b.logo) })),
    slides: s.slides.map((x) => ({ ...x, image: imageToStored(x.image) })),
    settings: s.settings,
  }
}

const emptyCatalogue = (): Omit<StoreState, 'orders'> => ({
  products: [],
  categories: [],
  brands: [],
  slides: [],
  settings: mergeSettings(null),
})

export interface NewOrder {
  /** One random key per order attempt, re-sent on a retry, so the server never creates the same order twice. */
  key?: string
  items: Pick<OrderItem, 'id' | 'qty'>[]
  customer?: OrderCustomerInfo
}

export interface PlacedOrder {
  id: string
  total: number
}

interface StoreApi extends StoreState {
  /** False until the first load from the server finishes. */
  ready: boolean
  /** True when the server couldn't be reached (storefront shows sample data; ordering is disabled). */
  offline: boolean
  saving: boolean
  saveError: string
  /** Increments whenever new orders arrive while the admin is signed in. */
  newOrders: { seq: number; orders: Order[] }
  saveProduct: (p: Product) => void
  deleteProduct: (id: string) => void
  saveCategory: (c: Category) => void
  /** Returns false when products still use the category. */
  deleteCategory: (id: string) => boolean
  setSlides: (slides: Slide[]) => void
  /** Rename keeps products in sync. */
  saveBrand: (b: Brand) => void
  /** Returns false when products still use the brand. */
  deleteBrand: (id: string) => boolean
  updateSettings: (s: Settings) => void
  /** Customer: place an order on the server. Prices are re-checked there. */
  placeOrder: (o: NewOrder) => Promise<PlacedOrder>
  deleteOrder: (id: string) => void
  refreshOrders: () => Promise<void>
  loadSampleOrders: () => Promise<void>
  clearSampleOrders: () => Promise<void>
  resetAll: () => void
  /** All catalogue and order data as a JSON string (for backups). */
  exportJson: () => Promise<string>
  /** Replace everything from a backup. Returns an error message, or null on success. */
  importJson: (text: string) => Promise<string | null>
}

const Ctx = createContext<StoreApi | null>(null)
const POLL_MS = 10000

export function StoreProvider({ children }: { children: ReactNode }) {
  const { authed } = useAuth()
  const toast = useToast()
  const [cat, setCat] = useState<Omit<StoreState, 'orders'>>(() => ({ products: [], categories: [], brands: [], slides: [], settings: mergeSettings(null) }))
  const [orders, setOrders] = useState<Order[]>([])
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [newOrders, setNewOrders] = useState<{ seq: number; orders: Order[] }>({ seq: 0, orders: [] })
  const dirty = useRef(false)
  const version = useRef<number | undefined>(undefined)
  const known = useRef<Set<string> | null>(null)

  // ---- load: public catalogue for visitors, full state for the signed-in admin
  useEffect(() => {
    if (authed === null) return
    let alive = true
    dirty.current = false
    known.current = null
    ;(async () => {
      try {
        let pub = await api<Catalogue & { seeded: boolean }>('/public')
        if (!pub.seeded) {
          // First run: initialise the server with an empty catalogue so the admin fills it in.
          await api('/bootstrap', { body: toServer(emptyCatalogue()) }).catch(() => {})
          pub = await api<Catalogue & { seeded: boolean }>('/public')
        }
        if (!alive) return
        let data: Catalogue = pub
        if (authed) {
          data = await api<Catalogue>('/admin/state')
          version.current = data.version
          const list = await api<Order[]>('/admin/orders')
          if (!alive) return
          known.current = new Set(list.map((o) => o.id))
          setOrders(list)
        } else {
          setOrders([])
        }
        setCat(fromServer(data))
        setOffline(false)
      } catch {
        if (!alive) return
        setCat(emptyCatalogue())
        setOffline(true)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [authed])

  // ---- admin: save catalogue changes (debounced)
  useEffect(() => {
    if (!authed || !dirty.current) return
    const t = setTimeout(async () => {
      dirty.current = false
      setSaving(true)
      try {
        const out = await api<Pick<Catalogue, 'products' | 'brands' | 'slides' | 'version'>>('/admin/state', { method: 'PUT', body: { ...toServer(cat), version: version.current } })
        if (out.version) version.current = out.version
        // Uploaded images came back as /uploads URLs; swap them in without triggering another save.
        setCat((c) => ({ ...c, products: out.products.map((p) => ({ ...p, image: imageFromStored(p.image) })), brands: out.brands.map((b) => ({ ...b, logo: imageFromStored(b.logo) })), slides: out.slides.map((x) => ({ ...x, image: imageFromStored(x.image) })) }))
        setSaveError('')
        toast.success('Changes saved to server')
      } catch (e) {
        const msg = (e as Error).message || 'Could not save changes'
        setSaveError(msg)
        toast.error(`Save failed: ${msg}`)
      } finally {
        setSaving(false)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [cat, authed, toast])

  const mutate = useCallback((fn: (c: Omit<StoreState, 'orders'>) => Omit<StoreState, 'orders'>) => {
    dirty.current = true
    setCat(fn)
  }, [])

  // ---- admin: poll for new orders
  const refreshOrders = useCallback(async () => {
    if (!authed) return
    try {
      const list = await api<Order[]>('/admin/orders')
      setOrders(list)
      if (known.current) {
        const fresh = list.filter((o) => !known.current!.has(o.id))
        if (fresh.length) setNewOrders((n) => ({ seq: n.seq + 1, orders: fresh }))
      }
      known.current = new Set(list.map((o) => o.id))
    } catch {
      /* keep showing the last data; the next poll will retry */
    }
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const tick = () => document.visibilityState === 'visible' && void refreshOrders()
    const id = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [authed, refreshOrders])

  // ---- catalogue actions
  const saveProduct = useCallback(
    (p: Product) =>
      mutate((c) => ({
        ...c,
        brands: c.brands.some((b) => b.name.toLowerCase() === p.company.toLowerCase()) ? c.brands : [...c.brands, { id: slugify(p.company), name: p.company, logo: '' }],
        products: c.products.some((x) => x.id === p.id) ? c.products.map((x) => (x.id === p.id ? p : x)) : [...c.products, p],
      })),
    [mutate],
  )
  const deleteProduct = useCallback((id: string) => mutate((c) => ({ ...c, products: c.products.filter((p) => p.id !== id) })), [mutate])
  const saveCategory = useCallback(
    (x: Category) => mutate((c) => ({ ...c, categories: c.categories.some((k) => k.id === x.id) ? c.categories.map((k) => (k.id === x.id ? x : k)) : [...c.categories, x] })),
    [mutate],
  )
  const deleteCategory = useCallback(
    (id: string) => {
      if (cat.products.some((p) => p.categoryId === id)) return false
      mutate((c) => ({ ...c, categories: c.categories.filter((k) => k.id !== id) }))
      return true
    },
    [cat.products, mutate],
  )
  const setSlides = useCallback((slides: Slide[]) => mutate((c) => ({ ...c, slides })), [mutate])
  const saveBrand = useCallback(
    (b: Brand) =>
      mutate((c) => {
        const prev = c.brands.find((x) => x.id === b.id)
        return {
          ...c,
          brands: prev ? c.brands.map((x) => (x.id === b.id ? b : x)) : [...c.brands, b],
          products: prev && prev.name !== b.name ? c.products.map((p) => (p.company === prev.name ? { ...p, company: b.name } : p)) : c.products,
        }
      }),
    [mutate],
  )
  const deleteBrand = useCallback(
    (id: string) => {
      const b = cat.brands.find((x) => x.id === id)
      if (!b || cat.products.some((p) => p.company === b.name)) return false
      mutate((c) => ({ ...c, brands: c.brands.filter((x) => x.id !== id) }))
      return true
    },
    [cat.brands, cat.products, mutate],
  )
  const updateSettings = useCallback((settings: Settings) => mutate((c) => ({ ...c, settings })), [mutate])
  const resetAll = useCallback(() => mutate(() => emptyCatalogue()), [mutate])

  // ---- orders
  const placeOrder = useCallback(async (o: NewOrder): Promise<PlacedOrder> => {
    // Only what was ordered is sent: product ids and quantities (plus optional customer details if provided). Prices come from the server's catalogue.
    const r = await api<{ id: string; total: number }>('/orders', {
      body: { items: o.items.map((i) => ({ id: i.id, qty: i.qty })), ...(o.customer ? { customer: o.customer } : {}) },
      headers: o.key ? { 'Idempotency-Key': o.key } : undefined,
    })
    return { id: r.id, total: r.total }
  }, [])

  const deleteOrder = useCallback(
    (id: string) => {
      setOrders((list) => list.filter((o) => o.id !== id))
      api(`/admin/orders/${id}`, { method: 'DELETE', body: {} })
        .then(() => toast.success(`Order ${id} deleted`))
        .catch((e) => {
          toast.error(`Could not delete order: ${(e as Error).message}`)
          void refreshOrders()
        })
    },
    [refreshOrders, toast],
  )
  const loadSampleOrders = useCallback(async () => {
    try {
      const sample = makeSampleOrders(cat.products.filter((p) => p.active))
      const list = await api<Order[]>('/admin/orders/sample', { body: { orders: sample } })
      known.current = new Set(list.map((o) => o.id))
      setOrders(list)
      toast.success('Sample orders loaded')
    } catch (e) {
      toast.error(`Could not load sample orders: ${(e as Error).message}`)
    }
  }, [cat.products, toast])
  const clearSampleOrders = useCallback(async () => {
    try {
      const list = await api<Order[]>('/admin/orders/sample', { method: 'DELETE', body: {} })
      known.current = new Set(list.map((o) => o.id))
      setOrders(list)
      toast.success('Sample orders cleared')
    } catch (e) {
      toast.error(`Could not clear sample orders: ${(e as Error).message}`)
    }
  }, [toast])

  // ---- backup / restore
  const exportJson = useCallback(async () => JSON.stringify(await api('/admin/backup'), null, 2), [])
  const importJson = useCallback(
    async (text: string) => {
      try {
        await api('/admin/restore', { body: JSON.parse(text) })
        const [data, list] = await Promise.all([api<Catalogue>('/admin/state'), api<Order[]>('/admin/orders')])
        version.current = data.version
        known.current = new Set(list.map((o) => o.id))
        setOrders(list)
        setCat(fromServer(data))
        return null
      } catch (e) {
        return e instanceof SyntaxError ? 'That file could not be read. Is it a valid backup (.json)?' : (e as Error).message
      }
    },
    [],
  )

  const value = useMemo<StoreApi>(
    () => ({
      ...cat,
      orders,
      ready,
      offline,
      saving,
      saveError,
      newOrders,
      saveProduct,
      deleteProduct,
      saveCategory,
      deleteCategory,
      setSlides,
      saveBrand,
      deleteBrand,
      updateSettings,
      placeOrder,
      deleteOrder,
      refreshOrders,
      loadSampleOrders,
      clearSampleOrders,
      resetAll,
      exportJson,
      importJson,
    }),
    [cat, orders, ready, offline, saving, saveError, newOrders, saveProduct, deleteProduct, saveCategory, deleteCategory, setSlides, saveBrand, deleteBrand, updateSettings, placeOrder, deleteOrder, refreshOrders, loadSampleOrders, clearSampleOrders, resetAll, exportJson, importJson],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside <StoreProvider>')
  return v
}
