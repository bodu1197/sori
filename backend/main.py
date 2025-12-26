# VibeStation Backend API - Minimal ytmusicapi endpoints
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Thread pool for blocking ytmusicapi calls
executor = ThreadPoolExecutor(max_workers=4)

def get_ytmusic(language="en"):
    return YTMusic(language=language)

async def run_in_thread(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, lambda: func(*args, **kwargs))

app = FastAPI(title="VibeStation API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"service": "VibeStation API", "status": "ok"}

@app.get("/api/home")
async def get_home(limit: int = 5):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_home, limit)
    return {"success": True, "data": data}

@app.get("/api/search")
async def search(q: str, filter: str = None):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.search, q, filter)
    return {"success": True, "data": data}

@app.get("/api/search/suggestions")
async def get_suggestions(q: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_search_suggestions, q)
    return {"success": True, "data": data}

@app.get("/api/explore")
async def get_explore():
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_explore)
    return {"success": True, "data": data}

@app.get("/api/charts")
async def get_charts(country: str = "ZZ"):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_charts, country)
    return {"success": True, "data": data}

@app.get("/api/moods")
async def get_moods():
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_mood_categories)
    return {"success": True, "data": data}

@app.get("/api/mood-playlists")
async def get_mood_playlists(params: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_mood_playlists, params)
    return {"success": True, "data": data}

@app.get("/api/artist/{artist_id}")
async def get_artist(artist_id: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_artist, artist_id)
    return {"success": True, "data": data}

@app.get("/api/artist/{artist_id}/albums")
async def get_artist_albums(artist_id: str):
    ytmusic = get_ytmusic()
    artist = await run_in_thread(ytmusic.get_artist, artist_id)
    if artist and "albums" in artist and "params" in artist["albums"]:
        data = await run_in_thread(ytmusic.get_artist_albums, artist_id, artist["albums"]["params"])
        return {"success": True, "data": data}
    return {"success": True, "data": []}

@app.get("/api/album/{album_id}")
async def get_album(album_id: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_album, album_id)
    return {"success": True, "data": data}

@app.get("/api/playlist/{playlist_id}")
async def get_playlist(playlist_id: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_playlist, playlist_id)
    return {"success": True, "data": data}

@app.get("/api/song/{video_id}")
async def get_song(video_id: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_song, video_id)
    return {"success": True, "data": data}

@app.get("/api/watch")
async def get_watch(videoId: str = None, playlistId: str = None):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_watch_playlist, videoId=videoId, playlistId=playlistId)
    return {"success": True, "data": data}

@app.get("/api/lyrics/{browse_id}")
async def get_lyrics(browse_id: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_lyrics, browse_id)
    return {"success": True, "data": data}

@app.get("/api/related/{browse_id}")
async def get_related(browse_id: str):
    ytmusic = get_ytmusic()
    data = await run_in_thread(ytmusic.get_song_related, browse_id)
    return {"success": True, "data": data}

@app.get("/api/podcast/{playlist_id}")
async def get_podcast(playlist_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_podcast, playlist_id)
        return {"success": True, "data": data}
    except Exception:
        return {"success": True, "data": None}

@app.get("/api/episode/{video_id}")
async def get_episode(video_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_episode, video_id)
        return {"success": True, "data": data}
    except Exception:
        return {"success": True, "data": None}

@app.get("/api/channel/{channel_id}")
async def get_channel(channel_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_channel, channel_id)
        return {"success": True, "data": data}
    except Exception:
        return {"success": True, "data": None}

@app.get("/api/episodes-playlist")
async def get_episodes_playlist():
    return {"success": True, "data": []}
