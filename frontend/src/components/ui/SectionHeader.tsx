import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  titleId: string
  children?: ReactNode
}

/** Shared section heading: bold title with a brand accent bar, and intro text. */
export default function SectionHeader({ title, titleId, children }: SectionHeaderProps) {
  return (
    <header>
      <h2 id={titleId} className="m-0 text-[32px] font-extrabold leading-tight tracking-[-0.5px] text-ink max-lg:text-[28px] max-md:text-[22px]">
        {title}
      </h2>
      <span aria-hidden className="mt-3 block h-1 w-12 rounded-full bg-brand max-md:mt-2 max-md:w-10" />
      {children && <p className="mb-0 mt-4 max-w-[560px] text-[15px] leading-[1.6rem] text-muted max-md:mt-2.5 max-md:text-[13.5px] max-md:leading-[1.35rem]">{children}</p>}
    </header>
  )
}
