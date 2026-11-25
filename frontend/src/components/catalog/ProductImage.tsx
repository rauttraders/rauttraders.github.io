import { getCompany } from '../../data/catalog'
import type { Product } from '../../types'

export default function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  if (product.image) {
    return <img src={product.image} alt={product.name} loading="lazy" className={`object-contain ${className}`} />
  }
  const initial = (getCompany(product.companyId)?.name ?? product.name)[0]
  return (
    <div aria-hidden className={`flex items-center justify-center bg-cream text-3xl font-light text-brand ${className}`}>
      {initial}
    </div>
  )
}
