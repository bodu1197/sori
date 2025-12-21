const https = require('https');

// Configuration
const PROJECT_ID = 'nrtkbulkzhhlstaomvas';
const ACCESS_TOKEN = 'sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296';

function executeQuery(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_ID}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: 'success', body });
        } else {
          resolve({ status: 'error', code: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

const migrations = [
  // Stories table
  `CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('track', 'playlist', 'text')),
    video_id TEXT,
    playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
    title TEXT,
    artist TEXT,
    cover_url TEXT,
    text_content TEXT,
    background_color TEXT DEFAULT '#000000',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    is_active BOOLEAN DEFAULT TRUE
  )`,

  // Story views
  `CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
  )`,

  // Stories RLS
  `ALTER TABLE stories ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE story_views ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Anyone can view active stories" ON stories`,
  `CREATE POLICY "Anyone can view active stories" ON stories FOR SELECT USING (is_active = TRUE AND expires_at > NOW())`,
  `DROP POLICY IF EXISTS "Users can create own stories" ON stories`,
  `CREATE POLICY "Users can create own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "Users can delete own stories" ON stories`,
  `CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "Anyone can create story views" ON story_views`,
  `CREATE POLICY "Anyone can create story views" ON story_views FOR INSERT WITH CHECK (viewer_id = auth.uid())`,

  // Comments table
  `CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE comments ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Anyone can view comments" ON comments`,
  `CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Users can create comments" ON comments`,
  `CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "Users can delete own comments" ON comments`,
  `CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id)`,

  // Add comment_count to playlists
  `ALTER TABLE playlists ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    comment_id UUID,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Users can view own notifications" ON notifications`,
  `CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "System can create notifications" ON notifications`,
  `CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Users can update own notifications" ON notifications`,
  `CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id)`,

  // Conversations table
  `CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    shared_track_id TEXT,
    shared_track_title TEXT,
    shared_track_artist TEXT,
    shared_track_thumbnail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE conversations ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE messages ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Users can view own conversations" ON conversations`,
  `CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
  )`,
  `DROP POLICY IF EXISTS "Users can view own participations" ON conversation_participants`,
  `CREATE POLICY "Users can view own participations" ON conversation_participants FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
  )`,
  `DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages`,
  `CREATE POLICY "Users can view messages in own conversations" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  )`,
  `DROP POLICY IF EXISTS "Users can send messages" ON messages`,
  `CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id)`,

  // Hashtags table
  `CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS post_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, hashtag_id)
  )`,
  `ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Anyone can view hashtags" ON hashtags`,
  `CREATE POLICY "Anyone can view hashtags" ON hashtags FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Anyone can view post_hashtags" ON post_hashtags`,
  `CREATE POLICY "Anyone can view post_hashtags" ON post_hashtags FOR SELECT USING (true)`,

  // Reposts table
  `CREATE TABLE IF NOT EXISTS reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
  )`,
  `ALTER TABLE playlists ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0`,
  `ALTER TABLE reposts ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Anyone can view reposts" ON reposts`,
  `CREATE POLICY "Anyone can view reposts" ON reposts FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Users can create reposts" ON reposts`,
  `CREATE POLICY "Users can create reposts" ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "Users can delete own reposts" ON reposts`,
  `CREATE POLICY "Users can delete own reposts" ON reposts FOR DELETE USING (auth.uid() = user_id)`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name)`,
  `CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id)`,
];

async function main() {
  console.log('Starting SNS migrations...\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const shortSql = sql.replace(/\s+/g, ' ').substring(0, 60) + '...';

    try {
      const result = await executeQuery(sql);

      if (result.status === 'success') {
        console.log(`[${i + 1}/${migrations.length}] OK: ${shortSql}`);
        successCount++;
      } else {
        console.log(`[${i + 1}/${migrations.length}] ERROR (${result.code}): ${shortSql}`);
        console.log(`   ${result.body.substring(0, 100)}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`[${i + 1}/${migrations.length}] FAILED: ${shortSql}`);
      console.log(`   ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Migration complete!`);
  console.log(`Success: ${successCount}/${migrations.length}`);
  console.log(`Errors: ${errorCount}/${migrations.length}`);
}

main();
