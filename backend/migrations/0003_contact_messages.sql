-- Contact messages submitted by visitors via the "Send us a message" form on the website.
-- Each row is one enquiry. No passwords or financial data are stored here.
CREATE TABLE contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  name        TEXT    NOT NULL,                 -- visitor's name (required)
  shop_name   TEXT    NOT NULL DEFAULT '',      -- visitor's shop / business name (optional)
  phone       TEXT    NOT NULL,                 -- visitor's phone number (required)
  message     TEXT    NOT NULL DEFAULT '',      -- free-text message (optional)
  read        INTEGER NOT NULL DEFAULT 0,       -- 0 = unread, 1 = read
  archived    INTEGER NOT NULL DEFAULT 0        -- 0 = inbox, 1 = archived
);
CREATE INDEX idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_read    ON contact_messages(read, archived);

-- Contact rate limiting: submissions per IP per window (mirrors order_limits pattern).
CREATE TABLE contact_limits (
  key           TEXT    PRIMARY KEY,
  hits          INTEGER NOT NULL,
  window_start  INTEGER NOT NULL
);
