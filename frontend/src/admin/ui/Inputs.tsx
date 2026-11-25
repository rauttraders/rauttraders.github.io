import { Check } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import Select from './Select'
import type { Option } from './Select'

const base =
  'w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none transition-all focus:border-brand focus:shadow-[0_0_0_3px_rgba(239,83,80,0.15)] dark:bg-[#2b2c30] max-md:px-3 max-md:text-[13px]'

interface WrapProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function FieldWrap({ label, hint, error, children, className = '' }: WrapProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && !error && <span className="text-[11px] text-muted">{hint}</span>}
      {error && <span className="text-xs font-medium text-[#c62f2c]">{error}</span>}
    </label>
  )
}

type Common = { label: string; hint?: string; error?: string; wrapClass?: string }

export function TextInput({ label, hint, error, wrapClass, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap label={label} hint={hint} error={error} className={wrapClass}>
      <input {...rest} aria-invalid={!!error} className={`${base} h-[44px] max-md:h-[38px] ${error ? 'border-[#c62f2c]' : ''}`} />
    </FieldWrap>
  )
}

/**
 * Indian phone/WhatsApp input with a non-editable gray "+91 " prefix.
 * Stores/returns `91XXXXXXXXXX` (or `""` when empty) so backend and wa.me links stay unaffected.
 */
export function IndiaPhoneInput({
  label,
  hint,
  error,
  wrapClass,
  value,
  onValueChange,
  placeholder = '9876543210',
}: Common & { value: string; onValueChange: (full: string) => void; placeholder?: string }) {
  const digitsOnly = value.replace(/\D/g, '')
  const local = digitsOnly.startsWith('91') && digitsOnly.length > 10 ? digitsOnly.slice(2, 12) : digitsOnly === '91' ? '' : digitsOnly.slice(0, 10)
  return (
    <FieldWrap label={label} hint={hint} error={error} className={wrapClass}>
      <div className={`flex h-[44px] max-md:h-[38px] w-full overflow-hidden rounded-xl border bg-white transition-all focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(239,83,80,0.15)] dark:bg-[#2b2c30] ${error ? 'border-[#c62f2c]' : 'border-line'}`}>
        <span
          aria-hidden
          className="flex shrink-0 select-none items-center border-r border-line bg-[#ececf0] px-3 text-sm font-bold text-[#596579] dark:border-[#45464c] dark:bg-[#3a3b41] dark:text-[#b4b4b8] max-md:px-2.5 max-md:text-[13px]"
        >
          +91&nbsp;
        </span>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={local}
          placeholder={placeholder}
          aria-invalid={!!error}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 10)
            onValueChange(d ? `91${d}` : '')
          }}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3.5 text-sm text-ink outline-none max-md:px-3 max-md:text-[13px]"
        />
      </div>
    </FieldWrap>
  )
}

export function TextArea({ label, hint, error, wrapClass, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap label={label} hint={hint} error={error} className={wrapClass}>
      <textarea rows={3} {...rest} aria-invalid={!!error} className={`${base} resize-y py-2.5 ${error ? 'border-[#c62f2c]' : ''}`} />
    </FieldWrap>
  )
}

export function SelectInput({ label, hint, error, wrapClass, options, value, onChange, placeholder }: Common & { options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Select className={wrapClass} label={label} hint={hint} error={error} options={options} value={value} onChange={onChange} placeholder={placeholder} />
}

/** Styled checkbox (replaces the native one). */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-[13px] text-ink">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${checked ? 'border-brand bg-brand text-white' : 'border-[#c9c9ce] bg-white dark:border-[#55565d] dark:bg-[#2b2c30]'}`}>
        {checked && <Check size={13} strokeWidth={3.5} aria-hidden />}
      </span>
      {label}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] font-semibold text-ink max-sm:gap-2 max-sm:text-[13px]">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 transition-colors ${checked ? 'bg-brand' : 'bg-[#c9c9ce] dark:bg-[#55565d]'}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      {label}
    </label>
  )
}
