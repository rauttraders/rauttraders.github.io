import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  Circle,
  Clock,
  Inbox,
  MessageSquareText,
  Phone,
  RefreshCw,
  Store,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { btnSoft, Card, PanelHeader } from '../ui/Card'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ContactMessage {
  id: number
  createdAt: string
  name: string
  shopName: string
  phone: string
  message: string
  read: boolean
  archived: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined })
}

// ── Message card ───────────────────────────────────────────────────────────────

function MessageCard({
  msg,
  selected,
  onMarkRead,
  onArchive,
  onDelete,
  showArchived,
}: {
  msg: ContactMessage
  selected: boolean
  onMarkRead: (id: number) => void
  onArchive: (id: number, archive: boolean) => void
  onDelete: (id: number) => void
  showArchived: boolean
}) {
  return (
    <div
      className={`group relative flex gap-4 rounded-xl border p-4 transition-colors max-md:gap-3 max-md:p-3 ${
        selected
          ? 'border-brand/40 bg-brand/5 dark:bg-brand/10'
          : msg.read
          ? 'border-[#ececf0] bg-white dark:border-[#45464c] dark:bg-[#2d2e33]'
          : 'border-brand/20 bg-[#fff8f7] dark:border-brand/20 dark:bg-[#2e2929]'
      }`}
    >
      {/* Unread dot */}
      {!msg.read && (
        <span className="absolute right-4 top-4 flex h-2 w-2 rounded-full bg-brand" aria-label="Unread" />
      )}

      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-[16px] font-bold dark:bg-brand/20 max-md:h-8 max-md:w-8 max-md:text-[14px]">
        {msg.name.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`m-0 truncate text-[14px] leading-tight max-md:text-[13px] ${msg.read ? 'font-semibold text-ink' : 'font-bold text-ink'}`}>
              {msg.name}
            </p>
            {msg.shopName && (
              <p className="m-0 mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted">
                <Store size={11} aria-hidden /> {msg.shopName}
              </p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
            <Clock size={11} aria-hidden /> {formatDate(msg.createdAt)}
          </span>
        </div>

        <p className="m-0 mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
          <Phone size={11} aria-hidden /> {msg.phone}
        </p>

        {msg.message && (
          <p className="m-0 mt-2 line-clamp-2 text-[13px] text-ink/80 dark:text-ink/70">
            {msg.message}
          </p>
        )}

        {/* Actions row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!msg.read && (
            <button
              type="button"
              onClick={() => onMarkRead(msg.id)}
              className="flex h-7 items-center gap-1.5 rounded-lg border border-[#d8d8df] bg-white px-2.5 text-[12px] font-semibold text-ink transition-colors hover:bg-brand/5 hover:border-brand/40 dark:border-[#55565d] dark:bg-[#34353a] dark:hover:bg-brand/10"
            >
              <CheckCheck size={13} aria-hidden /> Mark read
            </button>
          )}
          <button
            type="button"
            onClick={() => onArchive(msg.id, !showArchived ? true : false)}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-[#d8d8df] bg-white px-2.5 text-[12px] font-semibold text-ink transition-colors hover:bg-brand/5 hover:border-brand/40 dark:border-[#55565d] dark:bg-[#34353a] dark:hover:bg-brand/10"
          >
            {showArchived ? <ArchiveRestore size={13} aria-hidden /> : <Archive size={13} aria-hidden />}
            {showArchived ? 'Restore' : 'Archive'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(msg.id)}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-[12px] font-semibold text-[#c62f2c] transition-colors hover:bg-[#fdeaea] dark:text-[#ff8a87] dark:hover:bg-[#4a2f2f]"
          >
            <Trash2 size={13} aria-hidden /> Delete
          </button>
          <span className="ml-auto text-[11px] text-muted">#{msg.id}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [unread, setUnread] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const confirm = useConfirm()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      setError('')
      try {
        const data = await api<{ messages: ContactMessage[]; unread: number }>(
          `/admin/contacts${showArchived ? '?archived=1' : ''}`,
        )
        setMessages(data.messages)
        setUnread(data.unread)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [showArchived],
  )

  useEffect(() => {
    void load()
  }, [load])

  // Poll for new messages every 60 s while the tab is visible
  useEffect(() => {
    pollRef.current = setInterval(() => void load(true), 60_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load])

  const handleMarkRead = async (id: number) => {
    try {
      await api('/admin/contacts/read', { method: 'POST', body: { ids: [id] } })
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)))
      setUnread((n) => Math.max(0, n - 1))
    } catch {/* ignore */}
  }

  const handleMarkAllRead = async () => {
    const unreadIds = messages.filter((m) => !m.read).map((m) => m.id)
    if (!unreadIds.length) return
    try {
      await api('/admin/contacts/read', { method: 'POST', body: { ids: unreadIds } })
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
      setUnread(0)
    } catch {/* ignore */}
  }

  const handleArchive = async (id: number, archive: boolean) => {
    try {
      await api(`/admin/contacts/${id}/archive`, { method: 'PATCH', body: { archived: archive } })
      setMessages((prev) => prev.filter((m) => m.id !== id))
      if (!archive) return // restored from archive — no unread change needed
      const wasUnread = messages.find((m) => m.id === id)?.read === false
      if (wasUnread) setUnread((n) => Math.max(0, n - 1))
    } catch {/* ignore */}
  }

  const handleDelete = async (id: number) => {
    const go = await confirm({
      tone: 'danger',
      title: 'Delete this message?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
    })
    if (!go) return
    try {
      await api(`/admin/contacts/${id}`, { method: 'DELETE' })
      const wasUnread = messages.find((m) => m.id === id)?.read === false
      setMessages((prev) => prev.filter((m) => m.id !== id))
      if (wasUnread) setUnread((n) => Math.max(0, n - 1))
    } catch {/* ignore */}
  }

  const hasUnread = messages.some((m) => !m.read)

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <PanelHeader
            icon={Inbox}
            title="Inbox"
            subtitle={
              showArchived
                ? 'Archived messages'
                : unread > 0
                ? `${unread} unread message${unread !== 1 ? 's' : ''}`
                : 'All messages from your contact form'
            }
          />
          <div className="ml-auto flex items-center gap-2">
            {hasUnread && !showArchived && (
              <button type="button" className={`${btnSoft} !h-9`} onClick={() => void handleMarkAllRead()}>
                <CheckCheck size={15} aria-hidden /> Mark all read
              </button>
            )}
            <button
              type="button"
              className={`${btnSoft} !h-9`}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? <Inbox size={15} aria-hidden /> : <Archive size={15} aria-hidden />}
              {showArchived ? 'Inbox' : 'Archive'}
            </button>
            <button
              type="button"
              title="Refresh"
              className={`${btnSoft} !h-9 !w-9 !px-0`}
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={15} aria-hidden className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl bg-[#fdeaea] px-4 py-3 text-[13px] font-semibold text-[#c62f2c]">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[14px] font-semibold text-muted">Loading…</div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#d8d8df] bg-white py-20 text-center dark:border-[#45464c] dark:bg-[#2d2e33]">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20">
            {showArchived ? <Archive size={26} aria-hidden /> : <MessageSquareText size={26} aria-hidden />}
          </span>
          <div>
            <p className="m-0 text-[15px] font-bold text-ink">
              {showArchived ? 'No archived messages' : 'No messages yet'}
            </p>
            <p className="m-0 mt-1 text-[13px] text-muted">
              {showArchived
                ? 'Archived messages from your inbox will appear here.'
                : 'When visitors fill in the contact form on your website, their messages will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Unread count badge */}
          {!showArchived && unread > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Circle size={8} className="fill-brand text-brand" aria-hidden />
              <span className="text-[12px] font-bold uppercase tracking-wide text-brand">
                {unread} unread
              </span>
            </div>
          )}
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              selected={false}
              onMarkRead={(id) => void handleMarkRead(id)}
              onArchive={(id, archive) => void handleArchive(id, archive)}
              onDelete={(id) => void handleDelete(id)}
              showArchived={showArchived}
            />
          ))}
        </div>
      )}
    </div>
  )
}
