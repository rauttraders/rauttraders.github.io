import { useStore } from '../../store/StoreContext'

function parseDescription(raw: string): { text: string; steps: { num?: string; label: string }[] } {
  const match = raw.match(/\{([^}]+)\}/)
  if (!match) return { text: raw.trim(), steps: [] }
  const text = raw.replace(/\{[^}]+\}/g, '').replace(/\s{2,}/g, ' ').trim()
  const parts = match[1]
    .split(/(?=\b\d+\s*[.):-])/)
    .map((s) => s.trim())
    .filter(Boolean)
  const steps = parts.map((p) => {
    const m = p.match(/^(\d+)\s*[.):-]\s*(.+)$/)
    return m ? { num: m[1], label: m[2].trim() } : { label: p }
  })
  return { text, steps }
}

export default function PromoContent() {
  const { hero } = useStore().settings
  const { text, steps } = parseDescription(hero.description ?? '')
  return (
    <>
      <h1 className="mt-9 text-[44px] font-light leading-[1.2] tracking-[-1.2px] text-ink max-lg:mt-5 max-lg:text-[36px] max-md:mt-3.5 max-md:text-[26px] max-md:tracking-[-0.6px]">
        {hero.line1}
        <br />
        {hero.line2}{' '}
        <span className="bg-gradient-to-r from-brand to-[#ff8a65] bg-clip-text font-extrabold text-transparent">
          {hero.highlight}
        </span>
      </h1>
      {text && (
        <p className="mt-5 max-w-[540px] text-lg font-light leading-[1.65] text-muted max-lg:mt-3.5 max-lg:text-[16px] max-md:mt-2.5 max-md:text-[14px] max-md:leading-[1.55]">
          {text}
        </p>
      )}
      {steps.length > 0 && (
        <ol className="m-0 mt-4 flex list-none flex-wrap items-center gap-2 p-0 max-lg:justify-center max-md:mt-3 max-md:gap-1.5">
          {steps.map((s, idx) => (
            <li
              key={`${s.label}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/[0.06] py-1 pl-1.5 pr-3 text-[11.5px] font-bold tracking-wide text-ink dark:border-brand/30 dark:bg-brand/15 max-md:py-0.5 max-md:pl-1 max-md:pr-2.5 max-md:text-[10.5px]"
            >
              {s.num && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-extrabold text-white">
                  {s.num}
                </span>
              )}
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
