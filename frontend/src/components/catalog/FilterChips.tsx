interface Option {
  id: string
  name: string
}

interface FilterChipsProps {
  label: string
  options: Option[]
  value: string | null
  onChange: (id: string | null) => void
}

export default function FilterChips({ label, options, value, onChange }: FilterChipsProps) {
  const chip = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
      active ? 'border-brand bg-brand text-[#111]' : 'border-line bg-white text-ink hover:border-brand'
    }`
  return (
    <div className="flex items-center gap-3">
      <span className="hidden shrink-0 text-[11px] font-bold uppercase text-muted sm:block">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={label}>
        <button type="button" className={chip(!value)} onClick={() => onChange(null)}>
          All
        </button>
        {options.map((o) => (
          <button key={o.id} type="button" className={chip(value === o.id)} onClick={() => onChange(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  )
}
