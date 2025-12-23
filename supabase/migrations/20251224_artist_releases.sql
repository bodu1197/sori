-- ============================================================================
-- Artist Releases Tracking Table
-- Purpose: Track known releases for new album/single detection
-- ============================================================================

-- Track artist releases for new album detection
CREATE TABLE IF NOT EXISTS artist_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_browse_id TEXT NOT NULL UNIQUE,
  known_album_ids JSONB DEFAULT '[]'::jsonb,
  known_single_ids JSONB DEFAULT '[]'::jsonb,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  last_new_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artist_releases_browse_id ON artist_releases(artist_browse_id);
CREATE INDEX IF NOT EXISTS idx_artist_releases_last_checked ON artist_releases(last_checked_at);

-- RLS policies
ALTER TABLE artist_releases ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on artist_releases" ON artist_releases
  FOR ALL USING (true);

-- Comment for documentation
COMMENT ON TABLE artist_releases IS 'Tracks known releases for detecting new albums/singles';
