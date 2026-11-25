import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, getToken, setToken } from '../lib/api'
import { uploadRef, uploadUrl } from '../lib/media'

/**
 * Sign-in is handled by the Node server (salted scrypt password hash, HttpOnly session cookie).
 * Only personal preferences (dashboard range, idle timeout) are kept on this device.
 */
const PREFS_KEY = 'rt-admin-prefs'

export interface Profile {
  name: string
  email: string
  /** Avatar URL ('' = show initials). */
  photo: string
}
export interface Prefs {
  /** Dashboard opens on the last N days. */
  defaultRangeDays: number
  /** Auto sign-out after this many idle minutes (0 = never). */
  idleMinutes: number
}

const DEFAULT_PREFS: Prefs = { defaultRangeDays: 30, idleMinutes: 60 }
const DEFAULT_PROFILE: Profile = { name: 'Administrator', email: '', photo: '' }

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>) }
  } catch {
    return DEFAULT_PREFS
  }
}

interface Me {
  user: string
  profile: Profile
  mustChange: boolean
  /** Only in the sign-in answer: the session token for this tab. */
  token?: string
}

/** The server stores the avatar as "/uploads/<id>"; point it at the API for display. */
const fromServerMe = (m: Me): Me => ({ ...m, profile: { ...m.profile, photo: uploadUrl(m.profile.photo) } })

interface AuthApi {
  /** null while the first check with the server is in progress. */
  authed: boolean | null
  username: string
  /** True while the server's default password is still in use. */
  usingDefaults: boolean
  profile: Profile
  prefs: Prefs
  login: (user: string, pass: string) => Promise<string | null>
  logout: () => void
  updateProfile: (p: Partial<Profile>) => Promise<string | null>
  updatePrefs: (p: Partial<Prefs>) => void
  /** Needs the current password. Returns an error message, or null on success. */
  changeCredentials: (o: { currentPassword: string; newUsername?: string; newPassword?: string }) => Promise<string | null>
}

const Ctx = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  useEffect(() => {
    let alive = true
    // No token for this tab (and no older cookie login to try) → signed out, without asking the server.
    if (!getToken() && import.meta.env.VITE_API_URL) {
      setAuthed(false)
      return
    }
    api<Me>('/admin/me')
      .then((m) => alive && (setMe(fromServerMe(m)), setAuthed(true)))
      .catch(() => alive && setAuthed(false))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* ignore */
    }
  }, [prefs])

  const login = useCallback(async (user: string, pass: string) => {
    try {
      const m = await api<Me>('/admin/login', { body: { user, pass } })
      if (m.token) setToken(m.token)
      const { token: _token, ...rest } = m // eslint-disable-line @typescript-eslint/no-unused-vars
      setMe(fromServerMe(rest))
      setAuthed(true)
      return null
    } catch (e) {
      return e instanceof ApiError && e.status === 401 ? 'Incorrect username or password.' : (e as Error).message
    }
  }, [])

  const logout = useCallback(() => {
    void api('/admin/logout', { method: 'POST', body: {} }).catch(() => {})
    setToken('')
    setAuthed(false)
    setMe(null)
  }, [])

  const updateProfile = useCallback(
    async (p: Partial<Profile>) => {
      try {
        const next = { ...(me?.profile ?? DEFAULT_PROFILE), ...p }
        const m = await api<Me>('/admin/profile', { method: 'PUT', body: { ...next, photo: uploadRef(next.photo) } })
        setMe(fromServerMe(m))
        return null
      } catch (e) {
        return (e as Error).message
      }
    },
    [me],
  )

  const updatePrefs = useCallback((p: Partial<Prefs>) => setPrefs((s) => ({ ...s, ...p })), [])

  const changeCredentials = useCallback<AuthApi['changeCredentials']>(async (o) => {
    try {
      const m = await api<Me>('/admin/credentials', { body: o })
      setMe(fromServerMe(m))
      return null
    } catch (e) {
      return (e as Error).message
    }
  }, [])

  const value = useMemo<AuthApi>(
    () => ({ authed, username: me?.user ?? '', usingDefaults: !!me?.mustChange, profile: me?.profile ?? DEFAULT_PROFILE, prefs, login, logout, updateProfile, updatePrefs, changeCredentials }),
    [authed, me, prefs, login, logout, updateProfile, updatePrefs, changeCredentials],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
