import { Crop, EyeOff, Eye, ImagePlus, LayoutGrid, List, Package, Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useStore } from '../../store/StoreContext'
import type { Product } from '../../store/types'
import { CROP_PRESETS } from '../imageTools'
import ImageCropDialog from '../ui/ImageCropDialog'
import { btnDanger, btnPrimary, btnSoft, iconBtn } from '../ui/Card'
import { Checkbox, SelectInput, TextArea, TextInput, Toggle } from '../ui/Inputs'
import Select from '../ui/Select'
import Modal from '../ui/Modal'
import { validatePrice, validateText } from '../../lib/validation'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'product'

interface Draft {
  id: string | null
  name: string
  company: string
  categoryId: string
  description: string
  size: string
  price: string
  mrp: string
  image: string
  isLogo: boolean
  active: boolean
}

const toDraft = (p: Product | null, categoryId: string): Draft =>
  p
    ? { id: p.id, name: p.name, company: p.company, categoryId: p.categoryId, description: p.description, size: p.size, price: String(p.price), mrp: p.mrp ? String(p.mrp) : '', image: p.image, isLogo: !!p.isLogo, active: p.active }
    : { id: null, name: '', company: '', categoryId, description: '', size: '', price: '', mrp: '', image: '', isLogo: false, active: true }

function ProductForm({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const { categories, brands, products, saveProduct } = useStore()
  const [d, setD] = useState<Draft>(() => toDraft(initial, categories[0]?.id ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const NEW = '__new__'
  const [brandPick, setBrandPick] = useState(() => (initial && brands.some((b) => b.name === initial.company) ? initial.company : initial ? NEW : ''))
  const brandNames = useMemo(() => brands.map((b) => b.name).sort(), [brands])

  const [cropSrc, setCropSrc] = useState<File | string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    const price = Number(d.price)
    const mrp = d.mrp.trim() ? Number(d.mrp) : undefined
    if (!d.name.trim()) err.name = 'Enter a product name'
    if (!d.company.trim()) err.company = 'Pick a brand or add a new one'
    if (!d.categoryId) err.categoryId = 'Pick a category (add one first if none exist)'
    if (!d.size.trim()) err.size = 'Enter the pack size'
    if (!err.name) err.name = validateText(d.name, 200, 'Product name') ?? ''
    if (!err.company) err.company = validateText(d.company, 120, 'Brand') ?? ''
    if (!err.size) err.size = validateText(d.size, 60, 'Pack size') ?? ''
    err.description = validateText(d.description, 1000, 'Description') ?? ''
    err.price = validatePrice(price, 'Price') ?? ''
    if (mrp !== undefined) err.mrp = validatePrice(mrp, 'MRP') ?? (mrp > price ? '' : 'MRP must be higher than the price (or leave empty)')
    for (const k of Object.keys(err)) if (!err[k]) delete err[k]
    setErrors(err)
    if (Object.keys(err).length) return
    let id = d.id
    if (!id) {
      const base = slug(`${d.company}-${d.name}`)
      id = base
      for (let n = 2; products.some((p) => p.id === id); n++) id = `${base}-${n}`
    }
    saveProduct({ id, name: d.name.trim(), company: d.company.trim(), categoryId: d.categoryId, description: d.description.trim(), size: d.size.trim(), price, mrp, image: d.image, isLogo: d.isLogo || undefined, active: d.active })
    onClose()
  }

  return (
    <Modal title={initial ? 'Edit product' : 'Add product'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <TextInput label="Product name" value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoFocus />
          <div className="flex flex-col gap-2">
            <SelectInput label="Brand" placeholder="Select a brand…" value={brandPick} error={brandPick === NEW ? undefined : errors.company} onChange={(v) => { setBrandPick(v); set('company', v === NEW ? '' : v) }} options={[...brandNames.map((b) => ({ value: b, label: b })), { value: NEW, label: '+ New brand…' }]} />
            {brandPick === NEW && <TextInput label="New brand name" value={d.company} onChange={(e) => set('company', e.target.value)} error={errors.company} placeholder="Brand name (added to Brands)" />}
          </div>
          <SelectInput label="Category" value={d.categoryId} error={errors.categoryId} onChange={(v) => set('categoryId', v)} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select a category…" />
          <TextInput label="Pack size" value={d.size} onChange={(e) => set('size', e.target.value)} error={errors.size} placeholder="e.g. 70 g" />
          <TextInput label="Price (₹)" type="number" min="0" step="any" value={d.price} onChange={(e) => set('price', e.target.value)} error={errors.price} />
          <TextInput label="MRP (₹), optional" type="number" min="0" step="any" value={d.mrp} onChange={(e) => set('mrp', e.target.value)} error={errors.mrp} hint="Shown struck through when higher than the price." />
        </div>
        <TextArea label="Description" value={d.description} onChange={(e) => set('description', e.target.value)} error={errors.description} />

        <div>
          <span className="text-xs font-semibold text-muted">Image</span>
          <div className="mt-1.5 flex items-center gap-4">
            <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff4f4] dark:bg-[#3a2e2e]">
              {d.image ? <img src={d.image} alt="" className="h-full w-full object-contain p-1.5" /> : <ImagePlus size={26} className="text-muted" aria-hidden />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${btnSoft} !h-9`}>
                Upload image
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropSrc(f); e.target.value = '' }} />
              </label>
              {d.image && <button type="button" className={`${btnSoft} !h-9`} onClick={() => setCropSrc(d.image)}><Crop size={15} aria-hidden /> Adjust</button>}
              {d.image && <button type="button" className={`${btnDanger} !h-9 !px-4`} onClick={() => set('image', '')}>Remove</button>}
            </div>
          </div>
          <div className="mt-3"><Checkbox checked={d.isLogo} onChange={(v) => set('isLogo', v)} label="This image is a company logo (shown smaller with a sticker outline)" /></div>
        </div>

        <Toggle checked={d.active} onChange={(v) => set('active', v)} label="Visible on the store" />
        <div className="flex justify-end gap-2 border-t border-[#ececf0] pt-4 dark:border-[#45464c]">
          <button type="button" className={btnSoft} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>{initial ? 'Save changes' : 'Add product'}</button>
        </div>
      </form>
      {cropSrc && <ImageCropDialog src={cropSrc} preset={d.isLogo ? CROP_PRESETS.logo : CROP_PRESETS.product} onCancel={() => setCropSrc(null)} onApply={(url) => { set('image', url); setCropSrc(null) }} />}
    </Modal>
  )
}

type View = 'grid' | 'list'
type Vis = 'all' | 'on' | 'off'
const VIEW_KEY = 'rt-admin-products-view'

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Package; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ececf0] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-md:gap-2.5 max-md:rounded-xl max-md:px-3 max-md:py-2.5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl max-md:h-9 max-md:w-9 ${tone}`}><Icon size={18} aria-hidden /></span>
      <div className="min-w-0 leading-tight">
        <p className="m-0 text-[22px] font-extrabold text-ink max-md:text-[18px]">{value}</p>
        <p className="m-0 text-xs font-semibold text-muted max-md:text-[11px]">{label}</p>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const confirm = useConfirm()
  const { products, categories, brands, saveProduct, deleteProduct } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [brand, setBrand] = useState('')
  const [vis, setVis] = useState<Vis>('all')
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [editing, setEditing] = useState<{ p: Product | null } | null>(null)

  const changeView = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* the choice just isn't remembered */
    }
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'
  const logoOf = useMemo(() => new Map(brands.map((b) => [b.name, b.logo])), [brands])
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return products.filter(
      (p) => (!cat || p.categoryId === cat) && (!brand || p.company === brand) && (vis === 'all' || (vis === 'on' ? p.active : !p.active)) && (!t || `${p.name} ${p.company}`.toLowerCase().includes(t)),
    )
  }, [products, q, cat, brand, vis])
  const visible = products.filter((p) => p.active).length
  const filtered = !!(q || cat || brand || vis !== 'all')

  const remove = async (p: Product) => {
    if (await confirm({ tone: 'danger', title: 'Delete this product?', message: 'It disappears from the shop. Past orders keep their details.', details: [{ label: 'Product', value: p.name }, { label: 'Brand', value: p.company }, { label: 'Price', value: inr(p.price) }], confirmLabel: 'Yes, delete product' })) deleteProduct(p.id)
  }

  const actions = (p: Product) => (
    <div className="flex shrink-0 items-center">
      <button type="button" aria-label={`Edit ${p.name}`} title="Edit" className={iconBtn} onClick={() => setEditing({ p })}><Pencil size={16} aria-hidden /></button>
      <button type="button" aria-label={`Delete ${p.name}`} title="Delete" className={iconBtn} onClick={() => void remove(p)}><Trash2 size={16} aria-hidden /></button>
    </div>
  )
  const thumb = (p: Product, cls: string) =>
    p.image ? <img src={p.image} alt="" draggable={false} className={`${cls} ${p.isLogo ? 'logo-outline p-2' : 'p-1'}`} /> : <ImagePlus size={20} className="text-muted" aria-hidden />
  const priceEl = (p: Product) => (
    <span className="whitespace-nowrap font-extrabold text-brand">
      {inr(p.price)}
      {p.mrp ? <span className="ml-1.5 text-xs font-normal text-muted line-through">{inr(p.mrp)}</span> : null}
    </span>
  )

  const seg = (on: boolean) => `h-8 cursor-pointer rounded-full border-0 px-3.5 text-[12px] font-semibold transition-colors ${on ? 'bg-brand text-white shadow-[0_3px_8px_rgba(239,83,80,0.4)]' : 'bg-transparent text-muted hover:text-ink'}`

  return (
    <div className="flex w-full flex-col gap-5 max-md:gap-3.5">
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:gap-2.5">
        <Stat icon={Package} label="Total products" value={products.length} tone="bg-brand/10 text-brand dark:bg-brand/20" />
        <Stat icon={Eye} label="Visible in shop" value={visible} tone="bg-[#dff5e8] text-[#1c6b3c] dark:bg-[#1d3a2a] dark:text-[#7fd6a1]" />
        <Stat icon={EyeOff} label="Hidden" value={products.length - visible} tone="bg-[#eeeef1] text-[#5b5c64] dark:bg-[#45464c] dark:text-[#c9c9ce]" />
        <Stat icon={Tags} label="Categories" value={categories.length} tone="bg-[#e3effd] text-[#17519c] dark:bg-[#1c3350] dark:text-[#8fbcf5]" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#ececf0] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none">
        <label className="relative block min-w-[220px] flex-1">
          <Search size={15} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or brands" aria-label="Search products" className="h-10 w-full rounded-full border border-transparent bg-[#f3f3f6] pl-10 pr-4 text-[13px] text-ink outline-none transition-colors focus:border-brand focus:bg-white dark:bg-[#2b2c30] dark:focus:bg-[#2b2c30]" />
        </label>
        <Select variant="pill" ariaLabel="Filter by category" value={cat} onChange={setCat} options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} className="[&>button]:bg-[#f3f3f6] dark:[&>button]:bg-[#2b2c30]" />
        <Select variant="pill" ariaLabel="Filter by brand" value={brand} onChange={setBrand} options={[{ value: '', label: 'All brands' }, ...brands.map((b) => ({ value: b.name, label: b.name }))]} className="[&>button]:bg-[#f3f3f6] dark:[&>button]:bg-[#2b2c30]" />
        <div role="group" aria-label="Filter by visibility" className="flex gap-0.5 rounded-full bg-[#f3f3f6] p-1 dark:bg-[#2b2c30]">
          {([['all', 'All'], ['on', 'Visible'], ['off', 'Hidden']] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={vis === v} onClick={() => setVis(v)} className={seg(vis === v)}>{label}</button>)}
        </div>
        <div role="group" aria-label="Layout" className="flex gap-0.5 rounded-full bg-[#f3f3f6] p-1 dark:bg-[#2b2c30]">
          <button type="button" aria-label="Grid view" title="Grid view" aria-pressed={view === 'grid'} onClick={() => changeView('grid')} className={`${seg(view === 'grid')} flex w-9 items-center justify-center !px-0`}><LayoutGrid size={15} aria-hidden /></button>
          <button type="button" aria-label="List view" title="List view" aria-pressed={view === 'list'} onClick={() => changeView('list')} className={`${seg(view === 'list')} flex w-9 items-center justify-center !px-0`}><List size={15} aria-hidden /></button>
        </div>
        <button type="button" className={`${btnPrimary} max-md:w-full`} onClick={() => setEditing({ p: null })}><Plus size={16} aria-hidden /> Add product</button>
      </div>

      <div className="-mt-1 flex items-center justify-between gap-3 px-1 text-[13px] text-muted">
        <span>Showing <b className="text-ink">{rows.length}</b> of {products.length} {products.length === 1 ? 'product' : 'products'}</span>
        {filtered && <button type="button" onClick={() => { setQ(''); setCat(''); setBrand(''); setVis('all') }} className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[13px] font-semibold text-brand hover:underline"><X size={14} aria-hidden /> Clear filters</button>}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-16 text-center dark:bg-[#34353a]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand"><Package size={28} aria-hidden /></span>
          <p className="m-0 text-[15px] font-semibold text-ink">{products.length === 0 ? 'No products yet' : 'No products match these filters'}</p>
          <p className="m-0 text-[13px] text-muted">{products.length === 0 ? 'Add your first product to show it in the shop.' : 'Try a different search or clear the filters.'}</p>
        </div>
      ) : view === 'grid' ? (
        <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-2xl:grid-cols-3 max-lg:grid-cols-2 max-md:gap-2.5">
          {rows.map((p) => (
            <li key={p.id} className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#ececf0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_rgba(239,83,80,0.14)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-md:rounded-xl ${p.active ? '' : 'opacity-75'}`}>
              <div className="relative flex h-[160px] items-center justify-center bg-gradient-to-b from-cream to-white dark:from-[#3d3e44] dark:to-[#34353a] max-md:h-[150px]">
                <span className="absolute left-3 top-3 z-10 inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#c62f2c] shadow-sm backdrop-blur dark:bg-[#2b2c30]/90 dark:text-[#ff8a87] max-md:left-2 max-md:top-2 max-md:px-2 max-md:py-0.5 max-md:text-[10px]">
                  {logoOf.get(p.company) ? <img src={logoOf.get(p.company)} alt="" draggable={false} className="logo-outline h-4 w-auto max-w-[40px] shrink-0 object-contain" /> : null}
                  <span className="truncate">{p.company}</span>
                </span>
                {!p.active && <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#1f2023]/80 px-2.5 py-1 text-[11px] font-bold text-white max-md:right-2 max-md:top-2 max-md:px-2 max-md:py-0.5 max-md:text-[10px]"><EyeOff size={12} aria-hidden /> Hidden</span>}
                {p.image ? (
                  <img src={p.image} alt="" draggable={false} className={p.isLogo ? 'logo-outline mt-5 max-h-[84px] w-[62%] object-contain transition-transform duration-300 group-hover:scale-105 max-md:max-h-[96px] max-md:w-[70%]' : 'h-full w-full object-contain p-1 pt-9 transition-transform duration-300 group-hover:scale-105 max-md:px-1.5 max-md:pb-1.5 max-md:pt-7'} />
                ) : (
                  <ImagePlus size={26} className="text-muted" aria-hidden />
                )}
              </div>
              <div className="flex flex-1 flex-col p-4 max-md:p-2.5">
                <h3 className="m-0 truncate text-[15px] font-semibold text-ink max-md:text-[13px]" title={p.name}>{p.name}</h3>
                <p className="m-0 mt-0.5 truncate text-xs text-muted max-md:text-[11px]">{p.size} · {catName(p.categoryId)}</p>
                <p className="mb-0 mt-2 text-[19px] max-md:mt-1.5 max-md:text-[15px]">{priceEl(p)}</p>
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#ececf0] pt-3 dark:border-[#45464c] max-md:mt-2.5 max-md:gap-1 max-md:pt-2">
                  <Toggle checked={p.active} onChange={(v) => saveProduct({ ...p, active: v })} label={p.active ? 'Visible' : 'Hidden'} />
                  {actions(p)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {rows.map((p) => (
            <li key={p.id} className={`grid items-center gap-x-4 gap-y-1 rounded-2xl border border-[#ececf0] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-brand/40 dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none grid-cols-[56px_minmax(0,1fr)_auto] lg:grid-cols-[56px_minmax(0,2fr)_minmax(0,1.3fr)_110px_130px_auto] ${p.active ? '' : 'opacity-75'}`}>
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#fff4f4] dark:bg-[#3a2e2e]">{thumb(p, 'h-full w-full object-contain')}</span>
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-2 truncate text-[14px] font-semibold text-ink">
                  <span className="truncate">{p.name}</span>
                  {!p.active && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eeeef1] px-2 py-0.5 text-[10.5px] font-bold text-[#5b5c64] dark:bg-[#45464c] dark:text-[#c9c9ce]"><EyeOff size={11} aria-hidden /> Hidden</span>}
                </p>
                <p className="m-0 mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                  {logoOf.get(p.company) ? <img src={logoOf.get(p.company)} alt="" draggable={false} className="logo-outline h-3.5 w-auto max-w-[34px] shrink-0 object-contain" /> : null}
                  <span className="truncate">{p.company} · {p.size}</span>
                </p>
                <p className="m-0 mt-1 text-[14px] lg:hidden">{priceEl(p)} <span className="text-xs text-muted">· {catName(p.categoryId)}</span></p>
              </div>
              <span className="hidden min-w-0 truncate lg:block"><span className="inline-block max-w-full truncate rounded-full bg-brand/10 px-3 py-1 text-[12px] font-semibold text-[#c62f2c] dark:bg-brand/20 dark:text-[#ff8a87]">{catName(p.categoryId)}</span></span>
              <span className="hidden text-[15px] lg:block">{priceEl(p)}</span>
              <span className="hidden lg:block"><Toggle checked={p.active} onChange={(v) => saveProduct({ ...p, active: v })} label={p.active ? 'Visible' : 'Hidden'} /></span>
              <div className="flex items-center gap-1">
                <span className="lg:hidden"><Toggle checked={p.active} onChange={(v) => saveProduct({ ...p, active: v })} label="" /></span>
                {actions(p)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <ProductForm initial={editing.p} onClose={() => setEditing(null)} />}
    </div>
  )
}
