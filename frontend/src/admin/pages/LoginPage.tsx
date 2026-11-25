import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout'
import { AdminIllustration } from '../../components/auth/illustrations'
import { useStore } from '../../store/StoreContext'
import { useAuth } from '../auth'
import logo from '../../assets/logo.png'

export default function LoginPage() {
  const { authed, login } = useAuth()
  const { settings } = useStore()
  const navigate = useNavigate()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (authed === null) return null
  if (authed) return <Navigate to="/admin" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const err = await login(user, pass)
    setBusy(false)
    if (err) setError(err)
    else navigate('/admin', { replace: true })
  }

  const input =
    'h-[46px] w-full rounded-full border border-line bg-white pl-11 pr-4 text-sm text-ink outline-none transition-all focus:border-brand focus:shadow-[0_0_0_3px_rgba(239,83,80,0.15)] dark:bg-[#2b2c30] max-md:h-[40px] max-md:pl-10 max-md:text-[13px]'

  return (
    <AuthLayout
      illustration={<AdminIllustration />}
      headline="Run your shop from one place"
      text="Orders, products, brands and your website content, all managed from the admin panel."
      bullets={['See new orders the moment they arrive', 'Confirm, deliver and message customers', 'Charts for sales, brands and busy hours']}
      backTo="/"
      backLabel="Back to store"
    >
      <form onSubmit={submit} noValidate className="relative z-10 w-full max-w-[400px] rounded-3xl border border-[#ececf0] bg-white p-8 shadow-[0_20px_50px_rgba(239,83,80,0.18)] dark:border-[#45464c] dark:bg-[#34353a] dark:shadow-none max-lg:p-6 max-md:rounded-2xl max-md:p-5">
        <img src={logo} alt="" className="logo-outline mx-auto hidden h-[48px] w-auto object-contain max-lg:block max-md:h-[38px]" />
        <h1 className="mb-0 mt-5 text-center text-[24px] font-extrabold text-ink max-md:mt-3.5 max-md:text-[20px]">Admin sign in</h1>
        <p className="mb-0 mt-1.5 text-center text-[14px] text-muted max-md:text-[13px]">Manage {settings.business.name || 'your shop'}: products, orders and site content.</p>

        <label className="mt-6 block max-md:mt-4">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Username</span>
          <span className="relative block">
            <User size={16} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input value={user} onChange={(e) => { setUser(e.target.value); setError('') }} placeholder="Enter your username" autoComplete="username" autoFocus className={input} />
          </span>
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Password</span>
          <span className="relative block">
            <Lock size={16} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => { setPass(e.target.value); setError('') }} placeholder="Enter your password" autoComplete="current-password" className={`${input} pr-11`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:text-brand">
              {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </span>
        </label>

        {error && <p role="alert" className="mb-0 mt-3 text-center text-[13px] font-semibold text-[#c62f2c]">{error}</p>}

        <button type="submit" disabled={busy} className="mt-6 flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-brand text-sm font-semibold text-white shadow-[0_4px_12px_rgba(239,83,80,0.35)] transition-all hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 max-md:mt-5 max-md:h-[42px] max-md:text-[13px]">
          Sign in
          <span aria-hidden className="h-5 w-px bg-white/50" />
          <LogIn size={16} aria-hidden />
        </button>
      </form>
    </AuthLayout>
  )
}
