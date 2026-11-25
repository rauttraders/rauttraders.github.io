-- Raut Traders — D1 (SQLite) schema. EVERYTHING lives here: catalogue, settings, images, orders, admin login.
-- No shopper personal data is stored anywhere.

-- ───────────── catalogue ─────────────
CREATE TABLE categories (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE brands (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  logo  TEXT NOT NULL DEFAULT '',       -- image reference: "/uploads/<id>", "asset:…" (bundled) or a URL
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  company      TEXT NOT NULL,            -- brand name shown on the card
  category_id  TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  size         TEXT NOT NULL DEFAULT '',
  price        INTEGER NOT NULL CHECK (price >= 0),          -- rupees
  mrp          INTEGER CHECK (mrp IS NULL OR mrp >= 0),
  image        TEXT NOT NULL DEFAULT '', -- image reference (see above)
  is_logo      INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_products_active ON products(active, category_id);

CREATE TABLE slides (
  id     TEXT PRIMARY KEY,
  title  TEXT NOT NULL DEFAULT '',
  image  TEXT NOT NULL DEFAULT '',
  scale  REAL NOT NULL DEFAULT 1,
  sort   INTEGER NOT NULL DEFAULT 0
);

-- Site text, hero, WhatsApp message settings, … : one JSON document per key.
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,             -- JSON
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Small flags ("seeded", schema notes …).
CREATE TABLE meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- ───────────── images (stored in the database, as BLOBs) ─────────────
-- id = SHA-256 of the bytes, so the same picture is stored once. D1 limits a row to ~2 MB, so uploads are capped well below that.
CREATE TABLE images (
  id          TEXT PRIMARY KEY,
  mime        TEXT NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  bytes       BLOB NOT NULL,
  size        INTEGER NOT NULL CHECK (size <= 1500000),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ───────────── orders (what was ordered + the total, nothing about the buyer) ─────────────
CREATE TABLE orders (
  id          TEXT PRIMARY KEY,          -- "RT-1004"
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  total       INTEGER NOT NULL CHECK (total >= 0),
  sample      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_items (
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  name         TEXT NOT NULL,            -- snapshot at order time
  company      TEXT NOT NULL,
  category_id  TEXT NOT NULL,
  size         TEXT NOT NULL,
  price        INTEGER NOT NULL,         -- unit price at order time
  qty          INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 999),
  PRIMARY KEY (order_id, product_id)
);

-- Race-free sequential order numbers.
CREATE TABLE counters (
  name   TEXT PRIMARY KEY,
  value  INTEGER NOT NULL
);
INSERT INTO counters (name, value) VALUES ('order', 1000);

-- ───────────── admin login (username + password, all in the database) ─────────────
CREATE TABLE admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT NOT NULL,          -- "pbkdf2$sha256$<iterations>$<salt b64>$<hash b64>"
  must_change    INTEGER NOT NULL DEFAULT 0,
  name           TEXT NOT NULL DEFAULT 'Administrator',
  email          TEXT NOT NULL DEFAULT '',
  photo          TEXT NOT NULL DEFAULT '',-- image reference
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Server-side sessions. Only the SHA-256 of the cookie token is stored, so a leaked database can't be used to log in.
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,           -- sha256(token) hex
  admin_id    INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,           -- unix ms
  expires_at  INTEGER NOT NULL
);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- Brute-force protection: failed sign-ins per key ("user:<name>" and "ip:<addr>").
CREATE TABLE login_attempts (
  key           TEXT PRIMARY KEY,
  fails         INTEGER NOT NULL DEFAULT 0,
  window_start  INTEGER NOT NULL,         -- unix ms
  locked_until  INTEGER NOT NULL DEFAULT 0
);

-- Public order endpoint abuse guard: orders per IP-hash per window.
CREATE TABLE order_limits (
  key           TEXT PRIMARY KEY,
  hits          INTEGER NOT NULL,
  window_start  INTEGER NOT NULL
);

-- Who did what in the admin panel.
CREATE TABLE audit_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT NOT NULL DEFAULT (datetime('now')),
  actor   TEXT NOT NULL,
  action  TEXT NOT NULL,
  detail  TEXT NOT NULL DEFAULT ''
);
