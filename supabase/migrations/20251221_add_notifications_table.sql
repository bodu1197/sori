-- Migration: Add notifications table for SNS notification system
-- Date: 2024-12-21
-- Description: Enable notifications for likes, comments, follows, and mentions

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'reply')),
  reference_id UUID, -- post_id, comment_id, etc.
  reference_type TEXT, -- 'post', 'comment', etc.
  content TEXT, -- Optional message preview
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);

-- 3. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to create notification on follow
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't notify if following yourself (shouldn't happen but safety check)
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, reference_type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'profile');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for follow notifications
DROP TRIGGER IF EXISTS on_new_follow ON follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

-- 7. Function to create notification on like
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM playlists WHERE id = NEW.post_id;

  -- Don't notify if liking your own post
  IF NEW.user_id = post_owner_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type)
  VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id, 'post');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger for like notifications
DROP TRIGGER IF EXISTS on_new_like ON post_likes;
CREATE TRIGGER on_new_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

-- 9. Function to create notification on comment
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  parent_comment_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM playlists WHERE id = NEW.post_id;

  IF NEW.parent_id IS NOT NULL THEN
    -- This is a reply - notify the parent comment owner
    SELECT user_id INTO parent_comment_owner_id FROM comments WHERE id = NEW.parent_id;

    -- Don't notify if replying to yourself
    IF NEW.user_id != parent_comment_owner_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type, content)
      VALUES (parent_comment_owner_id, NEW.user_id, 'reply', NEW.id, 'comment', LEFT(NEW.content, 100));
    END IF;
  ELSE
    -- This is a top-level comment - notify the post owner
    -- Don't notify if commenting on your own post
    IF NEW.user_id != post_owner_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type, content)
      VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, 'post', LEFT(NEW.content, 100));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger for comment notifications
DROP TRIGGER IF EXISTS on_new_comment ON comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();
