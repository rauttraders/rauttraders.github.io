/** Reusable shimmer skeleton building blocks and section-matched loading placeholders. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-box rounded-lg ${className}`} />
}

/** Matches PromoModal hero layout while settings and slides are loading. */
export function HeroSkeleton() {
  return (
    <section
      id="home"
      aria-label="Loading hero"
      className="flex min-h-[calc(100svh-64px)] w-full flex-col overflow-x-clip bg-[radial-gradient(ellipse_at_top_right,#ffeaea_0%,#ffffff_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,#3a2323_0%,#2b2c30_55%)] max-lg:min-h-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-[minmax(0,53fr)_minmax(0,47fr)] items-center max-lg:grid-cols-1 max-lg:gap-6 max-lg:py-6 max-md:gap-5 max-md:py-4">
        <div className="min-w-0 pl-3.5 pr-12 max-xl:pl-10 max-lg:px-8 max-lg:pb-2 md:max-lg:flex md:max-lg:flex-col md:max-lg:items-center max-md:px-4">
          <Skeleton className="h-12 w-44 rounded-xl max-md:h-10 max-md:w-36" />
          <Skeleton className="mt-9 h-11 w-[85%] max-w-[440px] max-lg:mt-5 max-md:mt-3.5 max-md:h-7" />
          <Skeleton className="mt-3 h-11 w-[72%] max-w-[380px] max-md:h-7" />
          <Skeleton className="mt-5 h-4 w-full max-w-[480px] max-md:mt-3" />
          <Skeleton className="mt-2 h-4 w-[82%] max-w-[390px]" />
          <div className="mt-[30px] flex gap-3.5 max-lg:mt-6 max-sm:gap-2.5">
            <Skeleton className="h-[52px] w-[194px] rounded-full max-sm:h-11 max-sm:flex-1" />
            <Skeleton className="h-[52px] w-[194px] rounded-full max-sm:h-11 max-sm:flex-1" />
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-center max-lg:order-first max-lg:px-8 max-md:px-4">
          <Skeleton className="h-[260px] w-[420px] max-w-full rounded-[44px] max-md:h-[175px] max-md:w-[300px]" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-around gap-6 overflow-hidden px-3.5 pb-8 max-xl:px-10 max-md:px-4 max-md:pb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`h-12 w-28 shrink-0 rounded-xl max-md:h-9 max-md:w-20 ${i > 2 ? 'max-sm:hidden' : ''}`} />
        ))}
      </div>
    </section>
  )
}

/** Matches the responsive 4/3/2-column ProductShowCard grid in ShopSection. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className="m-0 grid list-none grid-cols-4 gap-5 p-0 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-2 max-sm:gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex flex-col overflow-hidden rounded-2xl border border-[#ececf0] bg-white dark:border-[#45464c] dark:bg-[#34353a] max-sm:rounded-xl">
          <Skeleton className="h-[230px] w-full rounded-none max-md:h-[220px] max-sm:h-[145px]" />
          <div className="flex flex-1 flex-col p-4 max-sm:p-2.5">
            <Skeleton className="h-4 w-[82%] max-sm:h-3.5" />
            <Skeleton className="mt-2 h-3 w-[55%] max-sm:mt-1.5" />
            <Skeleton className="mb-3.5 mt-4 h-6 w-20 max-sm:mb-2.5 max-sm:mt-3 max-sm:h-5" />
            <div className="mt-auto flex gap-2 max-sm:gap-1.5">
              <Skeleton className="h-[46px] flex-1 rounded-full max-md:h-[42px] max-sm:h-[36px]" />
              <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-full max-md:h-[42px] max-md:w-[42px] max-sm:h-[36px] max-sm:w-[36px]" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Matches AboutSection layout (stats, highlights, and map/contact card). */
export function AboutSkeleton() {
  return (
    <section id="about" aria-label="Loading about section" className="scroll-mt-16 overflow-x-clip bg-white py-16 dark:bg-[#2d2e33] max-lg:py-12 max-md:py-8">
      <div className="mx-auto w-full max-w-[1200px] px-3.5 max-xl:px-10 max-md:px-4">
        <div className="grid grid-cols-2 items-start gap-10 max-lg:grid-cols-1 max-lg:gap-8 max-md:gap-6">
          <div className="min-w-0">
            <Skeleton className="h-8 w-[78%] max-md:h-7" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-[88%]" />
            <div className="mt-6 flex flex-wrap gap-3 max-md:mt-4 max-md:gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 min-w-[120px] flex-1 rounded-xl" />
              ))}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 max-lg:mt-6 max-md:mt-5 max-md:gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-[#ececf0] p-4 dark:border-[#45464c] max-md:rounded-xl max-md:p-3">
                  <Skeleton className="h-10 w-10 rounded-full max-md:h-8 max-md:w-8" />
                  <Skeleton className="mt-3 h-4 w-[70%]" />
                  <Skeleton className="mt-2 h-3 w-[95%]" />
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-[#ececf0] bg-white dark:border-[#45464c] dark:bg-[#34353a] max-md:rounded-2xl">
            <Skeleton className="h-[280px] w-full rounded-none max-md:h-[200px]" />
            <div className="grid grid-cols-2 gap-3 p-5 max-sm:grid-cols-1 max-md:p-3.5">
              <Skeleton className="col-span-2 h-16 rounded-2xl max-sm:col-span-1" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Matches AdminLayout (sidebar, top header, stat cards, and dashboard panels). */
export function AdminSkeleton() {
  return (
    <div role="status" aria-label="Loading admin panel" className="flex min-h-screen bg-[#f4f4f7] dark:bg-[#26272b]">
      <aside className="hidden w-[250px] shrink-0 flex-col gap-3 border-r border-[#ececf0] bg-white p-4 dark:border-[#45464c] dark:bg-[#2d2e33] lg:flex">
        <Skeleton className="mb-3 h-10 w-36 rounded-xl" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[#ececf0] bg-white px-6 dark:border-[#45464c] dark:bg-[#2d2e33] max-md:h-14 max-md:px-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </header>
        <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-5 p-6 max-md:p-4">
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl max-md:h-20" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-56 rounded-2xl" />
        </main>
      </div>
    </div>
  )
}

/** Matches InboxPage message list while contacts are loading. */
export function InboxSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[#ececf0] bg-white p-4 dark:border-[#45464c] dark:bg-[#34353a]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3.5 w-[90%]" />
          <Skeleton className="mt-1.5 h-3.5 w-[65%]" />
        </div>
      ))}
    </div>
  )
}

/** Matches InfoPageLayout article blocks while settings load. */
export function InfoPageSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[78%]" />
        </div>
      ))}
    </div>
  )
}
