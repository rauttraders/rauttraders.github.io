# Application-layer security review — plan, tests, fixes

Local file. Nothing here was published, uploaded or sent anywhere: all tests run against a Worker and a browser on this
computer, and the test browser is blocked from reaching the internet.

Status key: ☐ planned · ◐ tested, gap found · ☑ fixed and re-tested

## 1. Questions asked

1. Does anything leak from the **client side** (the website in the browser)?
2. What is **not applied yet** — e.g. **queue processing** when many shops order at the same moment?
3. **Images**: when an admin uploads a product / brand / slide / profile picture, how is it converted and stored, and is it validated?
4. Are the **client-side** and **server-side** validations both there, and do they agree?

## 2. Plan

| # | Area | What is tested | How |
|---|---|---|---|
| T1 | Client leaks | Secrets, default passwords, internal addresses, source maps in the built JavaScript | scan `frontend/dist` |
| T2 | Client leaks | Script injection: hostile text in product names, descriptions, brands, settings, picture links, on the shop and admin pages | real browser |
| T3 | Client leaks | Admin token only in `sessionStorage`; not in `localStorage`, URL, console; sent only to the API; gone after sign-out | real browser + network log |
| T4 | Client leaks | Personal data left in visitors' browsers by older versions of the site | real browser, pre-filled storage |
| T5 | Client leaks | Clickjacking (site shown inside another site's frame) and referrer leakage | real browser |
| T6 | Concurrency | 100+ simultaneous orders: unique numbers, correct totals, no errors; orders while the admin saves; same order sent twice (double tap / retry) | API |
| T7 | Concurrency | Two admins (or two tabs) saving the catalogue: last-write-wins loses data | API |
| T8 | Images | Type, size, real signature, **pixel dimensions** (a tiny file that decodes to a huge picture), truncated files, polyglots | API |
| T9 | Images | Browser side: file type / size / pixel limits before decoding; output always ≤ server limit | code review + browser |
| T10 | Validation parity | The same inputs are accepted/refused by the website's forms and by the server | shared test vectors |
| T11 | Server | `__proto__` keys, deeply nested JSON, huge numbers, odd Unicode | API |
| T12 | Supply chain | Direct dependencies and lock-file only (an `npm audit` would send package names to the npm registry, so it is **not** run) | review |

## 3. Results (all re-tested: `npm test` → 370 checks, 0 failed)

| # | Area | Result | What was found | Fix |
|---|---|---|---|---|
| T1 | Published website files | ☑ clean | No source maps, no secrets, no tokens, no default passwords, no internal addresses (the only `admin123` is the list of weak passwords the form *refuses*) | tests now guard this |
| T2 | Script injection | ☑ clean | Hostile text (`<img onerror>`, `<svg onload>`, `</script>`, `javascript:` links) in product names, descriptions, brands, categories, slides, every settings field: nothing ran, nothing was injected, shown as plain text, on the shop and on 6 admin pages | none needed (React escapes; no `innerHTML`/`eval` anywhere) |
| T3 | Admin token | ☑ clean | Token only in `sessionStorage`; not in localStorage, URL, cookies, console; only ever sent to the API; removed on sign-out and dead on the server | none needed |
| T4 | Old personal data | ◐→☑ **leak found** | Older versions of the site stored name, shop, phone, address and order tokens in the visitor's browser; they stayed forever (shared/family computers) | `purgeLegacyStorage()` erases them on the next visit |
| T5 | Clickjacking / referrer | ◐→☑ **gap found** | The admin login could be shown invisibly inside another site's page (GitHub Pages cannot send `X-Frame-Options`); no referrer policy | framed pages show nothing clickable; `<meta name="referrer" content="no-referrer">` |
| T6 | Many orders at once ("queue") | ☑ solid | 100 simultaneous orders: all accepted, unique consecutive numbers, every order has exactly its own lines and the right total; orders during admin price saves are always priced from a real (never half-saved) state | none needed — see §4 |
| T6b | Same order sent twice | ◐→☑ **gap found** | 12 identical submissions created 12 orders (double tap / retry) | `Idempotency-Key`: same key → same order; same key + different basket → 422; stored atomically with the order |
| T7 | Two admins / tabs | ◐→☑ **gap found** | The second save silently overwrote the first (lost update) | shop data has a version; a save based on an old version is refused with 409 and a "reload" message; the website sends the version |
| T8 | Pictures (server) | ◐→☑ **gap found** | A 100-byte PNG that decodes to 20 000 × 20 000 pixels was accepted ("pixel bomb"); truncated files accepted | pixel size read from the header (PNG/GIF/JPEG/WebP), max 4096 × 4096 / 16 MP; unreadable size → refused |
| T9 | Pictures (browser) | ◐→☑ **gap found** | No type/size/pixel check before decoding a chosen file (SVG allowed); output size not guaranteed under the server limit | only PNG/JPEG/WebP/GIF…, ≤ 15 MB, ≤ 64 MP; output re-encoded smaller until ≤ 1.4 MB |
| T10 | Validation parity | ◐→☑ **gap found** | The website only checked "≥ 8 characters", price > 0, non-empty names — the stricter server rules (password policy, lengths, price ceiling…) surfaced as raw server errors; long brand+name made an id over the server's 80-character limit | shared rules in `frontend/src/lib/validation.ts`, wired into the account, product, brand and category forms; ids cut to 60 characters; `parity.test.mjs` proves *anything the website accepts, the server accepts* |
| T11 | Hostile JSON / text | ◐→☑ **gap found** | Settings accepted anything: `__proto__`/`constructor` keys, deep nesting, wrong types, huge lists, infinite numbers; right-to-left override characters allowed in names | settings checked (depth ≤ 6, keys, types, lengths, finite numbers, ≤ 200 KB, known fields type-checked); direction-override characters refused |
| T12 | Dependencies | ☑ reviewed (offline) | Both projects have lock files. Install scripts exist only in `esbuild`, `workerd` (backend tooling) and `fsevents` (macOS only). Versions use `^` ranges, so `npm install` can move forward; `npm ci` (used by the GitHub Action) installs exactly the lock file | **not run:** `npm audit` — it uploads your package names to the npm registry, which you asked not to do. Run it yourself if you accept that |

Also found while testing: **the new `Idempotency-Key` header would have made every order from the real website fail** (browsers must be told to allow it across sites). It is now in the CORS allow-list, and a real-browser test places an order through the actual order window to prove it.

## 4. Your questions answered

### "What about queue processing when many shops order at once?"
No separate queue is needed. The database is SQLite on Cloudflare D1: it runs **one write at a time** and lines the others up itself. Each order is one atomic batch (counter + order + lines); the counter bump and the order number are inside the same transaction, so two orders can never get the same number and a failed one leaves no gap. Tested with 100 simultaneous orders, and with orders arriving while the admin saves. Limits that apply on the free plan: 15 orders/hour per visitor, 300/hour for the whole site (these exist to stop spam, not to queue).

### "Should uploaded pictures be converted to base64 instead of storing the real image?"
What happens today, step by step:
1. The admin picks a file in the browser → it is checked (type, size, pixel count) → cropped and shrunk (at most 960 × 600) → re-encoded as WebP/JPEG (typically 20–150 KB) → **turned into a base64 `data:` URL** for sending (that is the base64 step you asked about).
2. The API receives the base64, **decodes it, and validates it**: allowed type, ≤ 1.5 MB, real file signature, readable size ≤ 4096 × 4096.
3. It is stored **inside the SQLite database** as a binary value (BLOB) named by its SHA-256. **No picture file is ever written anywhere.**

Why it is *not* stored as base64 text: base64 is 33 % bigger (a 1.5 MB picture becomes 2.0 MB, which is over D1's ~2 MB per-row limit, so the largest allowed picture would not fit), every view would need decoding on the server (the free plan allows ~10 ms of CPU per request), and nothing is gained in safety — the checks run on the decoded bytes either way. If you still want base64 text in the database, it is a small change, but I recommend against it.

## 5. Things I could not or did not do (be aware)
- **Outside addresses the pages contact (blocked in the tests):** `fonts.googleapis.com` (the Nunito font) and `www.google.com` (the map on the Contact section). Visitors' browsers send their address to Google when these load. Fix when you want it: copy the font files into the website and replace the map with a link. Not done because it means downloading files from the internet.
- Not verified on real Cloudflare (needs deployment): rate-limit bindings, sign-in CPU time, CORS with your real addresses.
- The admin token lives in `sessionStorage`; a script-injection bug in the website could read it (mitigated by the page security policy and by React escaping, both tested).
- Two admins saving at once now get a clear 409 instead of data loss, but the second one has to reload and repeat the edit.
- A site-wide order cap (300/hour) can be used by an attacker to make real shops wait; the Cloudflare CAPTCHA (Turnstile) is the next step if that ever happens.

## 6. How to re-run everything
```bash
cd backend
npm test                 # all 6 suites: api, security, hardening, browser, parity, https
npm run test -- browser  # just one (api | security | hardening | browser | parity | https)
```
The tests start their own throw-away server and database, build the website into a temporary folder, and run Chrome with every address except this computer blocked. They never touch your real data.

## 7. Where the conversation is stored
Claude Code keeps this conversation on this computer only, at
`~/.claude/projects/-home-rohan-office-projects-broker/` (one `.jsonl` file per session, plus a `memory/` folder).
Nothing was copied anywhere else. No artifacts, documents or web pages were published; this file and the other `.md` files under `backend/docs/` are the only written reports.
