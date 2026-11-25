import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

const SIZE = 52
const STROKE = 3.5
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

/** Back-to-top button: light/dark friendly, fades + pops in, and a ring around it fills as you scroll down the page. */
export default function FloatingActions() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const y = window.scrollY
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0)
      setVisible(y > 500)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const pct = Math.round(progress * 100)

  return (
    <button
      type="button"
      aria-label="Back to top"
      title={`Back to top · ${pct}% scrolled`}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ width: SIZE, height: SIZE }}
      className={`group fixed bottom-5 right-5 z-[900] flex cursor-pointer items-center justify-center rounded-full border-0 bg-white p-0 text-brand shadow-[0_6px_18px_rgba(0,0,0,0.16)] outline-none transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(239,83,80,0.3)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-95 dark:bg-[#34353a] dark:shadow-[0_6px_18px_rgba(0,0,0,0.5)] max-md:bottom-4 max-md:right-4 ${
        visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-75 opacity-0'
      }`}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-[#ececf0] dark:stroke-[#45464c]" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="#ef5350"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
      <ArrowUp size={20} strokeWidth={2.5} aria-hidden className="relative transition-transform duration-300 group-hover:-translate-y-0.5 motion-safe:group-hover:animate-[back-top-bob_0.9s_ease-in-out_infinite]" />
    </button>
  )
}
