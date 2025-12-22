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
