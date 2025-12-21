-- Posts table for public feed (separate from personal playlists/saved songs)
-- Posts = Music I share publicly (like Instagram posts)
-- Playlists = Music I save for myself (like Instagram saves)

-- =====================================================
-- POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    cover_url TEXT,
    caption TEXT,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view public posts
DROP POLICY IF EXISTS "Anyone can view public posts" ON posts;
CREATE POLICY "Anyone can view public posts" ON posts
FOR SELECT USING (is_public = TRUE);

-- Users can view their own posts (including private)
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
CREATE POLICY "Users can view own posts" ON posts
FOR SELECT USING (auth.uid() = user_id);

-- Users can create posts
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own posts
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts
FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_public ON posts(is_public, created_at DESC);

-- =====================================================
-- POST_LIKES TABLE (separate from playlist likes)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post likes" ON post_likes;
CREATE POLICY "Anyone can view post likes" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

-- =====================================================
-- POST_COMMENTS TABLE (separate from playlist comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post comments" ON post_comments;
CREATE POLICY "Anyone can view post comments" ON post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create post comments" ON post_comments;
CREATE POLICY "Users can create post comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post comments" ON post_comments;
CREATE POLICY "Users can delete own post comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

-- =====================================================
-- TRIGGERS FOR POSTS
-- =====================================================

-- Like count trigger for posts
CREATE OR REPLACE FUNCTION update_post_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like_change ON post_likes;
CREATE TRIGGER on_post_like_change
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_like_counts();

-- Comment count trigger for posts
CREATE OR REPLACE FUNCTION update_post_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_comment_change ON post_comments;
CREATE TRIGGER on_post_comment_change
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_counts();

-- Like notification for posts
CREATE OR REPLACE FUNCTION create_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, actor_id, post_id, message)
        VALUES (post_owner_id, 'like', NEW.user_id, NEW.post_id, 'liked your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like_notify ON post_likes;
CREATE TRIGGER on_post_like_notify
    AFTER INSERT ON post_likes
    FOR EACH ROW EXECUTE FUNCTION create_post_like_notification();

-- Comment notification for posts
CREATE OR REPLACE FUNCTION create_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id, message)
        VALUES (post_owner_id, 'comment', NEW.user_id, NEW.post_id, NEW.id, 'commented on your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_comment_notify ON post_comments;
CREATE TRIGGER on_post_comment_notify
    AFTER INSERT ON post_comments
    FOR EACH ROW EXECUTE FUNCTION create_post_comment_notification();

-- =====================================================
-- SAVED_SONGS TABLE (for personal saved/liked songs)
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

ALTER TABLE saved_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved songs" ON saved_songs;
CREATE POLICY "Users can view own saved songs" ON saved_songs
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save songs" ON saved_songs;
CREATE POLICY "Users can save songs" ON saved_songs
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave songs" ON saved_songs;
CREATE POLICY "Users can unsave songs" ON saved_songs
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_songs_user ON saved_songs(user_id);
