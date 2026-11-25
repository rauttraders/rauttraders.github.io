import { BadgeCheck, Crop, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../store/StoreContext'
import { useConfirm, useNotice } from '../../components/ui/ConfirmDialog'
import type { Brand } from '../../store/types'
import { slugify } from '../../store/seed'
import { CROP_PRESETS } from '../imageTools'
import ImageCropDialog from '../ui/ImageCropDialog'
import { Card, PanelHeader, btnDanger, btnPrimary, btnSoft, iconBtn } from '../ui/Card'
import { TextInput } from '../ui/Inputs'
import Modal from '../ui/Modal'
import { validateText } from '../../lib/validation'

function BrandForm({ initial, onClose }: { initial: Brand | null; onClose: () => void }) {
  const { brands, saveBrand } = useStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [logo, setLogo] = useState(initial?.logo ?? '')
  const [err, setErr] = useState('')

  const [cropSrc, setCropSrc] = useState<File | string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Enter the brand name')
    const nameProblem = validateText(n, 120, 'Brand name')
    if (nameProblem) return setErr(nameProblem)
    if (brands.some((b) => b.id !== initial?.id && b.name.toLowerCase() === n.toLowerCase())) return setErr('That brand already exists')
    let id = initial?.id
    if (!id) {
      const base = slugify(n)
      id = base
      for (let i = 2; brands.some((b) => b.id === id); i++) id = `${base}-${i}`
    }
    saveBrand({ id, name: n, logo })
    onClose()
  }

  return (
    <Modal title={initial ? 'Edit brand' : 'Add brand'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextInput label="Brand name" value={name} onChange={(e) => { setName(e.target.value); setErr('') }} autoFocus error={err} />
        <div>
          <span className="text-xs font-semibold text-muted">Logo (shown in the home page logo strip)</span>
          <div className="mt-1.5 flex items-center gap-4">
            <div className="flex h-[84px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff4f4] dark:bg-[#3a2e2e]">
              {logo ? <img src={logo} alt="" className="h-full w-full object-contain p-2" /> : <ImagePlus size={26} className="text-muted" aria-hidden />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${btnSoft} !h-9`}>
                Upload logo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropSrc(f); e.target.value = '' }} />
              </label>
              {logo && <button type="button" className={`${btnSoft} !h-9`} onClick={() => setCropSrc(logo)}><Crop size={15} aria-hidden /> Adjust</button>}
              {logo && <button type="button" className={`${btnDanger} !h-9 !px-4`} onClick={() => setLogo('')}>Remove</button>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#ececf0] pt-4 dark:border-[#45464c]">
          <button type="button" className={btnSoft} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>{initial ? 'Save changes' : 'Add brand'}</button>
        </div>
      </form>
      {cropSrc && <ImageCropDialog src={cropSrc} preset={CROP_PRESETS.logo} onCancel={() => setCropSrc(null)} onApply={(url) => { setLogo(url); setErr(''); setCropSrc(null) }} />}
    </Modal>
  )
}

export default function BrandsPage() {
  const confirm = useConfirm()
  const notice = useNotice()
  const { brands, products, deleteBrand } = useStore()
  const [editing, setEditing] = useState<{ b: Brand | null } | null>(null)
  const sorted = brands.slice().sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
      <Card>
        <PanelHeader
          icon={BadgeCheck}
          title="Brands"
          subtitle={`${brands.length} ${brands.length === 1 ? 'brand' : 'brands'} · logos appear in the home page strip`}
          action={
            <button type="button" className={`${btnPrimary} max-md:hidden`} onClick={() => setEditing({ b: null })}>
              Add brand <span aria-hidden className="h-4 w-px bg-white/40" /> <Plus size={16} aria-hidden />
            </button>
          }
          className="md:mb-0 md:border-b-0 md:pb-0"
        />
        <div className="hidden justify-end max-md:flex">
          <button type="button" className={`${btnPrimary} w-full`} onClick={() => setEditing({ b: null })}>
            Add brand <span aria-hidden className="h-4 w-px bg-white/40" /> <Plus size={16} aria-hidden />
          </button>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <p className="m-0 rounded-2xl bg-white py-16 text-center text-[14px] text-muted dark:bg-[#34353a]">No brands yet. Add one to use it on products.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:gap-2.5">
          {sorted.map((b) => {
            const n = products.filter((p) => p.company === b.name).length
            return (
              <li key={b.id} className="group flex min-w-0 flex-col rounded-2xl border border-[#ececf0] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_rgba(239,83,80,0.14)] dark:border-[#45464c] dark:bg-[#34353a] max-md:rounded-xl max-md:p-3">
                <div className="flex h-[96px] items-center justify-center rounded-xl bg-gradient-to-b from-[#fff4f4] to-white dark:from-[#3a2e2e] dark:to-[#34353a] max-md:h-[72px]">
                  {b.logo ? <img src={b.logo} alt={`${b.name} logo`} className="logo-outline max-h-[60px] max-w-[70%] object-contain max-md:max-h-[46px]" /> : <span className="text-[34px] font-extrabold text-brand/70 max-md:text-[26px]">{b.name.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="mt-3 flex items-center gap-1 max-md:mt-2">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[15px] font-extrabold text-ink max-md:text-[13.5px]">{b.name}</p>
                    <p className="m-0 text-xs text-muted max-md:text-[11px]">{n} {n === 1 ? 'product' : 'products'}</p>
                  </div>
                  <button type="button" aria-label={`Edit ${b.name}`} className={iconBtn} onClick={() => setEditing({ b })}><Pencil size={16} aria-hidden /></button>
                  <button type="button" aria-label={`Delete ${b.name}`} title={n ? 'Move or delete its products first' : 'Delete'} className={`${iconBtn} ${n ? 'opacity-40' : ''}`} onClick={async () => {
                    if (n) {
                      return void notice({ tone: 'warning', title: `Can't delete ${b.name} yet`, message: 'This brand still has products. Move them to another brand or delete them first.', details: [{ label: 'Brand', value: b.name }, { label: 'Products using it', value: n }] })
                    }
                    if (await confirm({ tone: 'danger', title: 'Delete this brand?', message: 'The brand and its logo will be removed from the site, including the home page logo strip.', details: [{ label: 'Brand', value: b.name }], confirmLabel: 'Yes, delete brand' })) deleteBrand(b.id)
                  }}><Trash2 size={16} aria-hidden /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {editing && <BrandForm initial={editing.b} onClose={() => setEditing(null)} />}
    </div>
  )
}
