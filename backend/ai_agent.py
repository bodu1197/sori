import os
import json
import logging
import base64
import io
try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from google.cloud import aiplatform
    from vertexai.preview.vision_models import ImageGenerationModel
    vertex_available = True
except ImportError:
    vertex_available = False

logger = logging.getLogger(__name__)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or "AIzaSyBpwRxr8X99x7yjjIkazu-OJcqF2YbsERM"
GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID") or "musicgram-api"
GOOGLE_LOCATION = os.getenv("GOOGLE_LOCATION") or "us-central1"

if genai:
    genai.configure(api_key=GOOGLE_API_KEY)
    # Using gemini-2.0-flash-exp for faster chat response
    model = genai.GenerativeModel('gemini-2.0-flash-exp')

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

def chat_with_artist(persona: dict, history: list, message: str) -> str:
    """
    Chat with the artist persona.
    history: list of {"role": "user"|"model", "content": "text"}
    """
    if not genai:
        return "AI service unavailable."

    try:
        system_prompt = persona.get("system_prompt", "You are a friendly music artist chatting with a fan.")
        tone = persona.get("tone", "friendly, warm")

        # Build context from recent history (last 5 messages)
        context = ""
        if history and len(history) > 0:
            recent = history[-5:]
            context = "\n".join([f"{'Fan' if h.get('role') == 'user' else 'You'}: {h.get('content', '')}" for h in recent])
            context = f"\nRecent conversation:\n{context}\n"

        # Simple one-shot prompt with context
        prompt = f"""
{system_prompt}

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


def generate_artist_post(artist_name: str, persona: dict, recent_activities: list = None) -> dict | None:
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

    tone = persona.get("tone", "friendly, casual, warm") if persona else "friendly, casual, warm"
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

    tone = persona.get("tone", "friendly, warm") if persona else "friendly, warm"
    greeting = persona.get("greeting", f"Hey! Thanks for the support!") if persona else "Hey! Thanks for the support!"

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
    tone = persona.get("tone", "friendly, warm") if persona else "friendly, warm"
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
