-- Add songs_playlist_id columns to music_artists table
-- This stores the playlist ID from "View All" button in Top Songs section

ALTER TABLE music_artists
ADD COLUMN IF NOT EXISTS songs_playlist_id TEXT,
ADD COLUMN IF NOT EXISTS songs_browse_id TEXT;

-- Index for quick lookup by playlist ID
CREATE INDEX IF NOT EXISTS idx_music_artists_songs_playlist_id
ON music_artists(songs_playlist_id)
WHERE songs_playlist_id IS NOT NULL;

COMMENT ON COLUMN music_artists.songs_playlist_id IS 'YouTube Music playlist ID for artist top songs (VL prefix removed)';
COMMENT ON COLUMN music_artists.songs_browse_id IS 'Original browseId with VL prefix';
