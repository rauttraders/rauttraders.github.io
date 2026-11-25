import { ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import Brushstroke from './Brushstroke'

import { useStore } from '../../store/StoreContext'

interface HeroSliderProps {
  slides?: Slide[]
}

type Slide = { id: string; title: string; image: string; scale?: number }

const hop = (el: HTMLElement) =>
  el.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
    { duration: 400, easing: 'ease-out' },
  )

const arrowClass =
  'absolute z-30 top-[130px] flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-white p-0 text-[#7a7a7a] dark:bg-[#3a3b41] dark:text-[#b4b4b8] transition-colors hover:border-brand hover:text-brand'

const AUTO_MS = 3000

export default function HeroSlider({ slides: slidesProp }: HeroSliderProps) {
  const store = useStore().slides
  const slides: Slide[] = slidesProp ?? store
  const count = slides.length
  // Rendered track: [last clone, ...slides, first clone]; pos is the track index (1..count are real slides)
  const track = [slides[count - 1], ...slides, slides[0]]
  const [pos, setPos] = useState(1)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)
  const [bump, setBump] = useState<{ dir: 'left' | 'right' | null; n: number }>({ dir: null, n: 0 })
  const active = (pos - 1 + count) % count

  const next = () => setPos((p) => Math.min(p + 1, count + 1))
  const prev = () => setPos((p) => Math.max(p - 1, 0))

  // After sliding onto a clone, jump (without animation) to the matching real slide.
  const onTransitionEnd = () => {
    if (pos === count + 1) {
      setAnimate(false)
      setPos(1)
    } else if (pos === 0) {
      setAnimate(false)
      setPos(count)
    }
  }

  useEffect(() => {
    if (animate) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)))
    return () => cancelAnimationFrame(id)
  }, [animate])

  // Slides added/removed in the admin: start again from the first one.
  useEffect(() => {
    setAnimate(false)
    setPos(1)
  }, [count])

  // Auto-advance; any manual change (pos) restarts the timer.
  useEffect(() => {
    if (paused || count < 2) return
    const id = setTimeout(next, AUTO_MS)
    return () => clearTimeout(id)
  }, [pos, paused, count])

  if (count === 0) return (
    <div className="relative flex w-[440px] max-w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-brand/20 bg-brand/5 px-4 py-16 max-lg:py-12 max-md:py-10">
      <ImagePlus size={36} className="text-brand/30" aria-hidden />
      <p className="m-0 text-center text-[14px] font-semibold text-muted">
        No slides yet<br />
        <span className="text-[12px] font-normal">Add product images in <strong>Admin → Hero slider</strong></span>
      </p>
    </div>
  )
  const multi = count > 1

  return (
    <div
      className="relative flex w-[440px] max-w-full flex-col items-center gap-9 max-md:gap-5"
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Brushstroke />
      {multi && <button type="button" aria-label="Previous slide" onClick={(e) => { hop(e.currentTarget); prev(); setBump((b) => ({ dir: 'left', n: b.n + 1 })) }} className={`${arrowClass} -left-12 max-xl:left-1 max-md:top-[105px]`}>
        <ChevronLeft key={`l${bump.n}`} size={24} strokeWidth={2} className={bump.dir === 'left' ? 'arrow-bounce-left' : undefined} />
      </button>}
      {multi && <button type="button" aria-label="Next slide" onClick={(e) => { hop(e.currentTarget); next(); setBump((b) => ({ dir: 'right', n: b.n + 1 })) }} className={`${arrowClass} -right-12 max-xl:right-1 max-md:top-[105px]`}>
        <ChevronRight key={`r${bump.n}`} size={24} strokeWidth={2} className={bump.dir === 'right' ? 'arrow-bounce-right' : undefined} />
      </button>}

      <div className="relative z-20 h-[260px] w-full [overflow-x:clip] max-md:h-[210px]">
        <div
          className={`flex h-full ${animate ? 'transition-transform duration-500 ease-in-out' : ''}`}
          style={{ transform: `translateX(-${pos * 100}%)` }}
          onTransitionEnd={onTransitionEnd}
        >
          {track.map((s, i) => (
            <div
              key={i}
              role="group"
              aria-hidden={i !== pos}
              aria-label={`${(i - 1 + count) % count + 1} of ${count}`}
              className="flex h-full w-full shrink-0 items-center justify-center"
            >
              {/* Safe box: always inside the brush stroke, whatever the picture's shape. */}
              <img src={s.image} alt={s.title} className="h-[80%] w-[74%] -rotate-6 object-contain" draggable={false} />
            </div>
          ))}
        </div>
      </div>

      {multi && <div className="flex items-center gap-2.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active}
            onClick={() => setPos(i + 1)}
            className={`h-2 cursor-pointer rounded-full border-0 p-0 transition-all duration-300 ease-out hover:scale-110 ${i === active ? 'w-5 bg-brand' : 'w-2 bg-line hover:bg-brand/50'}`}
          />
        ))}
      </div>}
    </div>
  )
}
