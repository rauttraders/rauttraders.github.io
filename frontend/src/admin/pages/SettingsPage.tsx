import { Check, Database, GalleryHorizontal, Info, LayoutTemplate, LocateFixed, RotateCcw, Save, Store } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { defaultSettings } from '../../data/company'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useStore } from '../../store/StoreContext'
import type { HighlightIcon, Settings } from '../../store/types'
import { Card, PanelHeader, btnDanger, btnPrimary, btnSoft } from '../ui/Card'
import { SelectInput, TextArea, TextInput, IndiaPhoneInput } from '../ui/Inputs'

const ICONS: { value: HighlightIcon; label: string }[] = [
  { value: 'shield', label: 'Shield (trust)' },
  { value: 'layers', label: 'Layers (range)' },
  { value: 'truck', label: 'Truck (delivery)' },
  { value: 'handshake', label: 'Handshake (support)' },
]

export default function SettingsPage() {
  const confirm = useConfirm()
  const { settings, updateSettings, resetAll, clearSampleOrders, orders } = useStore()
  const [d, setD] = useState<Settings>(() => structuredClone(settings))
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const dirty = JSON.stringify(d) !== JSON.stringify(settings)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saved])

  const up = <S extends keyof Settings>(section: S, patch: Partial<Settings[S]>) => {
    setD((x) => ({ ...x, [section]: { ...x[section], ...patch } }))
    setSaved(false)
  }

  const save = () => {
    const errs: string[] = []
    const b = d.business
    if (!b.name.trim()) errs.push('Business name is required.')
    // WhatsApp and map location are optional — warn only if partially filled
    if (b.whatsappNumber.trim() && b.whatsappNumber.replace(/\D/g, '').length < 10) errs.push('WhatsApp number must include the country code (e.g. 919876543210).')
    const hasLat = Number.isFinite(b.lat) && Math.abs(b.lat) <= 90
    const hasLng = Number.isFinite(b.lng) && Math.abs(b.lng) <= 180
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) errs.push('Enter both latitude and longitude, or leave both empty.')
    if ((hasLat && hasLng) && (Math.abs(b.lat) > 90 || Math.abs(b.lng) > 180)) errs.push('Map latitude / longitude are not valid numbers.')
    if (!(d.about.foundedYear >= 1900 && d.about.foundedYear <= new Date().getFullYear())) errs.push('Founded year is not valid.')
    setErrors(errs)
    if (errs.length) return
    const next = structuredClone(d)
    if (!hasLat || !hasLng) {
      delete (next.business as { lat?: number }).lat
      delete (next.business as { lng?: number }).lng
    }
    updateSettings(next)
    setSaved(true)
  }

  const num = (v: string) => (v.trim() === '' ? NaN : Number(v))
  const sampleCount = orders.filter((o) => o.sample).length

  // ── Geolocation ─────────────────────────────────────────────────────────────
  type GeoState = 'idle' | 'loading' | 'denied' | 'unavailable'
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const useDeviceLocation = () => {
    if (!navigator.geolocation) { setGeoState('unavailable'); return }
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeoState('idle')
        up('business', {
          lat: parseFloat(coords.latitude.toFixed(6)),
          lng: parseFloat(coords.longitude.toFixed(6)),
        })
        // briefly flash success, then auto-clear
        setSaved(false)
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
        geoTimer.current = setTimeout(() => setGeoState('idle'), 4000)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  useEffect(() => () => { if (geoTimer.current) clearTimeout(geoTimer.current) }, [])

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5 pb-24 max-sm:pb-36">
      <Card>
        <PanelHeader icon={Store} title="Business details" subtitle="Shown in the navbar, About section, footer and used for WhatsApp orders and the map." />
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <TextInput label="Business name" value={d.business.name} onChange={(e) => up('business', { name: e.target.value })} />
          <IndiaPhoneInput label="WhatsApp number" value={d.business.whatsappNumber} onValueChange={(v) => up('business', { whatsappNumber: v })} hint="10-digit number after +91. Orders are sent here." />
          <TextArea wrapClass="col-span-2 max-sm:col-span-1" label="Tagline (footer)" rows={2} value={d.business.tagline} onChange={(e) => up('business', { tagline: e.target.value })} />
          <TextArea wrapClass="col-span-2 max-sm:col-span-1" label="Address" rows={2} value={d.business.address} onChange={(e) => up('business', { address: e.target.value })} />
          <IndiaPhoneInput label="Phone" value={d.business.phone} onValueChange={(v) => up('business', { phone: v })} />
          <TextInput label="Email" type="email" value={d.business.email} onChange={(e) => up('business', { email: e.target.value })} />
          <TextInput wrapClass="col-span-2 max-sm:col-span-1" label="Opening hours" value={d.business.hours} onChange={(e) => up('business', { hours: e.target.value })} />
          {/* ── Map location ── */}
          <TextInput label="Map latitude" type="number" step="any" value={d.business.lat == null || Number.isNaN(d.business.lat) ? '' : d.business.lat} onChange={(e) => up('business', { lat: num(e.target.value) })} hint="Right-click your shop in Google Maps and click the numbers." />
          <TextInput label="Map longitude" type="number" step="any" value={d.business.lng == null || Number.isNaN(d.business.lng) ? '' : d.business.lng} onChange={(e) => up('business', { lng: num(e.target.value) })} />
          <div className="col-span-2 max-sm:col-span-1 flex flex-col gap-1.5">
            <button
              type="button"
              disabled={geoState === 'loading'}
              onClick={useDeviceLocation}
              className="inline-flex h-[44px] w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-brand bg-brand/5 px-4 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand/10"
            >
              {geoState === 'loading' ? 'Detecting…' : 'Use my device location'}
              <span aria-hidden className="h-4 w-px shrink-0 bg-current opacity-30" />
              <LocateFixed size={15} aria-hidden className={geoState === 'loading' ? 'animate-pulse' : ''} />
            </button>
            {geoState === 'denied' && (
              <p className="text-[11px] text-[#c62f2c]">
                Location access was denied. Allow it in your browser settings and try again.
              </p>
            )}
            {geoState === 'unavailable' && (
              <p className="text-[11px] text-[#c62f2c]">
                Geolocation is not available on this device or browser.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <PanelHeader icon={GalleryHorizontal} title="Home page hero" subtitle="Main banner headline, description and action buttons" />
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <TextInput label="Headline — first line" value={d.hero.line1} onChange={(e) => up('hero', { line1: e.target.value })} />
          <TextInput label="Headline — second line" value={d.hero.line2} onChange={(e) => up('hero', { line2: e.target.value })} />
          <TextInput label="Highlighted word" value={d.hero.highlight} onChange={(e) => up('hero', { highlight: e.target.value })} hint="Shown in the red gradient at the end of the headline." />
          <div />
          <TextArea wrapClass="col-span-2 max-sm:col-span-1" label="Description" value={d.hero.description} onChange={(e) => up('hero', { description: e.target.value })} />
          <TextInput label="Primary button label" value={d.hero.primaryLabel} onChange={(e) => up('hero', { primaryLabel: e.target.value })} />
          <TextInput label="Second button label" value={d.hero.secondaryLabel} onChange={(e) => up('hero', { secondaryLabel: e.target.value })} hint="Opens the visitor’s My order page." />
        </div>
      </Card>

      <Card>
        <PanelHeader icon={LayoutTemplate} title="Section text" subtitle="Headings and intro lines for the Shop and Contact sections" />
        <div className="grid grid-cols-1 gap-4">
          <TextInput label="Shop section — title" value={d.shop.title} onChange={(e) => up('shop', { title: e.target.value })} />
          <TextArea label="Shop section — text" rows={2} value={d.shop.text} onChange={(e) => up('shop', { text: e.target.value })} />
          <TextInput label="Contact section — title" value={d.contact.title} onChange={(e) => up('contact', { title: e.target.value })} />
          <TextArea label="Contact section — text" rows={2} value={d.contact.text} onChange={(e) => up('contact', { text: e.target.value })} />
        </div>
      </Card>

      <Card>
        <PanelHeader icon={Info} title="About us" subtitle="Company story, founding year and highlight cards" />
        <div className="grid grid-cols-1 gap-4">
          <TextInput label="Title" value={d.about.title} onChange={(e) => up('about', { title: e.target.value })} />
          <TextArea label="Intro paragraph" rows={4} value={d.about.intro} onChange={(e) => up('about', { intro: e.target.value })} />
          <TextInput wrapClass="max-w-[200px]" label="Year founded" type="number" value={d.about.foundedYear} onChange={(e) => up('about', { foundedYear: Number(e.target.value) })} hint="“Years” in the stats row is calculated from this. Brands and products are counted from the catalogue." />
        </div>
        <p className="mb-3 mt-6 text-xs font-semibold text-muted">Highlight cards</p>
        <div className="flex flex-col gap-4">
          {d.about.highlights.map((h, i) => {
            const set = (patch: Partial<typeof h>) => up('about', { highlights: d.about.highlights.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <div key={i} className="grid grid-cols-[170px_1fr] gap-3 rounded-xl bg-[#faf7f7] p-3.5 dark:bg-[#2b2c30] max-sm:grid-cols-1">
                <SelectInput label="Icon" value={h.icon} onChange={(v) => set({ icon: v as HighlightIcon })} options={ICONS} />
                <div className="flex flex-col gap-3">
                  <TextInput label="Title" value={h.title} onChange={(e) => set({ title: e.target.value })} />
                  <TextArea label="Text" rows={2} value={h.text} onChange={(e) => set({ text: e.target.value })} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <PanelHeader icon={Database} title="Data" subtitle="Changes here are saved on the shop's server and appear for every customer. Customer orders are kept and are not affected by a reset." />
        <div className="flex flex-wrap gap-3">
          {sampleCount > 0 && <button type="button" className={btnSoft} onClick={async () => { if (await confirm({ tone: 'warning', title: 'Remove the sample orders?', message: 'Only the made-up demo orders are removed. Real customer orders are kept.', details: [{ label: 'Sample orders', value: sampleCount }], confirmLabel: 'Remove sample orders' })) void clearSampleOrders() }}>Clear {sampleCount} sample orders</button>}
          <button type="button" className={btnDanger} onClick={async () => { if (await confirm({ tone: 'danger', title: 'Reset the shop catalogue and text?', message: 'Products, categories, brands, slides and all website text go back to the original defaults. This cannot be undone.', details: [{ label: 'Customer orders', value: 'Kept' }, { label: 'Admin login', value: 'Kept' }], confirmLabel: 'Yes, reset everything' })) { resetAll(); setD(structuredClone(defaultSettings)); setErrors([]) } }}>Reset catalogue &amp; text <span aria-hidden className="h-4 w-px shrink-0 bg-current opacity-30" /> <RotateCcw size={15} aria-hidden /></button>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ececf0] bg-white/95 px-6 py-3 backdrop-blur dark:border-[#45464c] dark:bg-[#34353a]/95 max-sm:px-4 max-sm:py-2.5 lg:pl-[274px]">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-3 max-sm:gap-2">
          <div className="min-w-0 flex-1 text-[13px] max-sm:max-h-[64px] max-sm:w-full max-sm:flex-none max-sm:overflow-y-auto max-sm:text-xs">
            {errors.length > 0 ? <ul role="alert" className="m-0 list-none p-0 font-semibold text-[#c62f2c]">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
              : saved ? <span className="inline-flex items-center gap-1.5 font-semibold text-[#1c6b3c] dark:text-[#7fd6a1]"><Check size={15} aria-hidden /> Saved — the store is updated.</span>
              : dirty ? <span className="font-semibold text-ink">You have unsaved changes.</span> : <span className="text-muted">No changes.</span>}
          </div>
          <button type="button" className={`${btnSoft} max-sm:!h-9 max-sm:flex-1 max-sm:!px-2 max-sm:!text-[12px]`} disabled={!dirty} onClick={() => { setD(structuredClone(settings)); setErrors([]) }}>Discard</button>
          <button type="button" className={`${btnPrimary} max-sm:!h-9 max-sm:flex-1 max-sm:!px-2 max-sm:!text-[12px]`} disabled={!dirty} onClick={save}>Save changes <span aria-hidden className="h-4 w-px shrink-0 bg-white/40" /> <Save size={15} aria-hidden /></button>
        </div>
      </div>
    </div>
  )
}
