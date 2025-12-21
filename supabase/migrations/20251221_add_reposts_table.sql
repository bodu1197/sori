-- Migration: Add reposts table
-- Date: 2024-12-21
-- Description: Enable repost (share) functionality for posts

-- 1. Create reposts table
CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  quote TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 2. Add repost_count to playlists if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playlists' AND column_name = 'repost_count'
  ) THEN
    ALTER TABLE playlists ADD COLUMN repost_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post ON reposts(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_created ON reposts(created_at DESC);

-- 4. Enable RLS
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Everyone can view reposts
CREATE POLICY "Everyone can view reposts"
  ON reposts FOR SELECT
  USING (true);

-- Users can create reposts
CREATE POLICY "Users can create reposts"
  ON reposts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reposts
CREATE POLICY "Users can delete own reposts"
  ON reposts FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Function to update repost count
CREATE OR REPLACE FUNCTION update_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET repost_count = COALESCE(repost_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET repost_count = GREATEST(COALESCE(repost_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_repost_change ON reposts;
CREATE TRIGGER on_repost_change
  AFTER INSERT OR DELETE ON reposts
  FOR EACH ROW
  EXECUTE FUNCTION update_repost_count();

-- 7. Function to create repost notification
CREATE OR REPLACE FUNCTION create_repost_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post_owner_id UUID;
  v_post_title TEXT;
BEGIN
  -- Get post owner
  SELECT user_id, title INTO v_post_owner_id, v_post_title
  FROM playlists WHERE id = NEW.post_id;

  -- Don't notify if reposting own post
  IF v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification
  INSERT INTO notifications (user_id, type, actor_id, post_id, message)
  VALUES (
    v_post_owner_id,
    'repost',
    NEW.user_id,
    NEW.post_id,
    'reposted your playlist "' || COALESCE(v_post_title, 'Untitled') || '"'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_repost_notify ON reposts;
CREATE TRIGGER on_repost_notify
  AFTER INSERT ON reposts
  FOR EACH ROW
  EXECUTE FUNCTION create_repost_notification();

-- 8. Get feed with reposts
CREATE OR REPLACE FUNCTION get_feed_with_reposts(p_user_id UUID, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  type TEXT,
  post_id UUID,
  post_title TEXT,
  post_description TEXT,
  post_cover_url TEXT,
  post_video_id TEXT,
  post_created_at TIMESTAMPTZ,
  post_user_id UUID,
  post_username TEXT,
  post_avatar_url TEXT,
  reposter_id UUID,
  reposter_username TEXT,
  reposter_avatar_url TEXT,
  repost_quote TEXT,
  created_at TIMESTAMPTZ,
  like_count INTEGER,
  comment_count INTEGER,
  repost_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH feed_items AS (
    -- Original posts from followed users
    SELECT
      p.id AS item_id,
      'post'::TEXT AS item_type,
      p.id AS p_id,
      p.title AS p_title,
      p.description AS p_description,
      p.cover_url AS p_cover_url,
      p.video_id AS p_video_id,
      p.created_at AS p_created_at,
      p.user_id AS p_user_id,
      pr.username AS p_username,
      pr.avatar_url AS p_avatar_url,
      NULL::UUID AS r_id,
      NULL::TEXT AS r_username,
      NULL::TEXT AS r_avatar_url,
      NULL::TEXT AS r_quote,
      p.created_at AS sort_date,
      COALESCE(p.like_count, 0) AS p_like_count,
      COALESCE(p.comment_count, 0) AS p_comment_count,
      COALESCE(p.repost_count, 0) AS p_repost_count
    FROM playlists p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    ) OR p.user_id = p_user_id

    UNION ALL

    -- Reposts from followed users
    SELECT
      r.id AS item_id,
      'repost'::TEXT AS item_type,
      p.id AS p_id,
      p.title AS p_title,
      p.description AS p_description,
      p.cover_url AS p_cover_url,
      p.video_id AS p_video_id,
      p.created_at AS p_created_at,
      p.user_id AS p_user_id,
      pr.username AS p_username,
      pr.avatar_url AS p_avatar_url,
      rpr.id AS r_id,
      rpr.username AS r_username,
      rpr.avatar_url AS r_avatar_url,
      r.quote AS r_quote,
      r.created_at AS sort_date,
      COALESCE(p.like_count, 0) AS p_like_count,
      COALESCE(p.comment_count, 0) AS p_comment_count,
      COALESCE(p.repost_count, 0) AS p_repost_count
    FROM reposts r
    JOIN playlists p ON r.post_id = p.id
    JOIN profiles pr ON p.user_id = pr.id
    JOIN profiles rpr ON r.user_id = rpr.id
    WHERE r.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
    AND r.user_id != p.user_id
  )
  SELECT
    fi.item_id,
    fi.item_type,
    fi.p_id,
    fi.p_title,
    fi.p_description,
    fi.p_cover_url,
    fi.p_video_id,
    fi.p_created_at,
    fi.p_user_id,
    fi.p_username,
    fi.p_avatar_url,
    fi.r_id,
    fi.r_username,
    fi.r_avatar_url,
    fi.r_quote,
    fi.sort_date,
    fi.p_like_count,
    fi.p_comment_count,
    fi.p_repost_count
  FROM feed_items fi
  ORDER BY fi.sort_date DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 9. Check if user has reposted a post
CREATE OR REPLACE FUNCTION has_user_reposted(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reposts WHERE user_id = p_user_id AND post_id = p_post_id
  );
END;
$$ LANGUAGE plpgsql;
