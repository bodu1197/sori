import os
import json
import logging
try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or "AIzaSyBpwRxr8X99x7yjjIkazu-OJcqF2YbsERM"

if genai:
    genai.configure(api_key=GOOGLE_API_KEY)
    # Using flash model for faster chat response
    model = genai.GenerativeModel('gemini-1.5-flash')

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
    history: list of {"role": "user"|"model", "parts": ["text"]}
    """
    if not genai:
        return "AI service unavailable."
        
    try:
        # Construct chat session
        # We need to inject system prompt. Gemini python SDK supports system_instruction in model config,
        # but here we reuse the model instance, so we prepend it to history or first message.
        
        system_prompt = persona.get("system_prompt", "")
        tone = persona.get("tone", "")
        
        # Simple approach: one-shot generation for stateless REST API usage
        # (Stateful chat object is harder to manage per request)
        
        messages = []
        messages.append({"role": "user", "parts": [f"System Instruction: {system_prompt}\nTone: {tone}\n\nUser says: {message}"]})
        
        # If history exists, we should format it. 
        # But for MVP, let's just respond to the current message with context.
        # Ideally, we should use Convert history to Gemini format.
        
        # Let's try to use the chat object if history is provided
        formatted_history = []
        if history:
             for h in history:
                 role = "user" if h.get("role") == "user" else "model"
                 formatted_history.append({"role": role, "parts": [h.get("content", "")]})

        chat = model.start_chat(history=formatted_history)
        
        # Send message with system context if it's the start, or just message
        if not history:
             response = chat.send_message(f"System: {system_prompt}\nAct as {persona.get('system_prompt', 'the artist')}.\n\nUser: {message}")
        else:
             response = chat.send_message(message)
             
        return response.text
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return "..."


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
