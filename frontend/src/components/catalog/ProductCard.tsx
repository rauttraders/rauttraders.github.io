import { memo } from 'react'
import { getCompany } from '../../data/catalog'
import { formatINR } from '../../lib/format'
import type { Product } from '../../types'
import ProductImage from './ProductImage'
import QuantityStepper from './QuantityStepper'

interface ProductCardProps {
  product: Product
  qty: number
  onQty: (id: string, qty: number) => void
}

function ProductCard({ product, qty, onQty }: ProductCardProps) {
  return (
    <article className="flex flex-col rounded-md border border-[#F0F0F0] bg-white p-3 transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
      <ProductImage product={product} className="mb-3 aspect-square w-full rounded" />
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{getCompany(product.companyId)?.name}</p>
      <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-ink">{product.name}</h3>
      <p className="text-xs text-muted">{product.size}</p>
      <p className="mb-3 mt-1 text-base font-semibold text-ink">
        {formatINR(product.price)} <span className="text-[11px] font-normal text-muted">MRP</span>
      </p>
      <div className="mt-auto">
        <QuantityStepper addButton qty={qty} onChange={(q) => onQty(product.id, q)} />
      </div>
    </article>
  )
}

export default memo(ProductCard)
