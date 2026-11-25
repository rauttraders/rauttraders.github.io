# Raut Trader's — server

A small, free server (no paid software, **no npm packages**, just Node.js 18 or newer).
It does three things:

1. serves the website,
2. stores everything shared in one file (`server/data/db.json`): products, brands, slides, site text, **customer orders**, and the admin login,
3. lets the admin panel and customers' phones talk to the same data.

## Run it on a computer (the shop's PC, or any server)

```bash
npm install          # once
npm run build        # builds the website into /dist
node server/index.mjs
```

Open http://localhost:3001 — the shop. Open http://localhost:3001/admin — the admin panel.

If you ever see **"Request failed (502)"** the website is running but this server is not — start it with `npm run dev` (or `npm run server`).

**First sign-in:** user `admin`, password `admin123`.
**Change it straight away** in Admin → My account → Sign-in & security.
You can also set the first password before starting:

```bash
ADMIN_USER=owner ADMIN_PASSWORD="a-long-secret" node server/index.mjs
```

Other options (environment variables): `PORT` (default 3001), `DATA_DIR` (where the data is kept),
`SECURE_COOKIES=1` (set this when the site is served over https).

## Developing

```bash
npm run dev          # API server + Vite dev server together (site on http://localhost:5173)
npm run dev:web      # website only (needs the API running separately: npm run server)
```

## Where is the data? Backups

- Everything is in `server/data/` (`db.json` + an `uploads/` folder of images).
- The server writes a daily safety copy `backup-YYYY-MM-DD.json` there (last 14 kept).
- Admin → My account → *Download backup* saves a copy you can keep elsewhere.
- **Back up the whole `server/data` folder** and you have everything.

## Putting it online for free (so customers' phones can reach it)

The server must run somewhere that is always on and reachable from the internet. Free / low-cost options:

- **The shop's own PC + a free tunnel** (e.g. Cloudflare Tunnel or ngrok): quickest; the PC must stay on.
- **A free app host with a persistent disk** (Fly.io, Railway, Render, Oracle Cloud "always free" VM, etc.).
  Important: some free tiers wipe the disk on restart — pick one with a *persistent volume*, point `DATA_DIR` at it,
  and keep downloading backups.
- Put it behind **https** (the hosts above do this for you) and set `SECURE_COOKIES=1`.

## Good to know

- Prices on orders always come from the server's catalogue, never from the customer's browser.
- Customers can cancel their own order only while it is *New* or *Confirmed*. After *Out for delivery* they must contact the shop.
- Sign-in is rate-limited, passwords are stored as salted `scrypt` hashes, sessions are `HttpOnly` cookies.
- This is a single-file store meant for one shop (hundreds of orders a day is fine). If it ever grows much larger,
  the next step is a real database (SQLite/Postgres) — the API in `server/index.mjs` would stay the same.
