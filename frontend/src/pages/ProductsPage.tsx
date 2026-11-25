import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FilterChips from '../components/catalog/FilterChips'
import ProductCard from '../components/catalog/ProductCard'
import { useCart } from '../context/CartContext'
import { getCategories, getCompanies, getCompany, queryProducts } from '../data/catalog'

const PAGE = 24

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const company = params.get('company')
  const category = params.get('category')
  const q = params.get('q')
  const { qtyOf, setQty } = useCart()
  const [visible, setVisible] = useState(PAGE)

  useEffect(() => setVisible(PAGE), [company, category, q])

  const results = useMemo(() => queryProducts({ company, category, q }), [company, category, q])

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const title = q ? `Results for “${q}”` : company ? (getCompany(company)?.name ?? 'Products') : 'All products'

  return (
    <>
      <h1 className="text-[26px] font-light tracking-[-0.8px] text-ink">{title}</h1>
      <p className="mb-4 text-xs text-muted">{results.length} products</p>

      <div className="mb-5 space-y-2">
        <FilterChips label="Company" options={getCompanies()} value={company} onChange={(v) => update('company', v)} />
        <FilterChips label="Category" options={getCategories()} value={category} onChange={(v) => update('category', v)} />
      </div>

      {results.length === 0 ? (
        <p className="py-16 text-center text-muted">No products found.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.slice(0, visible).map((p) => (
              <ProductCard key={p.id} product={p} qty={qtyOf(p.id)} onQty={setQty} />
            ))}
          </div>
          {visible < results.length && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="h-11 cursor-pointer rounded-[28px] border border-brand bg-white px-8 text-sm font-semibold uppercase text-[#111] hover:bg-cream"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
