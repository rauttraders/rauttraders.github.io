# Raut Traders backend — architecture (Cloudflare Workers free plan, everything in SQLite)

Revision 5 — **website on GitHub Pages, API on Cloudflare.** Replaces the earlier "one Worker serves everything" layout, the Express + Firebase + Google Drive plan, and the R2 / Cloudflare Access variants.

## 1. Decisions

| Question | Decision |
|---|---|
| Website hosting | **GitHub Pages** (static React build, free). Built and published by a GitHub Action (`.github/workflows/deploy-frontend.yml`) |
| API hosting | **Cloudflare Worker** on the free plan (`backend/`). It serves only `/api/*` and `/uploads/*` — **not** the website |
| Cross-site access | The site and API are different origins, so the API sends **CORS** headers for an exact allow-list (`ALLOWED_ORIGINS`), never `*` |
| Database | **D1 (SQLite)** — the only store: catalogue, settings, **images (BLOBs)**, orders, admin login, sessions, rate-limit counters |
| Admin sign-in | **Username + password stored in the database** (salted PBKDF2 + server pepper). The session is a **random token sent in an `Authorization: Bearer` header — no cookies at all** (browsers block cross-site cookies, Safari especially) |
| Shoppers | **No accounts, no login, no personal data.** They add items → "My order" → send on WhatsApp. The server only records *what* was ordered and the total |
| Images | In the database, served at `<API>/uploads/<sha256>`; max 1.5 MB each |
| Google Drive / Firebase | **Not used** |

## 2. Big picture

```
 Shopper / admin browser                                   Cloudflare (free plan)
┌─────────────────────────┐   HTTPS + CORS    ┌──────────────────────────────────────────────┐
│ React site (GitHub Pages)│ ────────────────▶ │  Worker "raut-traders"  (API only)           │
│  https://you.github.io   │  GET  /api/public │   ├─ cors → rate limit → routes              │
│                          │  POST /api/orders │   ├─ /api/public    catalogue (edge cached)  │
│  shop → My order         │  /api/admin/*     │   ├─ /api/orders    ids+qty only, priced here│
│   └─ opens WhatsApp      │  Authorization:   │   ├─ /uploads/<id>  pictures from the DB     │
│  admin panel (/admin)    │  Bearer <token>   │   └─ /api/admin/*   needs the session token  │
└─────────────────────────┘                    │            │                                 │
                                               │            ▼                                 │
  GitHub Actions builds the site on every push │   D1 (SQLite): catalogue, images, orders,    │
  (VITE_API_URL tells it where the API is)     │   admins, sessions, limits, audit            │
                                               └──────────────────────────────────────────────┘
```

**How the two halves find each other:** the build gets `VITE_API_URL` (the Worker's address); the Worker gets `ALLOWED_ORIGINS` (the website's address). Both are plain settings, not secrets.

**Why a token and not a cookie:** a cookie set by `workers.dev` and sent from `github.io` is a *third-party* cookie, which Safari/Firefox block and Chrome is phasing out. A token the page keeps for the tab (`sessionStorage`) and sends in a header works in every browser, and removes cookie-based CSRF altogether (nothing is attached automatically). The trade-off is that a script-injection bug in the website could read the token; the website therefore ships a strict `Content-Security-Policy` (scripts only from its own files) and never injects HTML.

## 3. Database (`migrations/0001_init.sql`)

Separate, versioned migrations (`wrangler d1 migrations apply`); the Worker never creates tables itself. Data-access code lives in `src/db/*` (all SQL is there, none in the routes).

| Group | Tables |
|---|---|
| Catalogue | `categories`, `brands`, `products` (price in rupees, `active` flag), `slides`, `settings` (JSON per key), `meta` ("seeded") |
| Images | `images` (`id` = SHA-256 of the bytes, `mime`, `bytes` BLOB, `size ≤ 1.5 MB`) — identical pictures are stored once |
| Orders | `orders` (`RT-1001`…, `total`, `sample`), `order_items` (name/brand/size/price **snapshot** at order time), `counters` (race-free numbering) |
| Admin | `admins` (username, `password_hash`, `must_change`, profile), `sessions` (only the **SHA-256 of the cookie token** is stored), `login_attempts`, `order_limits`, `audit_log` |

There are **no customer columns anywhere.** Image columns hold a *reference string*: `/uploads/<id>`, `asset:<key>` (a picture bundled with the website) or a URL.

Writes that touch many rows use one statement per table with `json_each(?)`, so the number of database calls per request stays tiny (the free plan allows ~50 per request) and each save is one atomic batch.

## 4. Admin authentication (username + password, database only)

- **Password hash** = `PBKDF2-SHA256( HMAC-SHA256(PEPPER, password), salt, iterations )`, stored as `pbkdf2p$sha256$<iterations>$<salt>$<hash>`.
  - `PASSWORD_PEPPER` is a long random **Worker secret** that is *not* in the database → a leaked database alone cannot be cracked offline.
  - **Free-plan reality:** 100 000 iterations ≈ 80 ms CPU on a normal machine, but the free plan allows ~10 ms CPU per request. So the default is **5 000 iterations** (set in `wrangler.jsonc` → `PBKDF2_ITERATIONS`). On the paid plan raise it (Workers cap PBKDF2 at 100 000); old hashes keep working and are **upgraded automatically at the next sign-in**.
  - Verified locally (no CPU limit there): sign-in ≈ 40–55 ms wall-clock including the database. **Not yet verified on real Cloudflare free** — after deploying, run `npx wrangler tail` and sign in once; if you see `Exceeded CPU limit` lower `PBKDF2_ITERATIONS` (e.g. 3000).
- **First admin:** created the first time someone signs in with the `ADMIN_USER` / `ADMIN_PASSWORD` secrets while the `admins` table is empty; `must_change` forces a new password straight away. If the secrets/pepper are missing the API answers 503 instead of silently using a default password.
- **Sessions:** random 256-bit token returned **in the sign-in response body** and sent as `Authorization: Bearer <token>`; only its SHA-256 is stored; valid 7 days; the website keeps it in `sessionStorage` (gone when the tab closes); logout deletes it server-side; changing the password signs out every *other* device. **No cookie is ever set.**
- **Brute force (3 layers):** (1) Cloudflare's rate limiter: 10 sign-in attempts/min per address, before any password work and with no database writes; (2) database lockouts for 15 min: **5 failures per address+username** (one visitor guessing one account), **20 per address** (one visitor trying many usernames), **30 per username** (a botnet) — so an attacker cannot lock the real owner out from another network, yet a distributed attack still stops; (3) unknown usernames cost the same time as wrong passwords and get the same message.
- **Cross-site safety:** every admin write needs `Content-Type: application/json` **and** an `Origin` that is on the allow-list (or none, for scripts). With header tokens and no cookies there is no automatic login for another site to abuse.
- **First-password rule is enforced by the server:** while the temporary password is still set, the admin can read but cannot change data (only change the password or sign out).
- **Password policy:** 8–200 characters, not a common password, not all digits or one repeated character, must not contain the username, "admin" or "password". Usernames: 3–64 of letters, digits and . _ @ -. On a public host name the `ADMIN_PASSWORD` secret itself must pass the policy and be 10+ characters.
- **CORS:** pre-flight answers only for allow-listed origins (others get 403); `Access-Control-Allow-Origin` is the exact origin (never `*`), only `Authorization` + `Content-Type` headers and the needed methods are allowed, credentials are never allowed, `Vary: Origin` is always set (so edge-cached answers are never mixed up), and even 429 answers are readable by the website so it can say "slow down".

## 5. API (matches what the React app calls; base = the Worker's address)

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/` · `/api/health` | public | liveness (root says "this is the API") |
| GET | `/api/public` | public | active products, categories, brands, slides, settings (edge-cached 30 s; admin saves purge it) |
| POST | `/api/bootstrap` | public, once | first visit of an empty deployment seeds the sample catalogue (refused once seeded) |
| POST | `/api/orders` | public | `{ items:[{id,qty}] }` → `{ id, total, createdAt }`. Prices come from the database; 15 orders/hour per visitor (IP stored hashed) |
| GET | `/uploads/:id` | public | image from the database (`immutable`, `nosniff`, sandboxed CSP) |
| POST | `/api/admin/login` · `/logout` | — / admin | sign in (returns `token`) / out |
| GET | `/api/admin/me` | admin | current admin |
| PUT | `/api/admin/profile` | admin | name, email, photo |
| POST | `/api/admin/credentials` | admin | change username / password (needs the current password) |
| GET / PUT | `/api/admin/state` | admin | whole catalogue + settings; PUT stores new pictures and returns `/uploads/…` links |
| GET | `/api/admin/orders` | admin | ledger (items + totals) |
| DELETE | `/api/admin/orders/:id` | admin | remove an order |
| POST / DELETE | `/api/admin/orders/sample` | admin | add / clear demo orders |
| GET / POST | `/api/admin/backup` · `/restore` | admin | download / restore everything as JSON |

Removed vs. the old Node server: customer accounts, order tracking, cancelling, order statuses.

## 6. Free-plan limits and how we stay inside them (check Cloudflare's current numbers)

| Resource | Free allowance (approx.) | How |
|---|---|---|
| Worker requests | 100 000 / day | The website is on GitHub Pages (not counted). Catalogue edge-cached; pictures are `immutable`, so repeat visitors cost 0. **Each picture request that misses the cache is one Worker run**, so a first visit ≈ 1 + #pictures |
| CPU per request | ~10 ms | Only sign-in/password change does real crypto (5 000 PBKDF2 rounds); everything else is database I/O |
| D1 | 5 GB; ~5 M rows read / 100 k rows written per day; ≤ 50 queries per request; row ≤ 2 MB | `json_each` batch writes; images capped at 1.5 MB (the admin panel already crops/resizes) |
| Cron | a few triggers | one daily clean-up |

Beyond that the paid Workers plan is ~$5/month with no code changes.

## 7. Security checklist (audited and tested — `npm test`, 370 checks)

| Area | Control | Status |
|---|---|---|
| **Lockout** | 3-layer lockout (see §4); lock lifts after 15 min; success resets the visitor counter; password-change guesses locked after 5 | tested |
| **Rate limiting** | Cloudflare limiter: 120 API calls/min, 10 sign-ins/min, 300 image downloads/min per address (no DB writes); orders: 15/hour per visitor + **300/hour site-wide**; bootstrap 5/hour. Visitor addresses are stored only as hashes | tested |
| **Input validation** | Strict, with clear 400/413 errors (nothing is silently cut or changed): ids `[A-Za-z0-9._:-]`, prices 0–10 000 000, text lengths and control characters, max 1000 products / 200 categories / 500 brands / 20 slides, settings ≤ 200 KB, duplicate ids refused, whole-number quantities 1–999, ≤ 60 order lines, JSON-only with 415/400 on anything else, wrong types (objects/arrays instead of text) → 4xx never 500 | tested |
| **Request size** | Orders ≤ 32 KB, sign-in/password ≤ 8 KB, profile ≤ 4 MB, other admin ≤ 25 MB, public bootstrap ≤ 4 MB — refused before reading | tested |
| **Pictures** | PNG/JPEG/WebP/GIF only (no SVG), ≤ 1.5 MB, real file signature checked (a renamed text file is refused), links limited to `https:`/`http:`/`/uploads/`/bundled assets — `javascript:` and `data:text/html` refused; stored by hash; served `immutable` + `nosniff` + sandbox CSP | tested |
| **Orders** | Prices from the database only; no personal data accepted or stored; unique gap-free numbers under concurrency (25 simultaneous orders tested) | tested |
| **Sessions** | 256-bit random token in a header (no cookies), only its hash stored; 7-day expiry (tested by ageing a session); logout kills it server-side; password change signs out other devices; forged / malformed / wrong-scheme tokens → 401 | tested |
| **CORS / cross-site** | exact allow-list, pre-flight only for our site, never `*`, never credentials, `Vary: Origin`, foreign `Origin` on a write or sign-in → 403, no endpoint ever sets a cookie | tested |
| **SQL injection** | bound parameters only; hostile ids/usernames tested | tested |
| **Headers** | API: nosniff, DENY framing, `default-src 'none'` CSP, no-store, `no-referrer`, HSTS on HTTPS. Website (GitHub Pages cannot send headers): a `<meta>` Content-Security-Policy — scripts only from its own files, `connect-src` limited to itself + the API | tested (API); site policy tested in a real browser |
| **Errors** | JSON only, no stack traces or paths | tested |
| **Audit trail** | `audit_log` records sign-ins, lockouts, password/username changes, catalogue saves, order deletes, backups/restores (never passwords or tokens); readable at `GET /api/admin/audit`; kept 180 days | tested |
| **Data integrity** | Restore validates everything *before* changing anything, replaces the ledger, imports big ledgers in chunks (20 000 orders / 60 000 lines max, otherwise a clear 413); catalogue saved in one atomic batch | tested |
| **Caching** | Public catalogue cached 30 s at the edge, purged on every admin save and on first-run seeding; an empty "not set up" answer is never cached | tested |
| **CSV export** | cells starting with `= + - @` are neutralised (spreadsheet formula injection) | fixed in the admin panel |

### Gaps found by this audit, and fixed
_(Round 2 — client side, concurrency, pictures — is in `SECURITY-REVIEW.md`: duplicate-order key, version check against lost updates, picture pixel limits, settings validation, old-data purge, clickjacking guard, shared client/server validation.)_

1. An attacker could lock the real owner out from anywhere (lockout was per username only) → 3-layer lockout.
2. No flood protection and no whole-site order cap → Cloudflare limiters + site-wide cap.
3. The "must change your password" rule was only a hint to the browser → now enforced by the server.
4. Passwords like `password` / `admin1234` were accepted → policy.
5. Weak first password (`admin123`) was accepted on a public site → refused unless on localhost.
6. No body-size limits; JSON bodies of any size were read → limits.
7. Catalogue input was loosely checked (negative/absurd prices, HTML in ids, `javascript:`/`data:text/html`/SVG pictures, 2001+ products silently dropped, unlimited settings) → strict validation.
8. Fractional order quantities were accepted → whole numbers only.
9. Restore silently kept only the first 2000 orders and merged instead of replacing → chunked, replacing, explicit limits.
10. Cookie-based sign-in cannot work between GitHub Pages and Cloudflare → token in a header, strict CORS, no cookies.
11. The audit table existed but nothing wrote to it → implemented.
12. The "empty shop" answer was cached for 30 s, so the first visitor saw an empty shop after seeding → not cached, cache purged.
13. CSV export could carry spreadsheet formulas → neutralised.

### Known limits (accepted, or later)
- Anyone can place a fake order — the ledger is advisory; confirmation happens on WhatsApp. Add Cloudflare **Turnstile** if spam appears.
- `POST /api/bootstrap` on a brand-new *empty* deployment is open until the first visitor seeds it (the data is validated and limited, once only).
- A distributed attack on one username locks that username for 15 min for everyone (the price of stopping botnets); the owner can wait or sign in again later.
- The Cloudflare rate-limit bindings and the CPU cost of sign-in are **not verified on real Cloudflare** (local tests only) — check after deploying (`npx wrangler tail`).
- The admin Orders page shows the newest 2 000 orders (backups contain all).
- Two admins saving at once: the second save is refused (409) and must reload — no silent overwrite any more.
- `CF-Connecting-IP` is trusted: safe on Cloudflare (it overwrites the header), but never expose `wrangler dev` to the internet.
- GitHub Pages cannot send response headers, so the website's policy is a `<meta>` tag: it cannot include `frame-ancestors`, so the admin page can be framed by another site (clickjacking). Mitigation: sign-in/data changes still need the token and the typed password for sensitive actions.
- The admin token lives in `sessionStorage`; a script-injection bug in the website could read it (the Content-Security-Policy and React's escaping are the defence).
- Deep links on GitHub Pages (`/admin/login`) work through a copy of `index.html` named `404.html`, so the host reports status 404 for them (harmless, shows as a console note).
- Pepper loss = every admin password must be reset.

## 8. Folder structure

```
broker/
├── .github/workflows/deploy-frontend.yml   builds + publishes the website to GitHub Pages
├── frontend/                               React website (Vite). VITE_API_URL / VITE_BASE decide where it talks and where it is hosted
│   └── src/lib/api.ts, media.ts            API address, header token, picture links that point at the API
└── backend/                                the Cloudflare Worker
    ├── wrangler.jsonc                      D1 binding, rate limiters, daily cron, ALLOWED_ORIGINS
    ├── migrations/0001_init.sql
    ├── docs/ARCHITECTURE.md  README.md
    ├── scripts/migrate-from-node-server.mjs
    ├── tests/                              `npm test` — 370 checks against a throw-away Worker + database
    └── src/
        ├── index.ts           app, error handling, daily clean-up
        ├── db/                ALL SQL (admins, sessions, attempts, limits, catalogue, images, orders, audit)
        ├── lib/               crypto, clean/validate (input rules), http
        ├── middleware/        security headers, CORS, limits (rate + size), requireAdmin
        └── routes/            public.ts, admin/index.ts
```

## 9. Status

| Step | State |
|---|---|
| Schema, auth, catalogue, images, orders, backup/restore, audit | done, tested |
| Hardening (lockout, rate limits, validation, size limits) | done, tested |
| Split hosting: CORS, header-token sign-in, API-only Worker | done, tested |
| Website changes for GitHub Pages (API address, token, picture links, base path, 404 fallback, page policy) | done; run in a real browser against a Pages-style host on another origin: storefront, order, deep link, sign-in, reload, pictures |
| GitHub Action to publish the site | written; **not run** (needs your repository + Pages setting) |
| **Deploy the Worker** | **not done** — needs your Cloudflare login (see `README.md`) |
| Real-Cloudflare checks (sign-in CPU time, rate-limit bindings, CORS with your real addresses) | after deploy |
