-- Duplicate-order protection: a browser sends a random "Idempotency-Key" with each order; sending the same key again
-- (double tap, bad connection, automatic retry) returns the first order instead of creating a second one.
CREATE TABLE idempotency (
  key          TEXT PRIMARY KEY,          -- 8–64 characters chosen by the browser
  order_id     TEXT NOT NULL,
  fingerprint  TEXT NOT NULL,             -- hash of the basket, so the same key cannot be reused for a different order
  created_at   INTEGER NOT NULL           -- unix ms
);
CREATE INDEX idx_idempotency_created ON idempotency(created_at);
