-- Migration: Add missing columns to playlists table
-- Date: 2024-12-20
-- Description: CreatePage requires video_id and description columns

-- 1. Add video_id column (YouTube video ID)
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS video_id TEXT;

-- 2. Add description column
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Add index for video_id (for faster lookups)
CREATE INDEX IF NOT EXISTS idx_playlists_video_id ON playlists(video_id);

-- 4. Comment for documentation
COMMENT ON COLUMN playlists.video_id IS 'YouTube video ID for the playlist cover/main track';
COMMENT ON COLUMN playlists.description IS 'User description for the playlist';
