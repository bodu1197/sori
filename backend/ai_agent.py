import os
import json
import logging
import base64
import io
import httpx
from datetime import datetime, timedelta
try:
    import google.generativeai as genai
    from google.generativeai import types
except ImportError:
    genai = None
    types = None

try:
    from google.cloud import aiplatform
    from vertexai.preview.vision_models import ImageGenerationModel
    vertex_available = True
except ImportError:
    vertex_available = False

logger = logging.getLogger(__name__)

# Default tone constants to avoid duplication
DEFAULT_TONE = "friendly, warm"
DEFAULT_TONE_CASUAL = "friendly, casual, warm"

# Configure Gemini
# API Key must be set via environment variable (never hardcode!)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY not set - AI features will be disabled")
GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID") or "musicgram-api"
GOOGLE_LOCATION = os.getenv("GOOGLE_LOCATION") or "us-central1"

if genai and GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    # Use Gemini 2.5 Flash (latest model)
    try:
        model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
        logger.info("Gemini 2.5 Flash model initialized")
    except Exception as e:
        try:
            # Fallback to Gemini 2.0 Flash
            model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("Gemini 2.0 Flash model initialized (fallback)")
        except Exception as e2:
            logger.error(f"Failed to initialize Gemini model: {e2}")
            model = None
else:
    model = None

# Initialize Vertex AI for Imagen
if vertex_available:
    try:
        aiplatform.init(project=GOOGLE_PROJECT_ID, location=GOOGLE_LOCATION)
        imagen_model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001")
    except Exception as e:
        logger.warning(f"Vertex AI initialization failed: {e}")
        imagen_model = None
else:
    imagen_model = None

def search_artist_news(artist_name: str, days: int = 2) -> list:
    """
    Search for real-time news using Google Search Grounding via Gemini.
    """
    if not genai:
        return []

    try:
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Prompt designed to trigger Google Search tool
        prompt = f"""
Find the latest news about the musician "{artist_name}" from the last {days} days (Today is {today}).
Look for announcements about: concerts, tours, new albums, song releases, or major events.

Return a JSON array of news items:
[
  {{
    "title": "Headline",
    "snippet": "Short summary including date",
    "source": "Source name",
    "date": "YYYY-MM-DD"
  }}
]
If nothing relevant is found, return empty array [].
"""
        
        # Generate content - the model should use the google_search tool automatically
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean markdown
        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)

        try:
            news = json.loads(text)
            return news if isinstance(news, list) else []
        except json.JSONDecodeError:
             # Sometimes it might return text if search failed or no JSON structure
            logger.warning(f"News search JSON decode failed: {text[:100]}")
            return []

    except Exception as e:
        logger.error(f"News search error for {artist_name}: {e}")
        return []


def gather_artist_context(artist_name: str) -> dict:
    """
    AI를 사용하여 아티스트의 현재 상황을 종합적으로 파악
    실시간 뉴스 검색 + AI 기본 지식 결합

    포스팅 전 반드시 호출하여:
    1. 고인/은퇴 여부 확인 → 포스팅 스킵
    2. 실시간 뉴스 검색 (1일 이내) → 최신 정보 반영
    3. 신곡/투어 정보 → 실제 정보 기반 포스팅

    Returns:
        {
            "status": "active|deceased|hiatus|retired|disbanded",
            "can_post": true/false,
            "skip_reason": "reason if cannot post",
            "recent_news": [{"title": "...", "snippet": "...", "type": "..."}],
            "new_release": {"title": "...", "type": "album/single"} or null,
            "tour_info": "tour information" or null,
            "news_summary": "recent news in 1 sentence",
            "suggested_topic": "new_release|tour|fan_thanks|comeback|hiatus_message|news",
            "post_context": "specific context for generating the post"
        }
    """
    if not genai or not artist_name:
        return {
            "status": "active",
            "can_post": True,
            "suggested_topic": "fan_thanks",
            "post_context": "General fan appreciation",
            "recent_news": []
        }

    try:
        # STEP 1: Search for real-time news (last 1 day)
        logger.info(f"Searching real-time news for {artist_name}...")
        recent_news = search_artist_news(artist_name, days=1)

        # Build news context for AI
        news_context = ""
        if recent_news:
            news_items = [f"- {n.get('title', '')}: {n.get('snippet', '')}" for n in recent_news[:5]]
            news_context = f"""
RECENT NEWS FROM TODAY (VERIFIED):
{chr(10).join(news_items)}

Use this news to inform your response. The post should reference this real news."""
        else:
            news_context = "No recent news found in the last 24 hours."

        # STEP 2: Get AI analysis with news context
        today = datetime.now().strftime("%Y-%m-%d")
        prompt = f"""You are a music industry expert. Today is {today}.
Analyze the artist "{artist_name}" for social media posting.

{news_context}

CRITICAL RULES:
1. If the artist has passed away (deceased), can_post MUST be false
2. If recent news exists, suggested_topic should be "news" and use that news
3. If no recent news, use AI knowledge for context (new_release, tour, etc.)
4. post_context MUST contain SPECIFIC, FACTUAL information only

Return ONLY valid JSON:
{{
  "status": "active" or "deceased" or "hiatus" or "retired" or "disbanded",
  "can_post": true or false,
  "skip_reason": "reason if can_post is false, otherwise null",
  "recent_activity": "what they are currently doing (1 sentence, FACTUAL)",
  "new_release": {{"title": "song/album name", "type": "single or album", "year": "2024"}} or null,
  "tour_info": "current tour info" or null,
  "news_summary": "most important recent news (1 sentence)",
  "suggested_topic": "news" or "new_release" or "tour" or "fan_thanks" or "comeback",
  "post_context": "SPECIFIC facts to use in the post (names, dates, titles - NO fiction)"
}}

Return ONLY the JSON, no other text."""

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(temperature=0.1)
        )
        text = response.text.strip()

        # Clean markdown code blocks
        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)

        result = json.loads(text)
        result["recent_news"] = recent_news  # Include raw news data
        logger.info(f"Artist context: {artist_name} -> status={result.get('status')}, can_post={result.get('can_post')}, topic={result.get('suggested_topic')}, news_count={len(recent_news)}")
        return result

    except Exception as e:
        logger.error(f"Gather artist context error: {e}")
        return {
            "status": "active",
            "can_post": True,
            "suggested_topic": "fan_thanks",
            "post_context": "General fan appreciation",
            "recent_news": []
        }


def _build_topic_instruction(context: dict) -> tuple[str, str]:
    """
    Build topic-specific instruction for post generation.
    Returns (topic_instruction, post_type)
    """
    suggested_topic = context.get("suggested_topic", "fan_thanks")
    post_context = context.get("post_context", "General appreciation for fans")
    new_release = context.get("new_release")
    tour_info = context.get("tour_info")
    recent_activity = context.get("recent_activity", "")
    recent_news = context.get("recent_news", [])
    news_summary = context.get("news_summary", "")

    if suggested_topic == "news" and (recent_news or news_summary):
        news_text = recent_news[0].get("snippet", news_summary) if recent_news else news_summary
        news_title = recent_news[0].get("title", "") if recent_news else ""
        return (f"""Share this REAL news with your fans:
News: {news_title} - {news_text}

Write a post that:
- References this specific news naturally
- Expresses your genuine reaction/excitement
- Thanks fans for their support
- Sounds authentic to your voice

IMPORTANT: Use the ACTUAL news content, don't make things up.""", "news")

    if suggested_topic == "new_release" and new_release:
        return (f"""Talk about your recent release "{new_release.get('title', '')}" ({new_release.get('type', 'music')}).
Thank fans for their support and encourage them to listen.""", "music")

    if suggested_topic == "tour" and tour_info:
        return (f"""Share excitement about your tour/concert: {tour_info}.
Thank fans who came or encourage them to come.""", "tour")

    if suggested_topic == "hiatus_message":
        return (f"""You are currently on hiatus. {recent_activity}
Send a warm message to fans saying you miss them and will return soon.""", "hiatus")

    if suggested_topic == "comeback":
        return ("""Hint at or announce your upcoming comeback.
Build excitement among fans.""", "comeback")

    if suggested_topic == "studio_work":
        return ("""Share that you're working on new music in the studio.
Build anticipation without revealing too much.""", "music")

    if suggested_topic == "music_recommendation":
        selected_track = context.get("selected_track", {})
        track_title = selected_track.get("title", "")
        return (f"""Recommend your song "{track_title}" to your fans!

Write a post that:
- Shares why this song is special to you
- Encourages fans to listen
- Shows genuine love for this track
- Mentions a memory or story about the song (can be creative but authentic)

Keep it personal and heartfelt. The video will be embedded with the post.""", "music")

    # Default: fan_thanks
    return (f"""Express genuine gratitude to your fans.
Context: {post_context}""", "fan")


def _clean_markdown_json(text: str) -> str:
    """Remove markdown code blocks from JSON response."""
    if text.startswith("```"):
        lines = text.split('\n')
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines)
    return text


def generate_contextual_post(
    artist_name: str,
    persona: dict,
    language: str,
    context: dict
) -> dict | None:
    """
    아티스트 컨텍스트를 기반으로 상황에 맞는 포스트 생성

    Args:
        artist_name: 아티스트 이름
        persona: AI 페르소나
        language: 포스팅 언어 (ko, en, ja, etc.)
        context: gather_artist_context()에서 반환된 컨텍스트
    """
    if not genai:
        return None

    if not context.get("can_post", True):
        logger.info(f"Skipping post for {artist_name}: {context.get('skip_reason')}")
        return None

    lang_name = LANG_NAMES.get(language, 'English')
    tone = persona.get("tone", DEFAULT_TONE) if persona else DEFAULT_TONE
    fandom = persona.get("fandom_name", "fans") if persona else "fans"

    topic_instruction, post_type = _build_topic_instruction(context)

    prompt = f"""You are {artist_name}, a music artist posting on social media.

CRITICAL RULES:
1. Write ONLY in {lang_name}
2. Keep it SHORT (1-2 sentences max)
3. Be authentic to your personality
4. Include 1-2 relevant emojis
5. Do NOT make up fake activities or events

Your personality: {tone}
Your fan base: {fandom}

TASK: {topic_instruction}

Output JSON only:
{{
  "caption": "Your post in {lang_name}",
  "type": "{post_type}",
  "hashtags": ["tag1", "tag2"]
}}

Return ONLY valid JSON."""

    try:
        response = model.generate_content(prompt)
        text = _clean_markdown_json(response.text.strip())
        result = json.loads(text)
        result["language"] = language
        result["context_used"] = context.get("suggested_topic", "fan_thanks")
        return result

    except Exception as e:
        logger.error(f"Generate contextual post error: {e}")
        return None


def check_artist_status(artist_name: str) -> dict:
    """
    AI를 사용하여 아티스트의 상태 확인 (고인 여부, 활동 상태 등)

    Returns:
        {
            "status": "active" | "deceased" | "retired" | "disbanded" | "hiatus",
            "confidence": "high" | "medium" | "low",
            "reason": "설명"
        }
    """
    if not genai or not artist_name:
        return {"status": "active", "confidence": "low", "reason": "AI unavailable"}

    try:
        prompt = f"""Analyze the music artist "{artist_name}" and determine their current status.

Answer in this exact JSON format only:
{{
  "status": "active" or "deceased" or "retired" or "disbanded" or "hiatus",
  "confidence": "high" or "medium" or "low",
  "reason": "brief explanation in English"
}}

Status definitions:
- active: Currently making music or performing
- deceased: The artist has passed away
- retired: Officially retired from music
- disbanded: Group has officially disbanded
- hiatus: Temporarily inactive

If you're unsure, use "active" with "low" confidence.
Return ONLY valid JSON."""

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean markdown code blocks
        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)

        result = json.loads(text)
        logger.info(f"Artist status check: {artist_name} -> {result.get('status')}")
        return result

    except Exception as e:
        logger.error(f"Artist status check error: {e}")
        return {"status": "active", "confidence": "low", "reason": f"Error: {str(e)}"}


def generate_artist_persona(artist_name: str, description: str, songs: list) -> dict | None:
    """
    Generate AI persona for an artist based on their description and songs.
    """
    if not genai:
        logger.error("google-generativeai library not installed")
        return None

    song_titles = ", ".join([s.get('title', '') for s in songs[:15]])
    
    prompt = f"""
    You are an expert character designer. Create a roleplay profile for the music artist "{artist_name}".
    
    Context:
    - Description: {description[:1000]}
    - Top Songs: {song_titles}
    
    Task:
    Analyze their music style, lyrics, and public image to create a Persona JSON.
    The AI will use this to chat with fans.
    
    Output JSON Format:
    {{
      "mbti": "Estimated MBTI type",
      "emoji": "Signature emoji for this artist",
      "tone": "3 adjectives describing their speaking style",
      "greeting": "A short, authentic welcome message to a fan (max 1 sentence)",
      "system_prompt": "You are {artist_name}. You are [detailed personality]. You speak in [language/style]. You care about [topics]. Never break character.",
      "fandom_name": "Name of their fan base"
    }}
    
    Return ONLY valid JSON.
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean markdown code blocks
        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)
            
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating persona: {e}")
        return None

def chat_with_artist(persona: dict, history: list, message: str, artist_context: dict = None) -> str:
    """
    Chat with the artist persona.
    history: list of {"role": "user"|"model", "content": "text"}
    artist_context: optional dict with factual data (top_songs, albums, news)
    """
    if not genai or not model:
        logger.error("AI service unavailable - genai or model not initialized")
        return "AI service unavailable."

    try:
        system_prompt = persona.get("system_prompt", "You are a friendly music artist chatting with a fan.")
        tone = persona.get("tone", DEFAULT_TONE)

        # Build context from recent history (last 5 messages)
        context = ""
        if history and len(history) > 0:
            recent = history[-5:]
            context = "\n".join([f"{'Fan' if h.get('role') == 'user' else 'You'}: {h.get('content', '')}" for h in recent])
            context = f"\nRecent conversation:\n{context}\n"

        # Build Factual Data Context
        factual_details = ""
        if artist_context:
            songs = artist_context.get("top_songs", [])
            albums = artist_context.get("albums", [])
            news = artist_context.get("news", [])
            
            song_list = ", ".join([s.get("title", "") for s in songs[:15]])
            album_list = ", ".join([a.get("title", "") for a in albums[:10]])
            
            factual_details = f"""
[REAL FACTUAL DATA - USE THIS FOR ANSWERS]
My Top Songs: {song_list}
My Albums: {album_list}
"""
            if news:
                news_items = [f"- {n.get('title')}: {n.get('snippet')}" for n in news[:3]]
                factual_details += "\nRecent News:\n" + "\n".join(news_items) + "\n"

        # Simple one-shot prompt with context
        prompt = f"""
{system_prompt}

[INSTRUCTION]
1. If asked about my songs, albums, or news, use the [REAL FACTUAL DATA] below.
2. Do NOT be vague (e.g., avoid "I have so many songs"). Mention specific song titles.
3. If asked about concerts/tours:
   - If you have news about it in [REAL FACTUAL DATA], share it.
   - If not, say "Please check my official page for tour dates!" (Do NOT make up fake dates).

{factual_details}

Your tone: {tone}
{context}
The fan says: "{message}"

Respond naturally as this artist (1-2 sentences, be warm and engaging). Include an emoji if appropriate.
"""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ""


def generate_artist_post(artist_name: str, persona: dict) -> dict | None:
    """
    Generate a social media post for an artist using AI.
    Returns: {"caption": "...", "type": "update|music|thoughts|fan", "hashtags": [...]}
    """
    if not genai:
        logger.error("google-generativeai library not installed")
        return None

    # Pick a random post type to keep variety
    import random
    post_types = [
        "music update (new song, album, practice session)",
        "personal thoughts or reflection",
        "fan appreciation message",
        "behind-the-scenes moment",
        "daily life update",
        "inspiring quote or wisdom"
    ]
    chosen_type = random.choice(post_types)

    tone = persona.get("tone", DEFAULT_TONE_CASUAL) if persona else DEFAULT_TONE_CASUAL
    fandom_name = persona.get("fandom_name", "fans") if persona else "fans"

    prompt = f"""
    You are {artist_name}, a music artist posting on social media.

    Your personality/tone: {tone}
    Your fan base is called: {fandom_name}
    Post type to write: {chosen_type}

    Write a SHORT, authentic social media post (1-3 sentences max).
    Make it feel personal and genuine, like a real celebrity would post.
    Include 1-2 relevant emojis.
    Do NOT use hashtags in the caption itself.

    Output JSON only:
    {{
      "caption": "The post text here",
      "type": "{chosen_type.split('(')[0].strip()}",
      "hashtags": ["tag1", "tag2", "tag3"]
    }}

    Return ONLY valid JSON.
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean markdown code blocks
        if text.startswith("```"):
            lines = text.split('\n')
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)

        return json.loads(text)
    except Exception as e:
        logger.error(f"Error generating post: {e}")
        return None


def generate_artist_comment(artist_name: str, persona: dict, post_caption: str) -> str | None:
    """
    Generate a comment from an artist on a user's post.
    """
    if not genai:
        return None

    tone = persona.get("tone", "friendly, supportive") if persona else "friendly, supportive"

    prompt = f"""
    You are {artist_name}, a music artist commenting on a fan's post.

    Your personality/tone: {tone}
    The fan's post says: "{post_caption[:200]}"

    Write a SHORT, genuine comment (1 sentence max).
    Be supportive and make the fan feel special.
    Include 1 emoji if appropriate.

    Return ONLY the comment text, nothing else.
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error generating comment: {e}")
        return None


def generate_artist_dm(artist_name: str, persona: dict, context: str = "new follower") -> str | None:
    """
    Generate a DM from an artist to a user.
    context: "new follower", "liked post", "birthday", etc.
    """
    if not genai:
        return None

    tone = persona.get("tone", DEFAULT_TONE) if persona else DEFAULT_TONE
    greeting = persona.get("greeting", "Hey! Thanks for the support!") if persona else "Hey! Thanks for the support!"

    prompt = f"""
    You are {artist_name}, a music artist sending a DM to a fan.

    Your personality/tone: {tone}
    Context: {context}
    Your typical greeting style: {greeting}

    Write a SHORT, personal direct message (2 sentences max).
    Make it feel genuine and exclusive.
    Include 1-2 emojis.

    Return ONLY the message text, nothing else.
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error generating DM: {e}")
        return None


# =============================================================================
# Multilingual Support Functions
# =============================================================================

# Language names mapping for better AI understanding
LANG_NAMES = {
    'en': 'English', 'ko': 'Korean', 'ja': 'Japanese', 'zh': 'Chinese',
    'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
    'id': 'Indonesian', 'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian',
    'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai', 'nl': 'Dutch',
    'pl': 'Polish', 'it': 'Italian', 'sw': 'Swahili', 'yo': 'Yoruba',
    'zu': 'Zulu', 'am': 'Amharic', 'ha': 'Hausa', 'ig': 'Igbo'
}

VALID_LANG_CODES = set(LANG_NAMES.keys())


def detect_language(text: str) -> str:
    """
    Detect the language of given text using Gemini.
    Returns ISO 639-1 code (en, ko, ja, zh, es, etc.)
    """
    if not genai or not text:
        return "en"

    try:
        prompt = f"""Detect the language of this text and return ONLY the ISO 639-1 code.
Examples: en, ko, ja, zh, es, fr, de, pt, id, ar, hi, ru, tr, sw, yo

Text: "{text[:500]}"

Return ONLY the 2-letter code, nothing else."""

        response = model.generate_content(prompt)
        code = response.text.strip().lower()[:2]
        return code if code in VALID_LANG_CODES else "en"
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

    source_name = LANG_NAMES.get(source_lang, source_lang)
    target_name = LANG_NAMES.get(target_lang, target_lang)

    try:
        prompt = f"""Translate the following text from {source_name} to {target_name}.
Keep the tone, style, and any emojis intact.
Return ONLY the translated text, nothing else.

Original text:
{text}"""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return None


def generate_artist_post_factbased(
    artist_name: str,
    persona: dict,
    language: str,
    real_data: dict
) -> dict | None:
    """
    Generate a social media post based on REAL data only.
    No fictional content like "had a smoothie" or fake daily life updates.

    Args:
        artist_name: Name of the artist
        persona: AI persona dict
        language: ISO 639-1 code for the post language
        real_data: Dict containing real information:
            - latest_album: {title, thumbnail, year}
            - popular_tracks: [{title, views}]
            - fan_count: int (optional)
            - post_type: "new_release" | "fan_thanks" | "music_promotion"
    """
    if not genai:
        return None

    lang_name = LANG_NAMES.get(language, 'English')
    tone = persona.get("tone", DEFAULT_TONE) if persona else DEFAULT_TONE
    fandom = persona.get("fandom_name", "fans") if persona else "fans"

    post_type = real_data.get("post_type", "music_promotion")
    latest_album = real_data.get("latest_album")
    popular_tracks = real_data.get("popular_tracks", [])

    # Only generate content about REAL things
    if post_type == "new_release" and latest_album:
        album_title = latest_album.get("title", "")
        type_instruction = f"""Express excitement about your album "{album_title}".
Thank fans for their support. Encourage them to listen."""
        content_type = "music"

    elif post_type == "music_promotion" and popular_tracks:
        track_names = ", ".join([t.get("title", "") for t in popular_tracks[:3] if t.get("title")])
        type_instruction = f"""Thank fans for streaming your music including: {track_names}.
Express genuine gratitude. Keep it short and heartfelt."""
        content_type = "fan"

    else:
        # Default: Simple fan appreciation (no fictional content)
        type_instruction = """Express genuine gratitude to your fans for their continued support.
Keep it simple, warm, and authentic. No specific events or activities."""
        content_type = "fan"

    prompt = f"""You are {artist_name}, a music artist posting on social media.

CRITICAL RULES:
1. Write ONLY in {lang_name} language
2. Do NOT invent fictional activities (no "had coffee", "at the gym", "eating food", etc.)
3. ONLY talk about: music, gratitude to fans, or working on music
4. Keep it short (1-2 sentences max)

Your personality/tone: {tone}
Your fan base: {fandom}

Task: {type_instruction}

Output JSON only:
{{
  "caption": "Post text in {lang_name}",
  "type": "{content_type}",
  "hashtags": ["tag1", "tag2"]
}}

Return ONLY valid JSON."""

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
        logger.error(f"Error generating fact-based post: {e}")
        return None


# Legacy function for backward compatibility
def generate_artist_post_multilingual(
    artist_name: str,
    persona: dict,
    language: str,
    post_type: str = None,
    context: dict = None
) -> dict | None:
    """
    DEPRECATED: Use generate_artist_post_factbased instead.
    This function now redirects to the fact-based version.
    """
    # Convert to new format
    real_data = {"post_type": "fan_thanks"}

    if post_type == "new_album" and context:
        real_data = {
            "post_type": "new_release",
            "latest_album": {"title": context.get("album_name", "")}
        }
    elif post_type == "new_single" and context:
        real_data = {
            "post_type": "music_promotion",
            "popular_tracks": [{"title": context.get("single_name", "")}]
        }

    return generate_artist_post_factbased(artist_name, persona, language, real_data)


# =============================================================================
# Image Generation (Imagen 3)
# =============================================================================

# Post type to image prompt mapping
POST_TYPE_IMAGE_PROMPTS = {
    "music": "Professional music studio with modern equipment, warm lighting, artistic atmosphere, high quality photography",
    "music update": "Recording studio session, microphone, headphones, artistic lighting, professional photography",
    "personal thoughts": "Peaceful sunset scenery, contemplative mood, aesthetic photography, soft colors",
    "thoughts": "Serene landscape with soft lighting, reflective mood, artistic composition",
    "fan appreciation": "Concert stage with colorful lights, crowd silhouettes, hearts, celebratory atmosphere",
    "fan": "Concert venue with fans, warm atmosphere, celebration, community feeling",
    "behind-the-scenes": "Backstage area with equipment, candid moment, professional setting, documentary style",
    "behind": "Behind the scenes of photoshoot, cameras, lighting setup, professional environment",
    "daily life": "Aesthetic coffee shop interior, modern lifestyle, warm ambiance, Instagram worthy",
    "daily": "Urban lifestyle scene, modern cafe, aesthetic interior, natural lighting",
    "inspiring": "Majestic mountain sunrise, motivational scenery, dramatic lighting, epic landscape",
    "quote": "Sunrise over mountains, inspirational landscape, golden hour, breathtaking view",
    "update": "Modern creative workspace, artistic setup, professional environment, clean aesthetic",
    "announcement": "Celebration confetti, exciting news reveal, vibrant colors, dynamic composition"
}


def generate_post_image(post_type: str, caption: str, artist_name: str = None) -> bytes | None:
    """
    Generate an image for a post using Google Imagen 3.

    Args:
        post_type: Type of post (music, thoughts, fan, etc.)
        caption: The post caption for context
        artist_name: Optional artist name for personalization

    Returns:
        Image bytes or None if generation fails
    """
    if not imagen_model:
        logger.warning("Imagen model not available")
        return None

    # Mark unused parameters (kept for API compatibility)
    del caption, artist_name  # Currently unused, may be used for personalization later

    try:
        # Get base prompt from post type
        base_prompt = POST_TYPE_IMAGE_PROMPTS.get(
            post_type.lower(),
            POST_TYPE_IMAGE_PROMPTS.get("update")
        )

        # Create detailed prompt
        prompt = f"{base_prompt}. Style: modern, aesthetic, social media worthy, 512x512, high quality"

        # Generate image
        response = imagen_model.generate_images(
            prompt=prompt,
            number_of_images=1,
            aspect_ratio="1:1",
            safety_filter_level="block_some",
            person_generation="dont_allow"  # Avoid generating people for copyright safety
        )

        if response.images:
            # Return image bytes
            return response.images[0]._image_bytes

        return None

    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return None


def generate_post_image_prompt(post_type: str, caption: str) -> str:
    """
    Generate an image prompt based on post type and caption.
    Uses Gemini to create a contextual prompt.
    """
    if not genai:
        return POST_TYPE_IMAGE_PROMPTS.get(post_type.lower(), POST_TYPE_IMAGE_PROMPTS["update"])

    try:
        prompt = f"""Create a short image generation prompt (1-2 sentences) for this social media post.

Post type: {post_type}
Caption: {caption}

Requirements:
- Describe a scene/setting that matches the mood
- Do NOT include any people or faces
- Focus on atmosphere, lighting, objects
- Make it aesthetic and Instagram-worthy

Return ONLY the image prompt, nothing else."""

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        logger.error(f"Prompt generation error: {e}")
        return POST_TYPE_IMAGE_PROMPTS.get(post_type.lower(), POST_TYPE_IMAGE_PROMPTS["update"])
