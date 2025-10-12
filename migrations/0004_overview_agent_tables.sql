-- Overview Agent Tables
-- User tracked assets and trending snapshots

-- User tracked assets
CREATE TABLE IF NOT EXISTS user_tracked_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  added_at INTEGER NOT NULL,

  UNIQUE(user_id, address)
);

-- Trending snapshots for historical tracking
CREATE TABLE IF NOT EXISTS trending_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain TEXT NOT NULL,
  pair_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_usd TEXT NOT NULL,
  price_change_24h REAL NOT NULL,
  volume_24h REAL NOT NULL,
  liquidity_usd REAL NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracked_assets_user ON user_tracked_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_assets_chain ON user_tracked_assets(chain);
CREATE INDEX IF NOT EXISTS idx_trending_snapshots_chain ON trending_snapshots(chain);
CREATE INDEX IF NOT EXISTS idx_trending_snapshots_timestamp ON trending_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trending_snapshots_pair ON trending_snapshots(pair_address);
