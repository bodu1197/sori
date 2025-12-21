-- Fix: Update notification triggers to use correct column names
-- Run this in Supabase SQL Editor

-- Fix like notification trigger
CREATE OR REPLACE FUNCTION create_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type, content)
        VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id, 'post', 'liked your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix comment notification trigger
CREATE OR REPLACE FUNCTION create_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type, content)
        VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, 'post', 'commented on your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_post_like_notify ON post_likes;
CREATE TRIGGER on_post_like_notify
    AFTER INSERT ON post_likes
    FOR EACH ROW EXECUTE FUNCTION create_post_like_notification();

DROP TRIGGER IF EXISTS on_post_comment_notify ON post_comments;
CREATE TRIGGER on_post_comment_notify
    AFTER INSERT ON post_comments
    FOR EACH ROW EXECUTE FUNCTION create_post_comment_notification();
