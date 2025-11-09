-- Pre-Enrichment Pipeline Database Schema
-- Purpose: Cache venue and artist information to avoid repeated web searches

-- Venue context cache
CREATE TABLE IF NOT EXISTS venue_context (
  venue_name TEXT PRIMARY KEY,
  neighborhood TEXT,
  description TEXT,
  venue_type TEXT,
  capacity INTEGER,
  established_year INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source TEXT -- 'manual', 'web_search', 'generic'
);

-- Artist information cache
CREATE TABLE IF NOT EXISTS artist_info (
  artist_name TEXT PRIMARY KEY,
  bio TEXT,
  genre TEXT,
  notable_works TEXT, -- JSON array as text
  career_highlights TEXT,
  active_since INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source TEXT -- 'manual', 'web_search', 'generic'
);

-- Enrichment statistics and logging
CREATE TABLE IF NOT EXISTS enrichment_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  enrichment_version TEXT NOT NULL,
  venue_lookup_success BOOLEAN,
  artist_lookup_success BOOLEAN,
  enrichment_time_ms INTEGER,
  word_count_en INTEGER,
  word_count_gr INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_venue_updated ON venue_context(last_updated);
CREATE INDEX IF NOT EXISTS idx_artist_updated ON artist_info(last_updated);
CREATE INDEX IF NOT EXISTS idx_enrichment_event ON enrichment_log(event_id);
