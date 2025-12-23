-- Story Views table
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- RLS policies
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Anyone can view story_views (for counting)
CREATE POLICY "Anyone can view story_views" ON story_views
  FOR SELECT USING (true);

-- Users can insert their own views
CREATE POLICY "Users can insert own views" ON story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Function to mark story as viewed
CREATE OR REPLACE FUNCTION mark_story_viewed(p_story_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO story_views (story_id, viewer_id)
  VALUES (p_story_id, auth.uid())
  ON CONFLICT (story_id, viewer_id) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_story_viewed(UUID) TO authenticated;
