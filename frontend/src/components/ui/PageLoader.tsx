import logoUrl from '../../assets/sortlogo.png'

interface PageLoaderProps {
  label?: string
  /** Overlay mode keeps the underlying page mounted and fades out cleanly once ready. */
  overlay?: boolean
  visible?: boolean
}

/**
 * Full-screen branded loader matching the Raut Traders UI:
 * brand-red spinning ring around the shop logo on light/dark surface.
 */
export default function PageLoader({ label = 'Loading…', overlay = false, visible = true }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      className={`${
        overlay
          ? `fixed inset-0 z-[1500] transition-opacity duration-300 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`
          : 'min-h-screen'
      } flex flex-col items-center justify-center gap-4 bg-[#e9ebf0] px-4 dark:bg-[#2b2c30]`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:bg-[#34353a]">
        <span
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#ececf0] border-t-brand dark:border-[#45464c] dark:border-t-brand motion-reduce:animate-none"
        />
        <img src={logoUrl} alt="Raut Traders" className="h-10 w-10 object-contain" />
      </div>
      <div className="text-center">
        <p className="m-0 text-[16px] font-extrabold tracking-wide text-ink">
          Raut <span className="text-brand">Trader&apos;s</span>
        </p>
        <p className="m-0 mt-1 text-[13px] font-semibold text-muted">{label}</p>
      </div>
    </div>
  )
}
