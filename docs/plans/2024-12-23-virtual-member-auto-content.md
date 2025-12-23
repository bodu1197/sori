# Virtual Member Auto-Content Generation System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 가상회원이 모국어로 자동 콘텐츠를 생성하고, 사용자가 번역 버튼으로 자신의 언어로 번역할 수 있는 시스템

**Architecture:**
- 스케줄러가 주기적으로 가상회원 활동 트리거
- Gemini AI가 아티스트 모국어로 콘텐츠 생성
- 신규 앨범 자동 감지 (YouTube Music API)
- 번역 요청 시 Gemini AI로 번역 후 캐싱

**Tech Stack:** FastAPI, Supabase, Gemini AI, React, TypeScript, ytmusicapi

---

## Phase 1: Database Schema

### Task 1.1: Create Translation Cache Table

**Files:**
- Create: `supabase/migrations/20251224_translations.sql`

**Step 1: Write the migration SQL**

```sql
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

-- Only service role can insert (backend only)
CREATE POLICY "Service role can insert translations" ON post_translations
  FOR INSERT WITH CHECK (true);
```

**Step 2: Execute migration via Supabase Management API**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS post_translations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, source_language TEXT NOT NULL, target_language TEXT NOT NULL, original_text TEXT NOT NULL, translated_text TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(post_id, target_language)); CREATE INDEX IF NOT EXISTS idx_post_translations_post_id ON post_translations(post_id); CREATE INDEX IF NOT EXISTS idx_post_translations_lookup ON post_translations(post_id, target_language); ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY; CREATE POLICY \"Anyone can read translations\" ON post_translations FOR SELECT USING (true);"}'
```

**Step 3: Commit**

```bash
git add supabase/migrations/20251224_translations.sql
git commit -m "feat: add post_translations table for caching translations"
```

---

### Task 1.2: Add Language Columns to Existing Tables

**Files:**
- Create: `supabase/migrations/20251224_language_columns.sql`

**Step 1: Write the migration SQL**

```sql
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
```

**Step 2: Execute via Supabase Management API**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT '\''en'\''; ALTER TABLE music_artists ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT '\''en'\''; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT '\''en'\''; CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);"}'
```

**Step 3: Commit**

```bash
git add supabase/migrations/20251224_language_columns.sql
git commit -m "feat: add language columns to posts, music_artists, profiles"
```

---

### Task 1.3: Create Artist Releases Tracking Table

**Files:**
- Create: `supabase/migrations/20251224_artist_releases.sql`

**Step 1: Write the migration SQL**

```sql
-- Track artist releases for new album detection
CREATE TABLE IF NOT EXISTS artist_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_browse_id TEXT NOT NULL UNIQUE,
  known_album_ids JSONB DEFAULT '[]'::jsonb,
  known_single_ids JSONB DEFAULT '[]'::jsonb,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  last_new_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artist_releases_browse_id ON artist_releases(artist_browse_id);
CREATE INDEX IF NOT EXISTS idx_artist_releases_last_checked ON artist_releases(last_checked_at);

-- RLS policies
ALTER TABLE artist_releases ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON artist_releases
  FOR ALL USING (true);
```

**Step 2: Execute via Supabase Management API**

**Step 3: Commit**

```bash
git add supabase/migrations/20251224_artist_releases.sql
git commit -m "feat: add artist_releases table for new album detection"
```

---

### Task 1.4: Create Activity Queue Table

**Files:**
- Create: `supabase/migrations/20251224_activity_queue.sql`

**Step 1: Write the migration SQL**

```sql
-- Activity queue for scheduled virtual member actions
CREATE TABLE IF NOT EXISTS artist_activity_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'post', 'story', 'comment', 'like', 'dm'
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  trigger_reason TEXT, -- 'scheduled', 'new_release', 'new_follower', 'fan_post'
  content JSONB, -- Generated content data
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'cancelled'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_queue_status ON artist_activity_queue(status);
CREATE INDEX IF NOT EXISTS idx_activity_queue_scheduled ON artist_activity_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_activity_queue_artist ON artist_activity_queue(artist_profile_id);

-- RLS
ALTER TABLE artist_activity_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON artist_activity_queue
  FOR ALL USING (true);
```

**Step 2: Execute via Supabase Management API**

**Step 3: Commit**

```bash
git add supabase/migrations/20251224_activity_queue.sql
git commit -m "feat: add artist_activity_queue for scheduled activities"
```

---

## Phase 2: Backend Translation API

### Task 2.1: Add Translation Functions to ai_agent.py

**Files:**
- Modify: `backend/ai_agent.py`

**Step 1: Add language detection function**

Add at the end of `ai_agent.py`:

```python
def detect_language(text: str) -> str:
    """
    Detect the language of given text using Gemini.
    Returns ISO 639-1 code (en, ko, ja, zh, es, etc.)
    """
    if not genai or not text:
        return "en"

    try:
        prompt = f"""
Detect the language of this text and return ONLY the ISO 639-1 code.
Examples: en, ko, ja, zh, es, fr, de, pt, id, ar, hi, ru, tr

Text: "{text[:500]}"

Return ONLY the 2-letter code, nothing else.
"""
        response = model.generate_content(prompt)
        code = response.text.strip().lower()[:2]
        # Validate it's a known code
        valid_codes = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'id', 'ar', 'hi', 'ru', 'tr', 'vi', 'th', 'nl', 'pl', 'it']
        return code if code in valid_codes else "en"
    except Exception as e:
        logger.error(f"Language detection error: {e}")
        return "en"


def translate_text(text: str, source_lang: str, target_lang: str) -> str | None:
    """
    Translate text from source language to target language using Gemini.
    """
    if not genai or not text:
        return None

    if source_lang == target_lang:
        return text

    # Language names for better translation
    lang_names = {
        'en': 'English', 'ko': 'Korean', 'ja': 'Japanese', 'zh': 'Chinese',
        'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
        'id': 'Indonesian', 'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian',
        'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai', 'nl': 'Dutch',
        'pl': 'Polish', 'it': 'Italian'
    }

    source_name = lang_names.get(source_lang, source_lang)
    target_name = lang_names.get(target_lang, target_lang)

    try:
        prompt = f"""
Translate the following text from {source_name} to {target_name}.
Keep the tone, style, and any emojis intact.
Return ONLY the translated text, nothing else.

Original text:
{text}
"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return None


def generate_artist_post_multilingual(
    artist_name: str,
    persona: dict,
    language: str,
    post_type: str = None,
    context: dict = None
) -> dict | None:
    """
    Generate a social media post in the artist's native language.

    Args:
        artist_name: Name of the artist
        persona: AI persona dict
        language: ISO 639-1 code for the post language
        post_type: Optional specific type (new_album, concert, etc.)
        context: Optional context dict (album_name, concert_venue, etc.)
    """
    if not genai:
        return None

    lang_names = {
        'en': 'English', 'ko': 'Korean', 'ja': 'Japanese', 'zh': 'Chinese',
        'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
        'id': 'Indonesian', 'ar': 'Arabic', 'sw': 'Swahili', 'yo': 'Yoruba',
        'zu': 'Zulu', 'am': 'Amharic', 'ha': 'Hausa'
    }

    lang_name = lang_names.get(language, 'English')
    tone = persona.get("tone", "friendly, casual, warm") if persona else "friendly, casual, warm"
    fandom = persona.get("fandom_name", "fans") if persona else "fans"

    # Determine post content based on type
    if post_type == "new_album" and context:
        type_instruction = f"Announce your new album '{context.get('album_name', 'new album')}' with excitement!"
    elif post_type == "new_single" and context:
        type_instruction = f"Announce your new single '{context.get('single_name', 'new song')}' to your fans!"
    elif post_type == "concert" and context:
        venue = context.get('venue', '')
        date = context.get('date', '')
        type_instruction = f"Announce your upcoming concert at {venue} on {date}!"
    else:
        import random
        types = [
            "Share a personal thought or reflection",
            "Express gratitude to your fans",
            "Share what you're working on in the studio",
            "Share a daily life moment"
        ]
        type_instruction = random.choice(types)

    prompt = f"""
You are {artist_name}, a music artist posting on social media.

IMPORTANT: Write the post in {lang_name} language ONLY.

Your personality/tone: {tone}
Your fan base is called: {fandom}
What to post about: {type_instruction}

Write a SHORT, authentic social media post (1-3 sentences).
Make it feel personal and genuine.
Include 1-2 relevant emojis.

Output JSON only:
{{
  "caption": "The post text in {lang_name}",
  "type": "update|music|thoughts|fan|announcement",
  "hashtags": ["tag1", "tag2", "tag3"]
}}

Return ONLY valid JSON.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)

        result = json.loads(text)
        result["language"] = language
        return result
    except Exception as e:
        logger.error(f"Error generating multilingual post: {e}")
        return None
```

**Step 2: Commit**

```bash
git add backend/ai_agent.py
git commit -m "feat: add multilingual translation and post generation functions"
```

---

### Task 2.2: Add Translation API Endpoint

**Files:**
- Modify: `backend/main.py`

**Step 1: Add translate endpoint**

Add after the existing AI endpoints (around line 3600):

```python
@app.post("/api/translate")
async def translate_post(request: Request):
    """
    Translate text to target language with caching.
    """
    try:
        body = await request.json()
        text = body.get("text", "").strip()
        post_id = body.get("post_id")  # Optional: for caching
        source_lang = body.get("source_lang", "").strip()
        target_lang = body.get("target_lang", "").strip()

        if not text or not target_lang:
            raise HTTPException(status_code=400, detail="text and target_lang required")

        # Check cache first if post_id provided
        if post_id and supabase_client:
            cache_result = supabase_client.table("post_translations").select("translated_text").eq("post_id", post_id).eq("target_language", target_lang).execute()
            if cache_result.data and len(cache_result.data) > 0:
                return {
                    "translated_text": cache_result.data[0]["translated_text"],
                    "source": "cache"
                }

        # Detect source language if not provided
        if not source_lang:
            from ai_agent import detect_language
            source_lang = await run_in_thread(detect_language, text)

        # Same language, return original
        if source_lang == target_lang:
            return {
                "translated_text": text,
                "source": "original"
            }

        # Translate using AI
        from ai_agent import translate_text
        translated = await run_in_thread(translate_text, text, source_lang, target_lang)

        if not translated:
            raise HTTPException(status_code=500, detail="Translation failed")

        # Cache the result if post_id provided
        if post_id and supabase_client:
            try:
                supabase_client.table("post_translations").upsert({
                    "post_id": post_id,
                    "source_language": source_lang,
                    "target_language": target_lang,
                    "original_text": text,
                    "translated_text": translated
                }, on_conflict="post_id,target_language").execute()
            except Exception as e:
                logger.warning(f"Failed to cache translation: {e}")

        return {
            "translated_text": translated,
            "source_language": source_lang,
            "target_language": target_lang,
            "source": "ai"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

**Step 2: Commit**

```bash
git add backend/main.py
git commit -m "feat: add /api/translate endpoint with caching"
```

---

### Task 2.3: Add New Release Detection Endpoint

**Files:**
- Modify: `backend/main.py`

**Step 1: Add check releases endpoint**

```python
@app.post("/api/artist/check-releases")
async def check_artist_new_releases(request: Request, background_tasks: BackgroundTasks):
    """
    Check for new releases from virtual member artists.
    Called by scheduler or manually.
    """
    try:
        # Get all virtual member artists
        if not supabase_client:
            raise HTTPException(status_code=500, detail="Database not available")

        artists_result = supabase_client.table("profiles").select(
            "id, username, artist_browse_id, ai_persona"
        ).eq("member_type", "artist").not_.is_("artist_browse_id", "null").execute()

        if not artists_result.data:
            return {"message": "No virtual member artists found", "checked": 0}

        new_releases = []

        for artist in artists_result.data:
            browse_id = artist["artist_browse_id"]
            profile_id = artist["id"]
            artist_name = artist["username"]
            persona = artist.get("ai_persona") or {}

            try:
                # Get current releases from YouTube Music
                ytmusic = get_ytmusic("US")
                artist_info = ytmusic.get_artist(browse_id)

                if not artist_info:
                    continue

                # Get known releases from DB
                releases_result = supabase_client.table("artist_releases").select("*").eq("artist_browse_id", browse_id).execute()

                known_albums = set()
                known_singles = set()

                if releases_result.data and len(releases_result.data) > 0:
                    known_albums = set(releases_result.data[0].get("known_album_ids") or [])
                    known_singles = set(releases_result.data[0].get("known_single_ids") or [])

                # Check for new albums
                current_albums = []
                if "albums" in artist_info and "results" in artist_info["albums"]:
                    current_albums = [a.get("browseId") for a in artist_info["albums"]["results"] if a.get("browseId")]

                current_singles = []
                if "singles" in artist_info and "results" in artist_info["singles"]:
                    current_singles = [s.get("browseId") for s in artist_info["singles"]["results"] if s.get("browseId")]

                # Find new releases
                new_album_ids = set(current_albums) - known_albums
                new_single_ids = set(current_singles) - known_singles

                if new_album_ids or new_single_ids:
                    # Get release names
                    for album_id in new_album_ids:
                        album_info = next((a for a in artist_info["albums"]["results"] if a.get("browseId") == album_id), {})
                        new_releases.append({
                            "artist_profile_id": profile_id,
                            "artist_name": artist_name,
                            "type": "album",
                            "name": album_info.get("title", "New Album"),
                            "browse_id": album_id
                        })

                    for single_id in new_single_ids:
                        single_info = next((s for s in artist_info["singles"]["results"] if s.get("browseId") == single_id), {})
                        new_releases.append({
                            "artist_profile_id": profile_id,
                            "artist_name": artist_name,
                            "type": "single",
                            "name": single_info.get("title", "New Single"),
                            "browse_id": single_id
                        })

                    # Queue auto-post for new releases
                    for release in new_releases[-len(new_album_ids)-len(new_single_ids):]:
                        background_tasks.add_task(
                            create_release_announcement_post,
                            release["artist_profile_id"],
                            release["artist_name"],
                            persona,
                            release["type"],
                            release["name"]
                        )

                # Update known releases
                supabase_client.table("artist_releases").upsert({
                    "artist_browse_id": browse_id,
                    "known_album_ids": list(set(current_albums)),
                    "known_single_ids": list(set(current_singles)),
                    "last_checked_at": datetime.now(timezone.utc).isoformat(),
                    "last_new_release_at": datetime.now(timezone.utc).isoformat() if new_album_ids or new_single_ids else None
                }, on_conflict="artist_browse_id").execute()

            except Exception as e:
                logger.warning(f"Error checking releases for {browse_id}: {e}")
                continue

        return {
            "message": "Release check completed",
            "checked": len(artists_result.data),
            "new_releases": new_releases
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Release check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def create_release_announcement_post(
    artist_profile_id: str,
    artist_name: str,
    persona: dict,
    release_type: str,
    release_name: str
):
    """
    Create an automatic announcement post for a new release.
    """
    try:
        from ai_agent import generate_artist_post_multilingual

        # Determine artist language (default to English)
        language = "en"
        if supabase_client:
            artist_result = supabase_client.table("music_artists").select("primary_language").eq("browse_id", persona.get("artist_browse_id", "")).execute()
            if artist_result.data and len(artist_result.data) > 0:
                language = artist_result.data[0].get("primary_language") or "en"

        # Generate post
        context = {
            "album_name" if release_type == "album" else "single_name": release_name
        }
        post_type = "new_album" if release_type == "album" else "new_single"

        post_data = await run_in_thread(
            generate_artist_post_multilingual,
            artist_name,
            persona,
            language,
            post_type,
            context
        )

        if post_data and supabase_client:
            supabase_client.table("posts").insert({
                "user_id": artist_profile_id,
                "caption": post_data.get("caption", f"New {release_type}: {release_name}!"),
                "post_type": "text",
                "language": language,
                "is_public": True
            }).execute()

            logger.info(f"Created release announcement for {artist_name}: {release_name}")

    except Exception as e:
        logger.error(f"Error creating release announcement: {e}")
```

**Step 2: Commit**

```bash
git add backend/main.py
git commit -m "feat: add new release detection and auto-announcement"
```

---

## Phase 3: Frontend Translation Component

### Task 3.1: Create TranslateButton Component

**Files:**
- Create: `frontend/src/components/social/TranslateButton.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react';
import { Languages, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

interface TranslateButtonProps {
  postId: string;
  text: string;
  sourceLanguage?: string;
  className?: string;
}

export default function TranslateButton({
  postId,
  text,
  sourceLanguage,
  className = '',
}: TranslateButtonProps) {
  const { i18n, t } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userLanguage = i18n.language?.split('-')[0] || 'en';

  // Don't show button if content is in user's language
  if (sourceLanguage && sourceLanguage === userLanguage) {
    return null;
  }

  const handleTranslate = async () => {
    if (translatedText) {
      // Toggle off
      setTranslatedText(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          post_id: postId,
          source_lang: sourceLanguage || '',
          target_lang: userLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedText(data.translated_text);
    } catch (err) {
      setError(t('common.error', 'Translation failed'));
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleTranslate}
        disabled={isTranslating}
        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        {isTranslating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : translatedText ? (
          <X size={14} />
        ) : (
          <Languages size={14} />
        )}
        <span>
          {isTranslating
            ? t('feed.translating', 'Translating...')
            : translatedText
              ? t('feed.hideTranslation', 'Hide translation')
              : t('feed.translate', 'Translate')}
        </span>
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {translatedText && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('feed.translatedTo', 'Translated')}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {translatedText}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from index**

Add to `frontend/src/components/social/index.ts`:

```tsx
export { default as TranslateButton } from './TranslateButton';
```

**Step 3: Commit**

```bash
git add frontend/src/components/social/TranslateButton.tsx
git add frontend/src/components/social/index.ts
git commit -m "feat: add TranslateButton component for post translation"
```

---

### Task 3.2: Add Translation Strings

**Files:**
- Modify: `frontend/src/locales/translations.ts`

**Step 1: Add translation strings to all languages**

Add to the `feed` section of each language:

```typescript
// English (en)
translate: 'Translate',
translating: 'Translating...',
hideTranslation: 'Hide translation',
translatedTo: 'Translated',

// Korean (ko)
translate: '번역하기',
translating: '번역 중...',
hideTranslation: '번역 숨기기',
translatedTo: '번역됨',

// Japanese (ja)
translate: '翻訳する',
translating: '翻訳中...',
hideTranslation: '翻訳を非表示',
translatedTo: '翻訳済み',

// Chinese (zh)
translate: '翻译',
translating: '翻译中...',
hideTranslation: '隐藏翻译',
translatedTo: '已翻译',

// Spanish (es)
translate: 'Traducir',
translating: 'Traduciendo...',
hideTranslation: 'Ocultar traducción',
translatedTo: 'Traducido',

// Portuguese (pt)
translate: 'Traduzir',
translating: 'Traduzindo...',
hideTranslation: 'Ocultar tradução',
translatedTo: 'Traduzido',

// French (fr)
translate: 'Traduire',
translating: 'Traduction...',
hideTranslation: 'Masquer la traduction',
translatedTo: 'Traduit',

// German (de)
translate: 'Übersetzen',
translating: 'Übersetzen...',
hideTranslation: 'Übersetzung ausblenden',
translatedTo: 'Übersetzt',

// Indonesian (id)
translate: 'Terjemahkan',
translating: 'Menerjemahkan...',
hideTranslation: 'Sembunyikan terjemahan',
translatedTo: 'Diterjemahkan',
```

**Step 2: Commit**

```bash
git add frontend/src/locales/translations.ts
git commit -m "feat: add translation UI strings for all 9 languages"
```

---

### Task 3.3: Integrate TranslateButton into FeedPage

**Files:**
- Modify: `frontend/src/pages/FeedPage.tsx`

**Step 1: Import TranslateButton**

Add to imports:

```tsx
import { TranslateButton } from '../components/social';
```

**Step 2: Update FeedPost interface**

```tsx
interface FeedPost {
  // ... existing fields
  language?: string;
}
```

**Step 3: Add TranslateButton to FeedPostComponent**

Add after the caption section (around line 592):

```tsx
{/* Caption */}
<div className="px-3 pt-1">
  <div className="text-sm">
    <span className="font-semibold mr-2 text-black dark:text-white">{displayName}</span>
    <span className="text-gray-700 dark:text-gray-300">{post.caption}</span>
  </div>

  {/* Translate Button */}
  {post.caption && (
    <TranslateButton
      postId={post.id}
      text={post.caption}
      sourceLanguage={post.language}
      className="mt-1"
    />
  )}

  {/* Comments link */}
  {(post.comment_count || 0) > 0 ? (
    // ...existing code
  )}
</div>
```

**Step 4: Update posts query to include language**

In fetchPosts function, ensure language is selected:

```tsx
const { data: postsData } = await supabase
  .from('posts')
  .select('*, language')  // Add language
  // ...rest of query
```

**Step 5: Commit**

```bash
git add frontend/src/pages/FeedPage.tsx
git commit -m "feat: integrate TranslateButton into feed posts"
```

---

## Phase 4: Language Sync & Artist Detection

### Task 4.1: Sync User Language to Server

**Files:**
- Modify: `frontend/src/pages/SettingsPage.tsx`

**Step 1: Add API call when language changes**

In the handleLanguageChange function, add server sync:

```tsx
const handleLanguageChange = async (langCode: string) => {
  i18n.changeLanguage(langCode);
  localStorage.setItem('language', langCode);

  // Sync to server for translation preferences
  if (user?.id) {
    try {
      await supabase
        .from('profiles')
        .update({ preferred_language: langCode })
        .eq('id', user.id);
    } catch (error) {
      console.error('Failed to sync language preference:', error);
    }
  }

  setLanguageModalOpen(false);
};
```

**Step 2: Commit**

```bash
git add frontend/src/pages/SettingsPage.tsx
git commit -m "feat: sync user language preference to server"
```

---

### Task 4.2: Auto-detect Artist Language

**Files:**
- Modify: `backend/main.py`

**Step 1: Add language detection to virtual member creation**

Update `create_virtual_member_sync` function to detect language based on artist info:

```python
def detect_artist_language(artist_info: dict) -> str:
    """
    Detect artist's primary language based on their info.
    """
    # Check description for language hints
    description = artist_info.get("description", "").lower()

    # Korean indicators
    if any(char >= '\uac00' and char <= '\ud7a3' for char in description):
        return "ko"
    # Japanese indicators
    if any(char >= '\u3040' and char <= '\u309f' for char in description) or \
       any(char >= '\u30a0' and char <= '\u30ff' for char in description):
        return "ja"
    # Chinese indicators
    if any(char >= '\u4e00' and char <= '\u9fff' for char in description):
        return "zh"
    # Arabic indicators
    if any(char >= '\u0600' and char <= '\u06ff' for char in description):
        return "ar"

    # Default to English
    return "en"
```

**Step 2: Commit**

```bash
git add backend/main.py
git commit -m "feat: auto-detect artist primary language"
```

---

## Phase 5: Deploy & Test

### Task 5.1: Deploy Backend to Cloud Run

**Step 1: Build and deploy**

```bash
cd backend
gcloud builds submit --tag gcr.io/sori-project/musicgram-api
gcloud run deploy musicgram-api --image gcr.io/sori-project/musicgram-api --region us-central1 --allow-unauthenticated
```

**Step 2: Verify deployment**

```bash
curl https://musicgram-api-89748215794.us-central1.run.app/api/translate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요!", "target_lang": "en"}'
```

Expected response:
```json
{
  "translated_text": "Hello!",
  "source_language": "ko",
  "target_language": "en",
  "source": "ai"
}
```

---

### Task 5.2: Test Complete Flow

**Step 1: Create test post with Korean content**

```sql
INSERT INTO posts (user_id, caption, post_type, language, is_public)
SELECT id, '새 앨범이 나왔어요! 많이 사랑해주세요 💜', 'text', 'ko', true
FROM profiles WHERE member_type = 'artist' LIMIT 1;
```

**Step 2: Verify translation button appears for English users**

1. Open app in browser (English language)
2. Navigate to feed
3. Find Korean post
4. Verify "Translate" button appears
5. Click translate
6. Verify English translation shows

**Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete virtual member auto-content with multilingual support"
git push
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 4 tasks | Database schema (translations, releases, queue) |
| 2 | 3 tasks | Backend APIs (translate, detect language, check releases) |
| 3 | 3 tasks | Frontend (TranslateButton, i18n strings, integration) |
| 4 | 2 tasks | Language sync & auto-detection |
| 5 | 2 tasks | Deploy & test |

**Total: 14 tasks**

---

Plan complete and saved to `docs/plans/2024-12-23-virtual-member-auto-content.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
