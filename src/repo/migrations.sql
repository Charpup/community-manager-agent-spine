-- src/repo/migrations.sql
-- Community Manager Agent - SQLite Schema

CREATE TABLE IF NOT EXISTS cases (
  case_id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  last_message_at_ms INTEGER NOT NULL,
  last_agent_action_at_ms INTEGER,
  assigned_to TEXT,
  notes_json TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  raw_json TEXT,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  type TEXT NOT NULL,
  at_ms INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cases_thread ON cases(channel, thread_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_messages_case ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_actions_case ON actions(case_id);
