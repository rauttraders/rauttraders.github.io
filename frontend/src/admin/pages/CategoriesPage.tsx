import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useConfirm, useNotice } from '../../components/ui/ConfirmDialog'
import { useStore } from '../../store/StoreContext'
import { PanelHeader, Card, btnPrimary, iconBtn } from '../ui/Card'
import { validateText } from '../../lib/validation'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'category'

export default function CategoriesPage() {
  const confirm = useConfirm()
  const notice = useNotice()
  const { categories, products, saveCategory, deleteCategory } = useStore()
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const exists = (n: string, except?: string) => categories.some((c) => c.id !== except && c.name.trim().toLowerCase() === n.trim().toLowerCase())

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setErr('Enter a category name')
    const nameProblem = validateText(n, 120, 'Category name')
    if (nameProblem) return setErr(nameProblem)
    if (exists(n)) return setErr('That category already exists')
    let id = slug(n)
    for (let i = 2; categories.some((c) => c.id === id); i++) id = `${slug(n)}-${i}`
    saveCategory({ id, name: n })
    setName('')
    setErr('')
  }

  const saveEdit = (id: string) => {
    const n = editName.trim()
    if (!n || exists(n, id) || validateText(n, 120, 'Category name')) return
    saveCategory({ id, name: n })
    setEditId(null)
  }

  return (
    <div className="viz-root flex w-full flex-col gap-5">
      <Card>
        <PanelHeader icon={Plus} title="Add a category" subtitle="Group your products so customers can browse and filter them" />
        <form onSubmit={add} noValidate className="flex flex-wrap items-start gap-3">
          <div className="min-w-[240px] flex-1">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setErr('') }}
              placeholder="e.g. Beverages"
              aria-label="Category name"
              aria-invalid={!!err}
              className="h-[46px] w-full rounded-full border border-line bg-white px-5 text-sm text-ink outline-none transition-all focus:border-brand focus:shadow-[0_0_0_3px_rgba(239,83,80,0.15)] dark:bg-[#2b2c30] max-md:h-[40px] max-md:px-4 max-md:text-[13px]"
            />
            {err && <p role="alert" className="mb-0 mt-1.5 pl-4 text-xs font-medium text-[#c62f2c]">{err}</p>}
          </div>
          <button type="submit" className={`${btnPrimary} !h-[46px] max-md:!h-[40px] max-sm:w-full`}><Plus size={16} aria-hidden /> Add category</button>
        </form>
      </Card>

      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="m-0 text-[15px] font-semibold text-ink">All categories</h2>
        <span className="text-[13px] text-muted">{categories.length} {categories.length === 1 ? 'category' : 'categories'} · {products.length} {products.length === 1 ? 'product' : 'products'}</span>
      </div>

      {categories.length === 0 ? (
        <p className="m-0 flex flex-col items-center gap-2 rounded-2xl bg-white py-16 text-[14px] text-muted dark:bg-[#34353a]"><Tags size={28} aria-hidden /> No categories yet. Add your first one above.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-2xl:grid-cols-3 max-lg:grid-cols-2 max-md:gap-2.5">
          {categories.map((c, i) => {
            const color = `var(--viz-${(i % 6) + 1})`
            const inCat = products.filter((p) => p.categoryId === c.id)
            const n = inCat.length
            const editing = editId === c.id
            return (
              <li key={c.id} className="group flex min-w-0 flex-col rounded-2xl border border-[#ececf0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_rgba(239,83,80,0.14)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-md:rounded-xl max-md:p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl max-md:h-9 max-md:w-9 max-md:rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
                    <Tags size={20} aria-hidden />
                  </span>
                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-[12px] font-bold text-muted dark:bg-white/10 max-md:px-2 max-md:py-0.5 max-md:text-[10.5px]">{n} {n === 1 ? 'product' : 'products'}</span>
                </div>

                {editing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditId(null) }}
                    aria-label="Category name"
                    className="mt-4 h-10 w-full rounded-full border border-brand bg-white px-4 text-[15px] font-semibold text-ink outline-none dark:bg-[#2b2c30] max-md:mt-3 max-md:h-9 max-md:text-[13px]"
                  />
                ) : (
                  <h3 className="mb-0 mt-4 truncate text-[17px] font-semibold text-ink max-md:mt-2.5 max-md:text-[14.5px]">{c.name}</h3>
                )}

                <div className="mt-3 flex min-h-[36px] items-center">
                  {n === 0 ? (
                    <span className="text-xs text-muted">No products yet</span>
                  ) : (
                    <>
                      <span className="flex -space-x-2">
                        {inCat.slice(0, 4).map((p) => (
                          <span key={p.id} title={p.name} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#fff4f4] dark:border-[#34353a] dark:bg-[#3a2e2e]">
                            {p.image ? <img src={p.image} alt="" className="h-full w-full object-contain p-1" /> : null}
                          </span>
                        ))}
                      </span>
                      {n > 4 && <span className="ml-2 text-xs font-semibold text-muted">+{n - 4}</span>}
                    </>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-1 border-t border-[#ececf0] pt-3 dark:border-[#45464c]">
                  {editing ? (
                    <>
                      <button type="button" aria-label="Save" className={iconBtn} onClick={() => saveEdit(c.id)}><Check size={16} aria-hidden /></button>
                      <button type="button" aria-label="Cancel" className={iconBtn} onClick={() => setEditId(null)}><X size={16} aria-hidden /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" aria-label={`Rename ${c.name}`} className={iconBtn} onClick={() => { setEditId(c.id); setEditName(c.name) }}><Pencil size={16} aria-hidden /></button>
                      <button
                        type="button"
                        aria-label={`Delete ${c.name}`}
                        title={n ? 'Move or delete its products first' : 'Delete'}
                        className={`${iconBtn} ${n ? 'opacity-40' : ''}`}
                        onClick={async () => {
                          if (n) {
                            return void notice({ tone: 'warning', title: `Can't delete ${c.name} yet`, message: 'This category still has products. Move them to another category or delete them first.', details: [{ label: 'Category', value: c.name }, { label: 'Products in it', value: n }] })
                          }
                          if (await confirm({ tone: 'danger', title: 'Delete this category?', message: 'Customers will no longer see it in the shop filters.', details: [{ label: 'Category', value: c.name }], confirmLabel: 'Yes, delete category' })) deleteCategory(c.id)
                        }}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
