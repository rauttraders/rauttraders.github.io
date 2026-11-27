import { MessageCircle, PhoneCall, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { whatsappUrl } from '../lib/links'
import { useStore } from '../store/StoreContext'
import InfoPageLayout from './InfoPageLayout'

export default function ReturnPolicyPage() {
  const { settings } = useStore()
  const { business } = settings
  const name = business.name || 'Raut Traders'
  const hasPhone = business.phone.trim().length > 0
  const hasWa = business.whatsappNumber.replace(/\D/g, '').length >= 10

  return (
    <InfoPageLayout
      title="Return Policy"
      subtitle={`Easy replacement and support for wholesale orders at ${name}`}
      icon={<RotateCcw size={24} aria-hidden />}
    >
      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">1. Inspection at Delivery</h2>
        <p className="m-0">
          Please check carton counts, outer seals, and product condition at the time of delivery. Our wholesale team takes care to supply genuine, fresh stock directly from authorized brand channels.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">2. Eligible Returns &amp; Replacements</h2>
        <p className="m-0 mb-2">We accept return or replacement requests for wholesale orders under the following conditions:</p>
        <ul className="m-0 list-disc space-y-1.5 pl-5">
          <li>Items delivered in damaged, torn, or leaking condition.</li>
          <li>Wrong product, variant, or quantity supplied compared to your confirmed order.</li>
          <li>Products received past or too close to their expiry date.</li>
        </ul>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">3. How to Request a Return or Replacement</h2>
        <p className="m-0">
          Please report any issue within <strong>24–48 hours of delivery</strong> along with your Order ID and a clear photo of the item. You can reach us directly through our{' '}
          <Link to="/#contact" className="font-semibold text-brand no-underline hover:underline">Contact Us</Link> page or call us directly using the phone number displayed on the website.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/#contact"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white no-underline shadow-[0_4px_12px_rgba(239,83,80,0.3)] transition-colors hover:bg-brand-hover"
          >
            Contact Us
          </Link>
          {hasPhone && (
            <a
              href={`tel:${business.phone.replace(/\s/g, '')}`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand/10 px-5 text-[13px] font-semibold text-brand no-underline transition-colors hover:bg-brand hover:text-white dark:bg-brand/20"
            >
              Call {business.phone} <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <PhoneCall size={14} aria-hidden />
            </a>
          )}
          {hasWa && (
            <a
              href={whatsappUrl(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366]/15 px-5 text-[13px] font-semibold text-[#15803d] no-underline transition-colors hover:bg-[#25D366] hover:text-white dark:bg-[#25D366]/20 dark:text-[#4ade80] dark:hover:text-white"
            >
              WhatsApp Support <span aria-hidden className="h-4 w-px bg-current opacity-30" /> <MessageCircle size={14} aria-hidden />
            </a>
          )}
        </div>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">4. Resolution</h2>
        <p className="m-0">
          Once verified by our team, eligible items are replaced on your next delivery route or adjusted against your order balance as agreed on WhatsApp or phone.
        </p>
      </section>
    </InfoPageLayout>
  )
}
