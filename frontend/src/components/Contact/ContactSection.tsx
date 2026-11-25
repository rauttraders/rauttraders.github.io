import { CheckCircle2, MessageSquareText, RotateCcw, Send } from 'lucide-react'
import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { validateOrderCustomer } from '../../lib/order'
import type { OrderErrors } from '../../lib/order'
import Reveal from '../ui/Reveal'
import SectionHeader from '../ui/SectionHeader'
import ContactIllustration from './ContactIllustration'
import Field from '../Order/Field'
import { useStore } from '../../store/StoreContext'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactSection() {
  const { settings } = useStore()
  const [form, setForm] = useState({ name: '', shopName: '', phone: '', message: '' })
  const [errors, setErrors] = useState<OrderErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [serverError, setServerError] = useState('')
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setServerError('')
  }

  const reset = () => {
    setForm({ name: '', shopName: '', phone: '', message: '' })
    setErrors({})
    setServerError('')
    setStatus('idle')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateOrderCustomer(form, false)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setStatus('sending')
    setServerError('')
    try {
      await api('/contact', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          shopName: form.shopName.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        },
      })
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16 bg-dots bg-[#faf7f7] py-16 dark:bg-[#26272b] max-lg:py-12 max-md:py-8">
      <div className="mx-auto w-full max-w-[1200px] px-3.5 max-xl:px-10 max-md:px-4">
        <div className="grid grid-cols-2 items-start gap-10 max-lg:grid-cols-1 max-lg:gap-8 max-md:gap-5">
          <Reveal>
            <SectionHeader title={settings.contact.title} titleId="contact-title">
              {settings.contact.text}
            </SectionHeader>
            <div className="mt-8 max-lg:mt-6 max-md:hidden">
              <ContactIllustration />
            </div>
          </Reveal>

          <Reveal delay={120}>
            {status === 'sent' ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-[#d4edda] bg-[#f0faf3] p-10 text-center shadow-[0_8px_28px_rgba(0,0,0,0.06)] dark:border-[#2d5a3a] dark:bg-[#1e3a2a]">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1baf7a]/15 text-[#1baf7a]">
                  <CheckCircle2 size={36} aria-hidden />
                </span>
                <div>
                  <h3 className="m-0 text-[18px] font-bold text-ink">Message sent!</h3>
                  <p className="m-0 mt-2 text-[14px] text-muted">Thanks for reaching out. We'll get back to you shortly.</p>
                </div>
                <button type="button" onClick={reset} className="mt-2 flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.3)] transition-all hover:bg-brand-hover">
                  <RotateCcw size={15} aria-hidden /> Send another message
                </button>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-3.5 rounded-2xl border border-[#ececf0] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-md:gap-3 max-md:p-4">
                <div className="-mx-6 -mt-6 mb-2 flex items-center gap-3 border-b border-[#e3e3e8] px-6 py-4 dark:border-[#45464c] max-md:-mx-4 max-md:-mt-4 max-md:mb-1 max-md:px-4 max-md:py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20">
                    <MessageSquareText size={19} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="m-0 text-[16px] font-semibold leading-tight text-ink">Send us a message</h3>
                    <p className="m-0 mt-0.5 text-[12.5px] text-muted">Tell us what you need and we'll get back to you</p>
                  </div>
                </div>
                <Field label="Your name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                <Field label="Shop name" value={form.shopName} onChange={set('shopName')} autoComplete="organization" optional />
                <Field label="Phone number" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
                <Field label="Message" value={form.message} onChange={set('message')} multiline optional />
                {serverError && (
                  <p role="alert" className="m-0 rounded-xl bg-[#fdeaea] px-4 py-2.5 text-[13px] font-semibold text-[#c62f2c] dark:bg-[#3a2a2a] dark:text-[#ff9f9d]">
                    {serverError}
                  </p>
                )}
                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-[46px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand/10 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white dark:bg-brand/20"
                  >
                    Reset
                    <span aria-hidden className="h-5 w-px bg-current opacity-30" />
                    <RotateCcw size={16} aria-hidden />
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="flex h-[46px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-all hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60"
                  >
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                    <span aria-hidden className="h-5 w-px bg-white/50" />
                    <Send size={16} aria-hidden />
                  </button>
                </div>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
