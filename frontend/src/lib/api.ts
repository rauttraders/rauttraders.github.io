export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Where the API lives.
 *  - Empty (the default): the same address as the website — used with the local Node server / Vite proxy in development.
 *  - A full address such as https://raut-traders.you.workers.dev: the website (GitHub Pages) and the API (Cloudflare) are
 *    different sites, so requests go across origins. Set it with VITE_API_URL when building (see .env.example).
 */
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim().replace(/\/$/, '')

/**
 * The admin's session token. It is kept only for this browser tab (sessionStorage, so it is gone when the tab closes) and is
 * sent in an `Authorization` header — there are no cookies, which is what makes it work when the site and the API are on
 * different domains (browsers block cross-site cookies).
 */
const TOKEN_KEY = 'rt-admin-token'
export const getToken = (): string => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}
export const setToken = (t: string) => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode: the admin will simply have to sign in again after a reload */
  }
}

/** Small JSON fetch wrapper. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response
  const token = getToken()
  const headers: Record<string, string> = { ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      // Same site as the API (local development): the older cookie login still works. Across sites we never send cookies.
      credentials: API_BASE ? 'omit' : 'same-origin',
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiError(res.status, data.error ?? "The shop's server isn't reachable right now. Please try again in a moment.")
  }
  if (res.status === 401 && token && !path.startsWith('/admin/login')) setToken('') // expired or revoked: forget it
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`)
  return data
}
