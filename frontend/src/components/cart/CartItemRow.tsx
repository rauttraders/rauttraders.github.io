import { Trash2 } from 'lucide-react'
import { formatINR } from '../../lib/format'
import type { CartLine } from '../../types'
import ProductImage from '../catalog/ProductImage'
import QuantityStepper from '../catalog/QuantityStepper'

interface CartItemRowProps {
  line: CartLine
  onQty: (id: string, qty: number) => void
  onRemove: (id: string) => void
}

export default function CartItemRow({ line, onQty, onRemove }: CartItemRowProps) {
  const { product, qty } = line
  return (
    <li className="flex items-center gap-3 border-b border-[#F0F0F0] py-3">
      <ProductImage product={product} className="h-16 w-16 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-ink">{product.name}</h3>
        <p className="text-xs text-muted">
          {product.size} · {formatINR(product.price)}
        </p>
        <div className="mt-2 w-[120px]">
          <QuantityStepper qty={qty} onChange={(q) => onQty(product.id, q)} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-sm font-semibold text-ink">{formatINR(product.price * qty)}</span>
        <button
          type="button"
          aria-label={`Remove ${product.name}`}
          onClick={() => onRemove(product.id)}
          className="cursor-pointer border-0 bg-transparent p-1 text-muted hover:text-[#EF5350]"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  )
}
