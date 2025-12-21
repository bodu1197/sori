-- Migration: Add hashtags tables
-- Date: 2024-12-21
-- Description: Enable hashtag functionality for posts

-- 1. Create hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS post_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX IF NOT EXISTS idx_hashtags_count ON hashtags(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- 4. Enable RLS
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for hashtags
-- Everyone can view hashtags
CREATE POLICY "Everyone can view hashtags"
  ON hashtags FOR SELECT
  USING (true);

-- System can create/update hashtags
CREATE POLICY "System can manage hashtags"
  ON hashtags FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. RLS Policies for post_hashtags
-- Everyone can view post_hashtags
CREATE POLICY "Everyone can view post_hashtags"
  ON post_hashtags FOR SELECT
  USING (true);

-- Users can add hashtags to their posts
CREATE POLICY "Users can add hashtags to own posts"
  ON post_hashtags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Users can remove hashtags from their posts
CREATE POLICY "Users can remove hashtags from own posts"
  ON post_hashtags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- 7. Function to get or create hashtag
CREATE OR REPLACE FUNCTION get_or_create_hashtag(p_name TEXT)
RETURNS UUID AS $$
DECLARE
  v_hashtag_id UUID;
  v_clean_name TEXT;
BEGIN
  -- Clean the hashtag name (lowercase, no special chars except underscore)
  v_clean_name := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9_]', '', 'g'));

  -- Try to find existing
  SELECT id INTO v_hashtag_id FROM hashtags WHERE name = v_clean_name;

  -- Create if not exists
  IF v_hashtag_id IS NULL THEN
    INSERT INTO hashtags (name) VALUES (v_clean_name) RETURNING id INTO v_hashtag_id;
  END IF;

  RETURN v_hashtag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to update hashtag count
CREATE OR REPLACE FUNCTION update_hashtag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET post_count = post_count + 1 WHERE id = NEW.hashtag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_hashtag_change ON post_hashtags;
CREATE TRIGGER on_post_hashtag_change
  AFTER INSERT OR DELETE ON post_hashtags
  FOR EACH ROW
  EXECUTE FUNCTION update_hashtag_count();

-- 9. Function to extract and save hashtags from post description
CREATE OR REPLACE FUNCTION extract_and_save_hashtags(p_post_id UUID, p_description TEXT)
RETURNS VOID AS $$
DECLARE
  v_hashtag TEXT;
  v_hashtag_id UUID;
  v_hashtags TEXT[];
BEGIN
  -- Delete existing hashtags for this post
  DELETE FROM post_hashtags WHERE post_id = p_post_id;

  -- Extract hashtags from description
  v_hashtags := ARRAY(
    SELECT DISTINCT REGEXP_MATCHES(p_description, '#([a-zA-Z0-9_]+)', 'g')
  );

  -- Insert each hashtag
  FOREACH v_hashtag IN ARRAY v_hashtags
  LOOP
    v_hashtag_id := get_or_create_hashtag(v_hashtag);
    INSERT INTO post_hashtags (post_id, hashtag_id)
    VALUES (p_post_id, v_hashtag_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  post_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.name, h.post_count
  FROM hashtags h
  WHERE h.post_count > 0
  ORDER BY h.post_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
