interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  autoComplete?: string
  multiline?: boolean
  optional?: boolean
  placeholder?: string
}

const base =
  'w-full rounded-lg border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-brand dark:bg-[#34353a]'

export default function Field({ label, value, onChange, error, type = 'text', autoComplete, multiline, optional, placeholder }: FieldProps) {
  const border = error ? 'border-[#c62f2c]' : 'border-line'
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
      <span>
        {label}
        {optional && <span className="font-normal"> (optional)</span>}
      </span>
      {multiline ? (
        <textarea value={value} rows={3} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${base} ${border} resize-none py-2.5`} />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} ${border} h-[44px]`}
        />
      )}
      {error && <span className="font-medium text-[#c62f2c]">{error}</span>}
    </label>
  )
}
