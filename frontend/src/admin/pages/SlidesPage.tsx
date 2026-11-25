import { Crop, GalleryHorizontal, GripVertical, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useStore } from '../../store/StoreContext'
import type { Slide } from '../../store/types'
import { CROP_PRESETS } from '../imageTools'
import ImageCropDialog from '../ui/ImageCropDialog'
import { Card, PanelHeader, btnPrimary, btnSoft, iconBtn } from '../ui/Card'
import { TextInput } from '../ui/Inputs'
import Modal from '../ui/Modal'

const MAX_SLIDES = 8

function SlideForm({ initial, onSave, onClose }: { initial: Slide | null; onSave: (s: Slide) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [image, setImage] = useState(initial?.image ?? '')
  const [cropSrc, setCropSrc] = useState<File | string | null>(null)
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) return setErr('Upload an image for this slide')
    onSave({ id: initial?.id ?? `slide-${Date.now().toString(36)}`, title: title.trim() || 'Slide', image, scale: 1 })
    onClose()
  }

  return (
    <Modal title={initial ? 'Edit slide' : 'Add slide'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-[#fbd9d8] dark:bg-[#4a2f2f]">
          {image ? <img src={image} alt="" className="h-[80%] w-[74%] -rotate-6 object-contain" /> : <ImagePlus size={34} className="text-brand/60" aria-hidden />}
          <span className="absolute bottom-2 right-3 text-[11px] font-semibold text-[#8a2c2a] dark:text-[#ffb3b0]">Preview</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className={`${btnSoft} !h-9`}>
            {image ? 'Replace image' : 'Upload image'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropSrc(f); e.target.value = '' }} />
          </label>
          {image && <button type="button" className={`${btnSoft} !h-9`} onClick={() => setCropSrc(image)}>Adjust <span aria-hidden className="h-4 w-px shrink-0 bg-current opacity-30" /> <Crop size={15} aria-hidden /></button>}
        </div>

        <TextInput label="Name (used as the image description)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Britannia 50-50" />

        {err && <p role="alert" className="m-0 text-xs font-medium text-[#c62f2c]">{err}</p>}
        <div className="flex justify-end gap-2 border-t border-[#ececf0] pt-4 dark:border-[#45464c]">
          <button type="button" className={btnSoft} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>{initial ? 'Save changes' : 'Add slide'}</button>
        </div>
      </form>
      {cropSrc && <ImageCropDialog src={cropSrc} preset={CROP_PRESETS.slide} onCancel={() => setCropSrc(null)} onApply={(url) => { setImage(url); setErr(''); setCropSrc(null) }} />}
    </Modal>
  )
}

export default function SlidesPage() {
  const confirm = useConfirm()
  const { slides, setSlides } = useStore()
  const [editing, setEditing] = useState<{ s: Slide | null } | null>(null)

  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  /** Move the slide `fromId` into the position currently held by `toId`. */
  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const from = slides.findIndex((x) => x.id === fromId)
    const to = slides.findIndex((x) => x.id === toId)
    if (from < 0 || to < 0) return
    const next = slides.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setSlides(next)
  }
  const endDrag = () => {
    setDragId(null)
    setOverId(null)
  }
  const save = (s: Slide) => setSlides(slides.some((x) => x.id === s.id) ? slides.map((x) => (x.id === s.id ? s : x)) : [...slides, s])

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-5">
      <Card>
        <PanelHeader
          icon={GalleryHorizontal}
          title="Hero slider"
          subtitle={`${slides.length} ${slides.length === 1 ? 'slide' : 'slides'} · shown on the home page · drag a card to change the order`}
          action={
            <button type="button" className={`${btnPrimary} max-md:hidden`} disabled={slides.length >= MAX_SLIDES} onClick={() => setEditing({ s: null })}>
              Add slide <span aria-hidden className="h-4 w-px bg-white/40" /> <Plus size={16} aria-hidden />
            </button>
          }
          className="md:mb-0 md:border-b-0 md:pb-0"
        />
        <div className="hidden justify-end max-md:flex">
          <button type="button" className={`${btnPrimary} w-full`} disabled={slides.length >= MAX_SLIDES} onClick={() => setEditing({ s: null })}>
            Add slide <span aria-hidden className="h-4 w-px bg-white/40" /> <Plus size={16} aria-hidden />
          </button>
        </div>
      </Card>

      {slides.length === 0 ? (
        <p className="m-0 flex flex-col items-center gap-2 rounded-2xl bg-white py-16 text-[14px] text-muted dark:bg-[#34353a]"><GalleryHorizontal size={28} aria-hidden /> No slides. The slider is hidden on the home page until you add one.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 max-lg:grid-cols-2 max-md:gap-2.5 max-sm:grid-cols-1">
          {slides.map((s, i) => (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id) }}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overId !== s.id) setOverId(s.id) } }}
              onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, s.id); endDrag() }}
              onDragEnd={endDrag}
              className={`flex min-w-0 cursor-grab flex-col overflow-hidden rounded-2xl border bg-white transition-all active:cursor-grabbing dark:bg-[#34353a] ${
                dragId === s.id ? 'scale-95 border-dashed border-brand opacity-40' : overId === s.id && dragId ? 'border-brand shadow-[0_0_0_3px_rgba(239,83,80,0.3)]' : 'border-[#ececf0] hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_rgba(239,83,80,0.14)] dark:border-[#45464c]'
              }`}
            >
              <div className="relative flex h-[170px] items-center justify-center bg-[#fbd9d8] dark:bg-[#4a2f2f] max-md:h-[135px]">
                <img src={s.image} alt={s.title} className="h-[80%] w-[74%] -rotate-6 object-contain" draggable={false} />
                <span className="absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[12px] font-extrabold text-brand shadow-sm">{i + 1}</span>
                <button
                  type="button"
                  aria-label={`Reorder ${s.title}. Drag, or use the left and right arrow keys.`}
                  title="Drag to reorder"
                  onKeyDown={(e) => {
                    const j = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : -1
                    if (j >= 0 && j < slides.length) { e.preventDefault(); reorder(s.id, slides[j].id) }
                  }}
                  className="absolute right-3 top-3 flex h-8 w-8 cursor-grab items-center justify-center rounded-full border-0 bg-white/90 text-muted shadow-sm hover:text-brand"
                >
                  <GripVertical size={16} aria-hidden />
                </button>
              </div>
              <div className="flex items-center gap-1 p-3">
                <p className="m-0 min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{s.title}</p>
                <button type="button" aria-label={`Edit ${s.title}`} className={iconBtn} onClick={() => setEditing({ s })}><Pencil size={16} aria-hidden /></button>
                <button type="button" aria-label={`Delete ${s.title}`} className={iconBtn} onClick={async () => { if (await confirm({ tone: 'danger', title: 'Delete this slide?', message: 'It will no longer appear in the home page slider.', details: [{ label: 'Slide', value: s.title }, { label: 'Position', value: `${i + 1} of ${slides.length}` }], confirmLabel: 'Yes, delete slide' })) setSlides(slides.filter((x) => x.id !== s.id)) }}><Trash2 size={16} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {slides.length >= MAX_SLIDES && <p className="m-0 text-xs text-muted">You've reached the limit of {MAX_SLIDES} slides.</p>}
      {editing && <SlideForm initial={editing.s} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}
