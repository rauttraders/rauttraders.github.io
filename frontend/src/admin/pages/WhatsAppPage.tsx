import { Check, MessageSquareText, RotateCcw, Save, Smartphone, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { defaultSettings } from '../../data/company'
import { buildBasketMessage } from '../../lib/order'
import { useStore } from '../../store/StoreContext'
import type { WhatsAppSettings } from '../../store/types'
import type { BasketItem } from '../../components/Navbar/BasketMenu'
import { Card, PanelHeader, btnPrimary, btnSoft } from '../ui/Card'
import { TextArea, TextInput, Toggle } from '../ui/Inputs'
import Select from '../ui/Select'
import WhatsAppPreview from '../ui/WhatsAppPreview'

const SAMPLE_WHEN = new Date(2026, 10, 22, 10, 42)

export default function WhatsAppPage() {
  const { settings, products, updateSettings } = useStore()
  const [d, setD] = useState<WhatsAppSettings>(() => structuredClone(settings.whatsapp))
  const [whatsappNumber, setWhatsappNumber] = useState(() => settings.business.whatsappNumber)
  const [numError, setNumError] = useState('')
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(d) !== JSON.stringify(settings.whatsapp) || whatsappNumber !== settings.business.whatsappNumber

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(t)
  }, [saved])

  const up = <K extends keyof WhatsAppSettings>(k: K, v: WhatsAppSettings[K]) => {
    setD((x) => ({ ...x, [k]: v }))
    setSaved(false)
  }

  // Preview basket: your real products when you have them, otherwise a small sample.
  const sample = useMemo<BasketItem[]>(() => {
    const real = products.filter((p) => p.active).slice(0, 3)
    const qtys = [12, 6, 3]
    if (real.length) return real.map((p, i) => ({ id: p.id, name: p.name, company: p.company, size: p.size, price: p.price, qty: qtys[i], mrp: p.mrp, image: p.image, isLogo: p.isLogo }))
    return [{ id: 's1', name: 'Sample Biscuits', company: 'Brand', size: '70 g', price: 10, qty: 12, image: '' }, { id: 's2', name: 'Sample Namkeen', company: 'Brand', size: '200 g', price: 40, qty: 6, image: '' }]
  }, [products])

  const liveBusiness = useMemo(
    () => ({ ...settings.business, whatsappNumber: whatsappNumber.trim() }),
    [settings.business, whatsappNumber],
  )
  const text = useMemo(() => buildBasketMessage(sample, liveBusiness, d, 'RT-1042', SAMPLE_WHEN), [sample, liveBusiness, d])

  const save = () => {
    const cleaned = whatsappNumber.trim()
    if (cleaned && cleaned.replace(/\D/g, '').length < 10) {
      setNumError('WhatsApp number must include country code (e.g. 919876543210).')
      return
    }
    setNumError('')
    updateSettings({ ...settings, business: { ...settings.business, whatsappNumber: cleaned }, whatsapp: d })
    setSaved(true)
  }

  const row = 'grid grid-cols-2 gap-x-6 gap-y-3.5 max-sm:grid-cols-1'

  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)_370px] gap-6 pb-24 max-xl:grid-cols-1 max-sm:pb-36">
      <div className="flex flex-col gap-5">
        <Card>
          <PanelHeader icon={MessageSquareText} title="Shop details" subtitle="Receiving number and the first lines of the message" />
          <div className="mb-5">
            <TextInput
              label="WhatsApp number (receives orders)"
              value={whatsappNumber}
              onChange={(e) => { setWhatsappNumber(e.target.value); setNumError(''); setSaved(false) }}
              placeholder="e.g. 919876543210"
              error={numError}
              hint="With country code, digits only. Saved to the database — customer orders are sent here (also editable in Site settings)."
            />
          </div>
          <p className="mb-4 mt-0 text-[13px] text-muted">Other business details come from <Link to="/admin/settings" className="font-semibold text-brand no-underline hover:underline">Site settings</Link>. Choose which ones to show here.</p>
          <div className={row}>
            <Toggle checked={d.showShopName} onChange={(v) => up('showShopName', v)} label="Shop name" />
            <Toggle checked={d.showAddress} onChange={(v) => up('showAddress', v)} label="Address" />
            <Toggle checked={d.showPhone} onChange={(v) => up('showPhone', v)} label="Phone number" />
            <Toggle checked={d.showHours} onChange={(v) => up('showHours', v)} label="Opening hours" />
          </div>
          <div className="mt-5">
            <TextInput label="Opening line (optional)" value={d.intro} onChange={(e) => up('intro', e.target.value)} placeholder="e.g. Hello! I would like to place this order:" />
          </div>
        </Card>

        <Card>
          <PanelHeader icon={Check} title="Order details" subtitle="Order number and date" />
          <div className={row}>
            <TextInput label="Order heading" value={d.orderLabel} onChange={(e) => up('orderLabel', e.target.value)} hint="Shown in bold before the order number." />
            <div className="flex flex-col justify-center gap-3.5">
              <Toggle checked={d.showDate} onChange={(v) => up('showDate', v)} label="Show date and time" />
            </div>
          </div>
        </Card>

        <Card>
          <PanelHeader icon={Type} title="Items & totals" subtitle="How the list and the price calculation look" />
          <div className={row}>
            <Select label="Item lines" value={d.itemStyle} onChange={(v) => up('itemStyle', v as WhatsAppSettings['itemStyle'])} options={[{ value: 'detailed', label: 'Detailed — name, brand, size, price' }, { value: 'compact', label: 'Compact — one line per item' }]} />
            <Select label="Divider lines" value={d.divider} onChange={(v) => up('divider', v as WhatsAppSettings['divider'])} options={[{ value: 'line', label: '━━━━━━━ Solid line' }, { value: 'dots', label: '• • • • • Dots' }, { value: 'none', label: 'None (blank space)' }]} />
            <TextInput label="Final total label" value={d.totalLabel} onChange={(e) => up('totalLabel', e.target.value)} />
            <div className="flex flex-col justify-center gap-3.5">
              <Toggle checked={d.showCounts} onChange={(v) => up('showCounts', v)} label="Show number of items and units" />
              <Toggle checked={d.showDiscount} onChange={(v) => up('showDiscount', v)} label="Show subtotal and discount" />
            </div>
          </div>
        </Card>

        <Card>
          <PanelHeader icon={MessageSquareText} title="Wording" subtitle="The last lines of the message" />
          <div className="flex flex-col gap-4">
            <TextArea label="Delivery / payment note (leave empty to hide)" rows={2} value={d.note} onChange={(e) => up('note', e.target.value)} />
            <TextInput label="Closing line (leave empty to hide)" value={d.closing} onChange={(e) => up('closing', e.target.value)} />
            <Toggle checked={d.emojis} onChange={(v) => up('emojis', v)} label="Use emojis (📍 📞 🕘) in the shop details" />
          </div>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-[84px] xl:self-start">
        <Card>
          <PanelHeader icon={Smartphone} title="Live preview" subtitle="Customer WhatsApp order view" />
          <WhatsAppPreview text={text} name={settings.business.name || 'Raut Traders'} />
          <p className="mb-0 mt-3 text-center text-xs text-muted">What the customer sends you. Sample order using your real products. It never contains their personal details.</p>
        </Card>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ececf0] bg-white/95 px-6 py-3 backdrop-blur dark:border-[#45464c] dark:bg-[#34353a]/95 max-sm:px-4 max-sm:py-2.5 lg:pl-[288px]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 max-sm:gap-2">
          <div className="min-w-0 flex-1 text-[13px] max-sm:w-full max-sm:flex-none max-sm:text-xs">
            {saved ? <span className="inline-flex items-center gap-1.5 font-semibold text-[#1c6b3c] dark:text-[#7fd6a1]"><Check size={15} aria-hidden /> Saved — new orders use this message.</span> : dirty ? <span className="font-semibold text-ink">You have unsaved changes.</span> : <span className="text-muted">No changes.</span>}
          </div>
          <button type="button" className={`${btnSoft} max-sm:!h-9 max-sm:flex-1 max-sm:!px-2 max-sm:!text-[12px]`} onClick={() => { setD(structuredClone(defaultSettings.whatsapp)); setNumError(''); setSaved(false) }}><RotateCcw size={15} aria-hidden /> Reset to default</button>
          <button type="button" className={`${btnSoft} max-sm:!h-9 max-sm:flex-1 max-sm:!px-2 max-sm:!text-[12px]`} disabled={!dirty} onClick={() => { setD(structuredClone(settings.whatsapp)); setWhatsappNumber(settings.business.whatsappNumber); setNumError('') }}>Discard</button>
          <button type="button" className={`${btnPrimary} max-sm:!h-9 max-sm:flex-1 max-sm:!px-2 max-sm:!text-[12px]`} disabled={!dirty} onClick={save}><Save size={15} aria-hidden /> Save changes</button>
        </div>
      </div>
    </div>
  )
}
