import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import InfoPageLayout from './InfoPageLayout'

export default function TermsPage() {
  const { business } = useStore().settings
  const name = business.name || 'Raut Traders'

  return (
    <InfoPageLayout
      title="Terms & Conditions"
      subtitle={`Terms of wholesale ordering and website use for ${name}`}
      icon={<FileText size={24} aria-hidden />}
    >
      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">1. Wholesale Ordering</h2>
        <p className="m-0">
          By placing an order or submitting an enquiry on {name}, you agree to these Terms &amp; Conditions. Orders placed on the website serve as an order request and are finalized once confirmed by our team on WhatsApp or phone.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">2. Pricing &amp; Availability</h2>
        <ul className="m-0 list-disc space-y-1.5 pl-5">
          <li>All prices displayed are in Indian Rupees (₹ INR) and reflect current wholesale rates at the time of listing.</li>
          <li>Product availability, pack sizes, and promotional schemes are subject to stock on hand and may be updated without prior notice.</li>
          <li>In the event of a pricing or stock discrepancy, {name} will notify you via WhatsApp before dispatching your order.</li>
        </ul>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">3. Delivery &amp; Payment</h2>
        <p className="m-0">
          Delivery schedules, transport charges (if applicable), and payment methods are confirmed directly with the retailer/customer on WhatsApp or phone prior to dispatch.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">4. Brand Trademarks &amp; Content</h2>
        <p className="m-0">
          All third-party brand names, logos, and product packaging images displayed on this website are the property of their respective trademark owners and are used strictly for product identification. See our{' '}
          <Link to="/image-credits" className="font-semibold text-brand no-underline hover:underline">Image Credits</Link> page for attribution details.
        </p>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-[18px] font-bold text-ink max-md:text-[16px]">5. Acceptable Use &amp; Governing Law</h2>
        <p className="m-0">
          You agree not to misuse the website, submit false orders, or attempt unauthorized access to admin systems. These terms are governed by the laws of India. For questions, please visit our{' '}
          <Link to="/#contact" className="font-semibold text-brand no-underline hover:underline">Contact Us</Link> section.
        </p>
      </section>
    </InfoPageLayout>
  )
}
