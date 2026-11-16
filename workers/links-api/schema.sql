-- Contact messages from https://www.bayanai.tech/links/contact
CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  phone        TEXT,
  organisation TEXT,
  topic        TEXT,
  message      TEXT    NOT NULL,
  lang         TEXT,
  country      TEXT,
  user_agent   TEXT,
  ip_hash      TEXT,   -- salted SHA-256 of the sender IP, only for rate limiting
  emailed      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_ip_time ON messages (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);
