import { Camera, Check, Download, Eye, EyeOff, KeyRound, LogOut, Palette, Save, SlidersHorizontal, Trash2, Upload, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { useTheme } from '../../hooks/useTheme'
import { useStore } from '../../store/StoreContext'
import { useAuth } from '../auth'
import { CROP_PRESETS } from '../imageTools'
import ImageCropDialog from '../ui/ImageCropDialog'
import Avatar from '../ui/Avatar'
import { btnDanger, btnPrimary, btnSoft, Card, PanelHeader } from '../ui/Card'
import { TextInput } from '../ui/Inputs'
import Select from '../ui/Select'
import { validateBackupFile, validateEmail, validatePassword, validateUsername } from '../../lib/validation'

const IDLE_OPTIONS = [
  { value: '0', label: 'Never' },
  { value: '15', label: 'After 15 minutes' },
  { value: '30', label: 'After 30 minutes' },
  { value: '60', label: 'After 1 hour' },
  { value: '240', label: 'After 4 hours' },
]
const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

/** 0–4 score from length and character variety. */
function strength(p: string): { score: number; label: string } {
  let n = 0
  if (p.length >= 8) n++
  if (p.length >= 12) n++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) n++
  return { score: p ? Math.max(1, n) : 0, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][p ? Math.max(1, n) : 0] }
}
const STRENGTH_COLOR = ['', '#e53935', '#eda100', '#1baf7a', '#008300']

function useFlash() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])
  return [msg, setMsg] as const
}

const Ok = ({ children }: { children: string }) => (
  <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1c6b3c] dark:text-[#7fd6a1]"><Check size={15} aria-hidden /> {children}</span>
)

function ProfileCard() {
  const { profile, updateProfile } = useAuth()
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [err, setErr] = useState('')
  const [ok, setOk] = useFlash()
  const dirty = name !== profile.name || email !== profile.email
  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
  }, [profile.name, profile.email])

  const [cropSrc, setCropSrc] = useState<File | string | null>(null)
  const onPhoto = (f?: File) => {
    if (f) setCropSrc(f)
  }
  const applyPhoto = async (url: string) => {
    setCropSrc(null)
    const e = await updateProfile({ photo: url })
    if (e) return setErr(e)
    setErr('')
    setOk('Photo updated')
  }
  const save = async () => {
    if (!name.trim()) return setErr('Enter your name.')
    const emailProblem = validateEmail(email.trim())
    if (emailProblem) return setErr(emailProblem)
    const e = await updateProfile({ name: name.trim(), email: email.trim() })
    if (e) return setErr(e)
    setErr('')
    setOk('Profile saved')
  }

  return (
    <Card>
      <PanelHeader icon={UserRound} title="Profile" subtitle="Your photo and name, shown at the top right of the admin" />
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar photo={profile.photo} name={profile.name} size={96} className="ring-4 ring-brand/15" />
          <label title="Change photo" className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-[0_4px_10px_rgba(239,83,80,0.45)] transition-transform hover:scale-105">
            <Camera size={16} aria-hidden />
            <span className="sr-only">Upload profile photo</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${btnSoft} !h-9`}>
            <Upload size={15} aria-hidden /> Upload photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {profile.photo && <button type="button" className={`${btnDanger} !h-9 !px-4`} onClick={() => { void updateProfile({ photo: '' }).then(() => setOk('Photo removed')) }}><Trash2 size={14} aria-hidden /> Remove</button>}
        </div>
      </div>

      {cropSrc && <ImageCropDialog src={cropSrc} preset={CROP_PRESETS.avatar} onCancel={() => setCropSrc(null)} onApply={(u) => void applyPhoto(u)} />}

      <div className="mt-6 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <TextInput label="Display name" value={name} onChange={(e) => { setName(e.target.value); setErr('') }} autoComplete="name" />
        <TextInput label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr('') }} autoComplete="email" />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#ececf0] pt-4 dark:border-[#45464c]">
        <button type="button" className={btnPrimary} disabled={!dirty} onClick={() => void save()}><Save size={15} aria-hidden /> Save profile</button>
        {err ? <span role="alert" className="text-[13px] font-semibold text-[#c62f2c]">{err}</span> : ok ? <Ok>{ok}</Ok> : null}
      </div>
    </Card>
  )
}

function SecurityCard() {
  const { username, usingDefaults, changeCredentials } = useAuth()
  const [user, setUser] = useState(username)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useFlash()
  const st = useMemo(() => strength(next), [next])

  const pass = (label: string, v: string, set: (s: string) => void, auto: string) => (
    <TextInput label={label} type={show ? 'text' : 'password'} value={v} onChange={(e) => { set(e.target.value); setErr('') }} autoComplete={auto} />
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cur) return setErr('Enter your current password to confirm it\'s you.')
    const userProblem = validateUsername(user.trim())
    if (userProblem) return setErr(userProblem)
    if (next) {
      const passProblem = validatePassword(next, user.trim())
      if (passProblem) return setErr(passProblem)
      if (next === cur) return setErr('The new password must be different from the current one.')
      if (next !== again) return setErr('The new passwords do not match.')
    }
    if (!next && user.trim() === username) return setErr('Nothing to change — enter a new username or password.')
    setBusy(true)
    const e2 = await changeCredentials({ currentPassword: cur, newUsername: user.trim(), newPassword: next || undefined })
    setBusy(false)
    if (e2) return setErr(e2)
    setCur('')
    setNext('')
    setAgain('')
    setErr('')
    setOk('Sign-in details updated')
  }

  return (
    <Card>
      <PanelHeader icon={KeyRound} title="Sign-in & security" subtitle="Change your username or password" />
      {usingDefaults && <p className="mb-4 mt-0 rounded-xl bg-[#fff4f4] px-4 py-3 text-[13px] font-semibold text-[#8a2c2a] dark:bg-[#3a2e2e] dark:text-[#ffb3b0]">You're still using the default password. Change it now before putting this site online.</p>}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextInput label="Username" value={user} onChange={(e) => { setUser(e.target.value); setErr('') }} autoComplete="username" wrapClass="max-w-[360px]" />
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          {pass('Current password', cur, setCur, 'current-password')}
          <div>
            {pass('New password', next, setNext, 'new-password')}
            {next && (
              <div className="mt-2" aria-live="polite">
                <div className="flex gap-1.5">{[1, 2, 3, 4].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full bg-[var(--color-line)]" style={st.score >= i ? { background: STRENGTH_COLOR[st.score] } : undefined} />)}</div>
                <p className="m-0 mt-1 text-xs font-semibold text-muted">Strength: <span style={{ color: STRENGTH_COLOR[st.score] }}>{st.label}</span></p>
              </div>
            )}
          </div>
          {pass('Confirm new password', again, setAgain, 'new-password')}
        </div>
        <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex w-fit cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-semibold text-muted hover:text-brand">
          {show ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />} {show ? 'Hide passwords' : 'Show passwords'}
        </button>
        <p className="m-0 text-xs text-muted">Leave the new password blank to change only the username. Use 8+ characters; mixing cases, numbers and symbols makes it stronger.</p>
        <div className="flex flex-wrap items-center gap-3 border-t border-[#ececf0] pt-4 dark:border-[#45464c]">
          <button type="submit" className={btnPrimary} disabled={busy}><KeyRound size={15} aria-hidden /> Update sign-in details</button>
          {err ? <span role="alert" className="text-[13px] font-semibold text-[#c62f2c]">{err}</span> : ok ? <Ok>{ok}</Ok> : null}
        </div>
      </form>
    </Card>
  )
}

function PreferencesCard() {
  const { prefs, updatePrefs } = useAuth()
  const { theme, setTheme } = useTheme()
  return (
    <Card>
      <PanelHeader icon={SlidersHorizontal} title="Preferences" subtitle="Saved on this device" />
      <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">Theme</span>
          <div className="flex h-[44px] items-center gap-3 rounded-xl border border-line px-3.5">
            <Palette size={16} aria-hidden className="text-brand" />
            <span id="pref-theme" className="flex-1 text-sm text-ink">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            <button type="button" role="switch" aria-checked={theme === 'dark'} aria-labelledby="pref-theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors ${theme === 'dark' ? 'bg-brand' : 'bg-[#c9c9ce] dark:bg-[#55565d]'}`}>
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        <Select label="Dashboard opens on" value={String(prefs.defaultRangeDays)} onChange={(v) => updatePrefs({ defaultRangeDays: Number(v) })} options={RANGE_OPTIONS} hint="The date range the dashboard starts with." />
        <Select label="Auto sign-out when idle" value={String(prefs.idleMinutes)} onChange={(v) => updatePrefs({ idleMinutes: Number(v) })} options={IDLE_OPTIONS} hint="Signs you out after no activity, e.g. on a shared computer." />
      </div>
    </Card>
  )
}

function DataCard() {
  const confirm = useConfirm()
  const { exportJson, importJson } = useStore()
  const { logout } = useAuth()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const download = async () => {
    try {
      const url = URL.createObjectURL(new Blob([await exportJson()], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `raut-traders-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg({ ok: true, text: 'Backup downloaded.' })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    }
  }
  const restore = async (f?: File) => {
    if (!f) return
    const fileProblem = validateBackupFile(f)
    if (fileProblem) return setMsg({ ok: false, text: fileProblem })
    const go = await confirm({ tone: 'warning', title: 'Restore this backup?', message: 'Your current products, orders and site settings will be replaced by the ones in this file.', details: [{ label: 'File', value: f.name }, { label: 'Size', value: `${Math.max(1, Math.round(f.size / 1024))} KB` }], confirmLabel: 'Restore backup' })
    if (!go) return
    const err = await importJson(await f.text())
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Backup restored.' })
  }

  return (
    <Card>
      <PanelHeader icon={Download} title="Backup & session" subtitle="Your data lives on the server — keep a copy of it too" />
      <p className="mb-4 mt-0 text-[13px] text-muted">A backup has your products, brands, slides, orders and site text (not your password). The server also keeps a daily safety copy in its data folder.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} onClick={() => void download()}><Download size={15} aria-hidden /> Download backup</button>
        <label className={btnSoft}>
          <Upload size={15} aria-hidden /> Restore from file
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <button type="button" className={`${btnDanger} ml-auto max-sm:ml-0`} onClick={logout}><LogOut size={15} aria-hidden /> Sign out</button>
      </div>
      {msg && (msg.ok ? <p className="mb-0 mt-3"><Ok>{msg.text}</Ok></p> : <p role="alert" className="mb-0 mt-3 text-[13px] font-semibold text-[#c62f2c]">{msg.text}</p>)}
    </Card>
  )
}

export default function AccountPage() {
  const { usingDefaults } = useAuth()
  const securityRef = useRef<HTMLDivElement>(null)

  // When the admin is forced here due to a temporary password, scroll to the security card immediately
  useEffect(() => {
    if (usingDefaults && securityRef.current) {
      securityRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [usingDefaults])

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-5">
      {/* When using a temp password show security card first so it's the first thing they see */}
      {usingDefaults ? (
        <>
          <div ref={securityRef}><SecurityCard /></div>
          <ProfileCard />
        </>
      ) : (
        <>
          <ProfileCard />
          <div ref={securityRef}><SecurityCard /></div>
        </>
      )}
      <PreferencesCard />
      <DataCard />
    </div>
  )
}
