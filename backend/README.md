# Raut Traders — backend (Cloudflare Worker + D1 SQLite)

The API for the shop. **The website is hosted separately on GitHub Pages** and talks to this API across origins.
Everything (catalogue, pictures, orders, admin login) is stored in a D1 SQLite database. Design and decisions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```
GitHub Pages  (frontend/)  ──── HTTPS + CORS ────▶  Cloudflare Worker  (backend/)  ──▶  D1 (SQLite)
 you.github.io/<repo>/        Authorization: Bearer      raut-traders.<you>.workers.dev
```

Two addresses have to know about each other (plain settings, not secrets):

| Where | Setting | Value |
|---|---|---|
| Worker (`wrangler.jsonc` → `vars`) | `ALLOWED_ORIGINS` | the website's origin, e.g. `https://YOUR-GITHUB-NAME.github.io` (no path, no trailing slash) |
| Website build (GitHub → Settings → Variables) | `VITE_API_URL` | the Worker's address, e.g. `https://raut-traders.YOUR-SUBDOMAIN.workers.dev` |

## Run it on your computer

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars                    # local secrets (git-ignored)
npm run db:migrate:local                          # creates the local SQLite database
npx wrangler dev --var ALLOWED_ORIGINS:http://localhost:5173     # API on http://127.0.0.1:8787
```

In another terminal, the website with hot reload, pointed at that API:

```bash
cd frontend
npm install
API_URL=http://127.0.0.1:8787 npm run dev:web       # proxies /api and /uploads to the Worker (site and API look like one address)
```

or, to test it exactly as it will be hosted (different addresses):

```bash
VITE_API_URL=http://127.0.0.1:8787 npm run dev:web  # the site calls the API directly (needs ALLOWED_ORIGINS to include http://localhost:5173)
```

First admin sign-in: the `ADMIN_USER` / `ADMIN_PASSWORD` from `.dev.vars` (`admin` / `admin123`). The server then makes you choose a new password before it lets you change any data.

## Tests

```bash
npm test            # starts a throw-away Worker + SQLite database, runs 370 checks, cleans up
npm run test -- api # only one part   (api | security | hardening | browser | parity | https)
```

The suite attacks the API on purpose (lockout, floods, hostile input, forged tokens, cross-site requests, oversized uploads, concurrency). It never touches your real local database.

## Move your existing data over (optional)

Your current shop data lives in `frontend/server/data`. With the Worker running:

```bash
node scripts/migrate-from-node-server.mjs --url http://127.0.0.1:8787 --user admin --pass <admin password>
```

The admin must have chosen a new password first (the server refuses data changes while the temporary one is set). Products, categories, brands, slides, site settings, pictures and the order ledger are copied. **Customer names, phones and addresses are not.**

## Deploy

### 1. The API on Cloudflare (free plan)

```bash
cd backend
npx wrangler login
npx wrangler d1 create raut-traders          # copy the database_id it prints into wrangler.jsonc
```

Edit `wrangler.jsonc`: put that id in place of `REPLACE_WITH_D1_ID`, and set `ALLOWED_ORIGINS` to your GitHub Pages origin
(for `https://alice.github.io/broker/` the origin is `https://alice.github.io`; add a custom domain as well if you use one, comma-separated).

```bash
npm run db:migrate:remote
npx wrangler secret put PASSWORD_PEPPER      # a long random string:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put ADMIN_USER           # e.g. owner
npx wrangler secret put ADMIN_PASSWORD       # 10+ characters, not a common word — it is only for the first sign-in
npm run deploy                               # prints the https://raut-traders.<you>.workers.dev address
```

Open that address: it should answer `{"ok":true,…"This is the shop API…"}`.

### 2. The website on GitHub Pages

1. Push the repository to GitHub (the workflow is `.github/workflows/deploy-frontend.yml`; it expects the repository root to be the `broker` folder).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions → Variables** → add `VITE_API_URL` (the `workers.dev` address from step 1).
   Add `VITE_BASE` = `/` only if you use a custom domain or a `<you>.github.io` repository; otherwise leave it out and the site is built for `/<repository-name>/`.
4. Push to `main` (or run the workflow by hand). Your site appears at the address shown in the workflow run.
5. Open the site → `/admin/login`, sign in with the `ADMIN_USER` / `ADMIN_PASSWORD` you set, and choose a new password.

Notes for GitHub Pages: it cannot send security headers (the site carries its policy in a `<meta>` tag), deep links such as `/admin/login` work through a `404.html` copy of the app (the host reports status 404 for them — harmless), and free Pages needs a **public** repository.

**Keep the pepper safe.** If `PASSWORD_PEPPER` is lost or changed, existing admin passwords stop working (reset: `npx wrangler d1 execute raut-traders --remote --command "DELETE FROM admins"` and sign in again with `ADMIN_USER` / `ADMIN_PASSWORD`).

After deploying, run `npx wrangler tail` while you sign in the first time: if you see `Exceeded CPU limit`, lower `PBKDF2_ITERATIONS` in `wrangler.jsonc`.

## Useful commands

| Command | What it does |
|---|---|
| `npx wrangler dev` | local Worker + local SQLite |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate:local` / `db:migrate:remote` | apply new migrations |
| `npm run deploy` | deploy the Worker |
| `npx wrangler d1 export raut-traders --remote --output backup.sql` | full database export (also: Admin → My account → Download backup) |
| `npx wrangler tail` | live logs of the deployed Worker |
