import { CheckCheck, Mic, Paperclip, Phone, Smile, Video } from 'lucide-react'
import type { ReactNode } from 'react'

/** Renders WhatsApp's *bold*, _italic_ and ~strike~ markup the way the chat does. */
function renderMarkup(line: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index))
    if (m[1] !== undefined) parts.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] !== undefined) parts.push(<em key={k++}>{m[2]}</em>)
    else parts.push(<s key={k++}>{m[3]}</s>)
    last = m.index + m[0].length
  }
  if (last < line.length) parts.push(line.slice(last))
  return parts
}

interface Props {
  /** The message text exactly as it will be sent. */
  text: string
  /** Chat title (the shop). */
  name: string
  time?: string
}

/** A WhatsApp-style phone chat showing the order message as the customer's outgoing bubble. */
export default function WhatsAppPreview({ text, name, time = '10:42 am' }: Props) {
  const lines = text.split('\n')
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[30px] border-[7px] border-[#1f2023] bg-[#efeae2] shadow-[0_14px_36px_rgba(0,0,0,0.25)] dark:bg-[#0b141a]">
      {/* header */}
      <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5 text-white dark:bg-[#202c33]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px] font-bold">{(name.trim().charAt(0) || 'S').toUpperCase()}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="m-0 truncate text-[14px] font-semibold">{name || 'Shop'}</p>
          <p className="m-0 text-[11px] opacity-80">online</p>
        </div>
        <Video size={17} aria-hidden className="opacity-90" />
        <Phone size={16} aria-hidden className="opacity-90" />
      </div>

      {/* chat */}
      <div className="max-h-[min(680px,calc(100vh-260px))] min-h-[300px] overflow-y-auto px-2.5 py-3" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        <p className="mx-auto mb-3 w-fit rounded-md bg-white/85 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">Today</p>
        <div className="relative ml-auto w-fit max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1 pt-1.5 text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#005c4b] dark:text-[#e9edef]">
          <span aria-hidden className="absolute -right-[7px] top-0 h-0 w-0 border-l-[8px] border-t-[8px] border-l-[#d9fdd3] border-t-transparent dark:border-l-[#005c4b]" />
          <div className="whitespace-pre-wrap break-words text-[13px] leading-[1.35]">
            {lines.map((l, i) => (
              <div key={i} className={l === '' ? 'h-[0.7em]' : undefined}>{renderMarkup(l)}</div>
            ))}
          </div>
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#8696a0]">
            {time}
            <CheckCheck size={14} aria-hidden className="text-[#53bdeb]" />
          </div>
        </div>
      </div>

      {/* input bar */}
      <div className="flex items-center gap-2 bg-[#f0f2f5] px-2.5 py-2 dark:bg-[#202c33]">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-white px-3 text-[13px] text-[#8696a0] dark:bg-[#2a3942]">
          <Smile size={17} aria-hidden /> <span className="flex-1">Message</span> <Paperclip size={16} aria-hidden />
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white"><Mic size={17} aria-hidden /></span>
      </div>
    </div>
  )
}
