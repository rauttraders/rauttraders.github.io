import { Fragment } from 'react'

interface HighlightTextProps {
  text: string
  query?: string
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Highlights case-insensitive matches of `query` inside `text` like a text selection. */
export default function HighlightText({ text, query = '' }: HighlightTextProps) {
  const term = query.trim()
  if (!term) return <>{text}</>

  const re = new RegExp(`(${escapeRegExp(term)})`, 'gi')
  const parts = text.split(re)
  if (parts.length === 1) return <>{text}</>

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[2px] bg-[#ffe58f] px-0.5 text-[#111] dark:bg-[#eab308]/35 dark:text-white">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
