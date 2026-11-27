import { Eye, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { memo, useState } from 'react'
import HighlightText from '../ui/HighlightText'
import QtyInput from '../ui/QtyInput'
import { formatINR } from '../../lib/format'
import type { Product as ShowcaseProduct } from '../../store/types'
import { useLanguage } from '../../hooks/useLanguage'
import ProductZoomModal from './ProductZoomModal'

interface ProductShowCardProps {
  product: ShowcaseProduct
  qty: number
  /** Brand logo shown inside the company pill (optional). */
  brandLogo?: string
  searchQuery?: string
  onQty: (id: string, qty: number) => void
}

const ctaBase =
  'flex h-[46px] max-md:h-[42px] max-sm:h-[36px] w-full cursor-pointer items-center justify-center gap-2 max-sm:gap-1 rounded-full border-0 px-3 max-sm:px-2 text-sm max-md:text-[13.5px] max-sm:text-[11.5px] font-semibold transition-colors active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function ProductShowCard({ product, qty, brandLogo, searchQuery = '', onQty }: ProductShowCardProps) {
  const { t } = useLanguage()
  const [zoomOpen, setZoomOpen] = useState(false)

  return (
    <>
    {zoomOpen && <ProductZoomModal product={product} onClose={() => setZoomOpen(false)} />}
    <article className="flex h-full flex-col overflow-hidden group rounded-2xl border border-[#ececf0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_12px_28px_rgba(239,83,80,0.18)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-sm:rounded-xl">
      <div className="relative flex h-[230px] items-center justify-center bg-gradient-to-b from-cream to-white dark:from-[#3d3e44] dark:to-[#34353a] max-md:h-[220px] max-sm:h-[145px]">
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#c62f2c] shadow-sm backdrop-blur dark:bg-[#2b2c30]/90 dark:text-[#ff8a87] max-sm:left-2 max-sm:top-2 max-sm:gap-1 max-sm:px-2 max-sm:py-0.5 max-sm:text-[10px]">
          {brandLogo && <img src={brandLogo} alt="" draggable={false} className="logo-outline h-4 w-auto max-w-[44px] shrink-0 object-contain max-sm:h-3" />}
          <HighlightText text={product.company} query={searchQuery} />
        </span>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          draggable={false}
          onClick={() => product.image && setZoomOpen(true)}
          className={
            product.isLogo
              ? 'logo-outline mt-3 max-h-[126px] w-[78%] cursor-zoom-in object-contain transition-transform duration-300 group-hover:scale-105 max-md:max-h-[126px] max-md:w-[82%] max-sm:max-h-[86px]'
              : 'h-full w-full cursor-zoom-in object-contain p-1.5 transition-transform duration-300 group-hover:scale-105'
          }
        />
      </div>

      <div className="flex flex-1 flex-col p-4 max-sm:p-2.5">
        <h3 className="m-0 text-[15px] font-bold leading-snug text-ink max-sm:text-[13px]"><HighlightText text={product.name} query={searchQuery} /></h3>
        {product.description.trim() && (
          <p className="mb-2.5 mt-1.5 line-clamp-2 text-[13px] leading-[1.3rem] text-muted max-sm:mb-1.5 max-sm:mt-1 max-sm:text-[11.5px] max-sm:leading-[1rem]"><HighlightText text={product.description} query={searchQuery} /></p>
        )}

        <div className="mb-3.5 mt-auto flex flex-wrap items-baseline gap-2 pt-2 max-sm:mb-2.5 max-sm:gap-1.5 max-sm:pt-1.5">
          {product.mrp && <span className="text-[13px] text-muted line-through max-sm:text-[11px]">{formatINR(product.price)}</span>}
          <span className="text-[19px] font-extrabold text-brand max-sm:text-[16px]">{formatINR(product.price)}</span>
          {product.size && product.size !== '0' && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-muted dark:bg-white/10 max-sm:text-[10px]">{product.size}</span>}
        </div>

        {qty === 0 ? (
          <div className="flex gap-2 max-sm:gap-1.5">
            <button
              type="button"
              onClick={() => onQty(product.id, 1)}
              className={`${ctaBase} min-w-0 flex-1 bg-brand/10 text-brand hover:bg-brand hover:text-white dark:bg-brand/20`}
            >
              <span className="truncate">{t('addToBasket')}</span>
              <span aria-hidden className="h-5 w-px shrink-0 bg-current opacity-30 max-sm:h-3.5" />
              <ShoppingCart size={17} strokeWidth={2.5} className="shrink-0 max-sm:h-3.5 max-sm:w-3.5" aria-hidden />
            </button>
            {product.image && (
              <button
                type="button"
                aria-label={`View ${product.name}`}
                title={t('viewZoom')}
                onClick={() => setZoomOpen(true)}
                className="flex h-[46px] w-[46px] max-md:h-[42px] max-md:w-[42px] max-sm:h-[36px] max-sm:w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white active:scale-95 dark:bg-brand/20"
              >
                <Eye size={18} className="max-sm:h-4 max-sm:w-4" aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-2 max-sm:gap-1.5">
            <div className="flex h-[46px] max-md:h-[42px] max-sm:h-[36px] min-w-0 flex-1 items-center justify-between rounded-full bg-brand/10 px-1.5 text-ink dark:bg-brand/20 max-sm:px-1">
              <button
                type="button"
                aria-label={`Remove one ${product.name}`}
                onClick={() => onQty(product.id, qty - 1)}
                className="flex h-9 w-9 max-md:h-8 max-md:w-8 max-sm:h-7 max-sm:w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-brand shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all hover:bg-brand hover:text-white active:scale-90 dark:bg-[#2b2c30] dark:hover:bg-brand"
              >
                <Minus size={16} strokeWidth={2.75} className="max-sm:h-3.5 max-sm:w-3.5" />
              </button>
              <QtyInput value={qty} onCommit={(n) => onQty(product.id, n)} label={`Quantity of ${product.name}`} className="h-9 max-md:h-8 max-sm:h-7 w-14 max-sm:w-8 text-base max-sm:text-[13px]" />
              <button
                type="button"
                aria-label={`Add one more ${product.name}`}
                onClick={() => onQty(product.id, qty + 1)}
                className="flex h-9 w-9 max-md:h-8 max-md:w-8 max-sm:h-7 max-sm:w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-brand shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all hover:bg-brand hover:text-white active:scale-90 dark:bg-[#2b2c30] dark:hover:bg-brand"
              >
                <Plus size={16} strokeWidth={2.75} className="max-sm:h-3.5 max-sm:w-3.5" />
              </button>
            </div>
            {product.image && (
              <button
                type="button"
                aria-label={`View ${product.name}`}
                title={t('viewZoom')}
                onClick={() => setZoomOpen(true)}
                className="flex h-[46px] w-[46px] max-md:h-[42px] max-md:w-[42px] max-sm:hidden shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white active:scale-95 dark:bg-brand/20"
              >
                <Eye size={18} aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove ${product.name} from basket`}
              title={t('removeFromBasket')}
              onClick={() => onQty(product.id, 0)}
              className="flex h-[46px] w-[46px] max-md:h-[42px] max-md:w-[42px] max-sm:h-[36px] max-sm:w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#fdeaea] text-[#c62f2c] transition-colors hover:bg-[#c62f2c] hover:text-white active:scale-95 dark:bg-[#4a2f2f] dark:text-[#ff8a87] dark:hover:bg-[#c62f2c] dark:hover:text-white"
            >
              <Trash2 size={18} className="max-sm:h-4 max-sm:w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </article>
    </>
  )
}

export default memo(ProductShowCard)
