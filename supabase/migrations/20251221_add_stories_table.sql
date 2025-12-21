-- Migration: Add stories table for Instagram-style stories feature
-- Date: 2024-12-21
-- Description: Enable 24-hour temporary stories with music content

-- 1. Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Story content: can be a music track or playlist
  content_type TEXT NOT NULL CHECK (content_type IN ('track', 'playlist', 'text')),
  video_id TEXT, -- For track type
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL, -- For playlist type
  -- Metadata
  title TEXT,
  artist TEXT,
  cover_url TEXT,
  text_content TEXT, -- For text type stories
  background_color TEXT DEFAULT '#000000',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  -- Visibility
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. Create story views table (track who has seen each story)
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON story_views(viewer_id);

-- 4. Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for stories
-- Users can view active stories from people they follow or their own
CREATE POLICY "Users can view active stories"
  ON stories FOR SELECT
  USING (
    is_active = TRUE
    AND expires_at > NOW()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid()
        AND following_id = stories.user_id
      )
    )
  );

-- Users can create their own stories
CREATE POLICY "Users can create own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories
CREATE POLICY "Users can update own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for story_views
-- Users can see views on their own stories
CREATE POLICY "Users can view story views on own stories"
  ON story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- System can create story views
CREATE POLICY "System can create story views"
  ON story_views FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- 7. Function to clean up expired stories (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM stories
    WHERE expires_at < NOW() OR is_active = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to mark story as viewed
CREATE OR REPLACE FUNCTION mark_story_viewed(p_story_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO story_views (story_id, viewer_id)
  VALUES (p_story_id, auth.uid())
  ON CONFLICT (story_id, viewer_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
