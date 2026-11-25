// Password hashing and tokens, using only the Web Crypto API that every Worker has.
const enc = new TextEncoder()

const toB64 = (b: ArrayBuffer | Uint8Array): string => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s)
}
const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const toHex = (b: ArrayBuffer | Uint8Array): string => [...(b instanceof Uint8Array ? b : new Uint8Array(b))].map((x) => x.toString(16).padStart(2, '0')).join('')

export const randomHex = (bytes = 32): string => toHex(crypto.getRandomValues(new Uint8Array(bytes)))

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? enc.encode(data) : data
  return toHex(await crypto.subtle.digest('SHA-256', bytes))
}

/**
 * Password hashing for the Workers FREE plan (about 10 ms of CPU per request):
 *   hash = PBKDF2-SHA256( HMAC-SHA256(PEPPER, password), salt, iterations )
 *  - The PEPPER is a long random Worker secret that is NOT in the database, so a leaked database cannot be cracked offline.
 *  - 100 000 iterations (the OWASP-style setting) cost ~80 ms of CPU, which the free plan cannot afford, so the default is
 *    5 000. On the paid plan raise PBKDF2_ITERATIONS (max 100 000, a Workers limit): old hashes still verify and are
 *    upgraded automatically the next time that admin signs in.
 */
export const MAX_ITERATIONS = 100_000
export const DEFAULT_ITERATIONS = 5_000
export const iterationsFrom = (v?: string): number => Math.min(MAX_ITERATIONS, Math.max(1000, Math.floor(Number(v)) || DEFAULT_ITERATIONS))

async function peppered(password: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toB64(await crypto.subtle.sign('HMAC', key, enc.encode(password)))
}

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** "pbkdf2p$sha256$<iterations>$<salt b64>$<hash b64>" — the iteration count travels with the hash so it can be raised later. */
export async function hashPassword(password: string, pepper: string, iterations = DEFAULT_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(await peppered(password, pepper), salt, iterations)
  return `pbkdf2p$sha256$${iterations}$${toB64(salt)}$${toB64(hash)}`
}

export async function verifyPassword(password: string, stored: string, pepper: string): Promise<boolean> {
  const [scheme, alg, iter, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2p' || alg !== 'sha256') return false
  const iterations = Math.min(MAX_ITERATIONS, Number(iter) || 0)
  if (!iterations) return false
  return equal(await pbkdf2(await peppered(password, pepper), fromB64(salt), iterations), fromB64(hash))
}

/** True when the stored hash was made with fewer iterations than are configured now (so it can be upgraded at sign-in). */
export const needsRehash = (stored: string, iterations: number): boolean => (Number(stored.split('$')[2]) || 0) < iterations

/** A throw-away hash so "unknown user" takes as long as "wrong password". */
export const dummyHash = (iterations: number): string => `pbkdf2p$sha256$${iterations}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`
