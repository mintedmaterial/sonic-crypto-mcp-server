-- D1 Database Schema for API Credit Usage Tracking
-- Used by CoinMarketCap service to track daily API usage

-- API Credit Usage Table
CREATE TABLE IF NOT EXISTS api_credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  date TEXT NOT NULL,
  metadata TEXT
);

-- Index for fast date queries
CREATE INDEX IF NOT EXISTS idx_credit_date ON api_credit_usage(date);
CREATE INDEX IF NOT EXISTS idx_credit_endpoint ON api_credit_usage(endpoint);

-- View for daily usage summary
CREATE VIEW IF NOT EXISTS daily_credit_summary AS
SELECT 
  date,
  endpoint,
  SUM(credits_used) as total_credits,
  COUNT(*) as request_count
FROM api_credit_usage
GROUP BY date, endpoint
ORDER BY date DESC, total_credits DESC;

-- View for current day usage
CREATE VIEW IF NOT EXISTS today_credit_usage AS
SELECT 
  endpoint,
  SUM(credits_used) as total_credits,
  COUNT(*) as request_count,
  MAX(timestamp) as last_request
FROM api_credit_usage
WHERE date = DATE('now')
GROUP BY endpoint
ORDER BY total_credits DESC;
