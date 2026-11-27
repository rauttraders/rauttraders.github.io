import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import InfoPageLayout from './InfoPageLayout'

export default function PrivacyPolicyPage() {
  const { business } = useStore().settings
  const name = business.name || 'Raut Traders'

  return (
    <InfoPageLayout
      title="Privacy Policy"
      subtitle={`How ${name} handles your order and contact information`}
      icon={<ShieldCheck size={24} aria-hidden />}
    >
      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">1. No Customer Accounts Required</h2>
        <p className="m-0">
          {name} does not require you to create an account or log in to browse products or place wholesale orders. You only share details you voluntarily submit through the Contact form or when sending an order on WhatsApp.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">2. Information We Collect</h2>
        <ul className="m-0 list-disc space-y-1.5 pl-5">
          <li><strong>Order Details:</strong> Selected products, quantities, and order ID generated when you place an order.</li>
          <li><strong>Contact Enquiries:</strong> Your name, optional shop/business name, phone number, and message submitted through our Contact Us form.</li>
        </ul>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">3. Browser Storage (2-Hour Auto-Expiry)</h2>
        <p className="m-0">
          To make ordering convenient without login, your active basket and recent order receipts are stored only on your own device in browser <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px] dark:bg-white/10">localStorage</code> and automatically expire and clear after <strong>2 hours</strong>. Display preferences such as theme (light/dark) and language are also saved locally on your device. We do not use third-party advertising trackers.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">4. How We Use Your Information</h2>
        <p className="m-0">
          Your information is used strictly to confirm stock availability, prepare invoices/receipts, coordinate wholesale delivery, and respond to your enquiries via WhatsApp or phone. We never sell or rent your data to third parties.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">5. Contact Us About Privacy</h2>
        <p className="m-0">
          If you have any questions or would like us to remove a submitted enquiry or order record, please reach out via our{' '}
          <Link to="/#contact" className="font-semibold text-brand no-underline hover:underline">Contact Us</Link> section
          {business.email ? <> or email <a href={`mailto:${business.email}`} className="font-semibold text-brand no-underline hover:underline">{business.email}</a></> : null}
          {business.phone ? <> or call <a href={`tel:${business.phone.replace(/\s/g, '')}`} className="font-semibold text-brand no-underline hover:underline">{business.phone}</a></> : null}.
        </p>
      </section>
    </InfoPageLayout>
  )
}
