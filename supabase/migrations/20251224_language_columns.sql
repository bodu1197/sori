-- ============================================================================
-- Language Columns for Multilingual Support
-- Purpose: Track content language for translation features
-- ============================================================================

-- Add language column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
COMMENT ON COLUMN posts.language IS 'ISO 639-1 language code of the post content';

-- Add primary_language to music_artists
ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'en';
COMMENT ON COLUMN music_artists.primary_language IS 'Primary language of the artist';

-- Add preferred_language to profiles (for server-side sync)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language for translations';

-- Index for language-based queries
CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);
