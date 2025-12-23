-- ============================================================================
-- Post Translations Cache Table
-- Purpose: Cache translated content to avoid repeated AI calls
-- ============================================================================

-- Post translations cache table
CREATE TABLE IF NOT EXISTS post_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, target_language)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_translations_post_id ON post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_post_translations_lookup ON post_translations(post_id, target_language);

-- RLS policies
ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY;

-- Anyone can read translations
CREATE POLICY "Anyone can read translations" ON post_translations
  FOR SELECT USING (true);

-- Service role can insert/update (backend only)
CREATE POLICY "Service role can manage translations" ON post_translations
  FOR ALL USING (true);

-- Comment for documentation
COMMENT ON TABLE post_translations IS 'Cached translations of post content';
