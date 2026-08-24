-- ARC Ranking PvP BR — schema
-- Run with: psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS streamers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  nickname TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT '',
  channel_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rankings (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ranking_streamers (
  ranking_id TEXT NOT NULL REFERENCES rankings(id) ON DELETE CASCADE,
  streamer_id TEXT NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  PRIMARY KEY (ranking_id, streamer_id)
);

CREATE TABLE IF NOT EXISTS voters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  ranking_id TEXT NOT NULL REFERENCES rankings(id) ON DELETE CASCADE,
  streamer_id TEXT NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  score SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ranking_id, streamer_id, voter_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_votes_ranking ON votes(ranking_id);
CREATE INDEX IF NOT EXISTS idx_votes_streamer ON votes(ranking_id, streamer_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
