# VibeStation Backend API - Minimal ytmusicapi endpoints
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Thread pool for blocking ytmusicapi calls
executor = ThreadPoolExecutor(max_workers=4)

def get_country_from_request(request: Request) -> str:
    """Detect user's country from Vercel geo headers"""
    # Vercel provides x-vercel-ip-country header
    country = request.headers.get("x-vercel-ip-country")
    if country:
        return country
    # Fallback to CF-IPCountry (Cloudflare)
    country = request.headers.get("cf-ipcountry")
    if country:
        return country
    # Default fallback
    return "US"

def get_ytmusic(language="en", location=None):
    if location:
        return YTMusic(language=language, location=location)
    return YTMusic(language=language)

async def run_in_thread(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, lambda: func(*args, **kwargs))

def custom_get_mood_playlists(ytmusic, params: str):
    """Custom mood playlists parser that handles different renderer types"""
    try:
        return ytmusic.get_mood_playlists(params)
    except KeyError:
        response = ytmusic._send_request(
            "browse",
            {"browseId": "FEmusic_moods_and_genres_category", "params": params}
        )

        playlists = []

        try:
            tabs = response.get("contents", {}).get("singleColumnBrowseResultsRenderer", {}).get("tabs", [])
            if not tabs:
                return playlists

            sections = tabs[0].get("tabRenderer", {}).get("content", {}).get("sectionListRenderer", {}).get("contents", [])

            for section in sections:
                items = []

                if "gridRenderer" in section:
                    items = section["gridRenderer"].get("items", [])
                elif "musicCarouselShelfRenderer" in section:
                    items = section["musicCarouselShelfRenderer"].get("contents", [])
                elif "musicImmersiveCarouselShelfRenderer" in section:
                    items = section["musicImmersiveCarouselShelfRenderer"].get("contents", [])

                for item in items:
                    playlist = None

                    if "musicTwoRowItemRenderer" in item:
                        data = item["musicTwoRowItemRenderer"]
                        playlist = parse_playlist_item(data)
                    elif "musicResponsiveListItemRenderer" in item:
                        data = item["musicResponsiveListItemRenderer"]
                        playlist = parse_responsive_list_item(data)
                    elif "musicNavigationButtonRenderer" in item:
                        data = item["musicNavigationButtonRenderer"]
                        playlist = parse_navigation_button(data)

                    if playlist:
                        playlists.append(playlist)
        except Exception:
            pass

        return playlists

def parse_playlist_item(data):
    """Parse musicTwoRowItemRenderer"""
    try:
        title = data.get("title", {}).get("runs", [{}])[0].get("text", "")

        nav_endpoint = data.get("navigationEndpoint", {})
        browse_endpoint = nav_endpoint.get("browseEndpoint", {})
        watch_endpoint = nav_endpoint.get("watchEndpoint", {})

        playlist_id = browse_endpoint.get("browseId") or watch_endpoint.get("playlistId", "")

        thumbnails = data.get("thumbnailRenderer", {}).get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails", [])

        subtitle = ""
        subtitle_runs = data.get("subtitle", {}).get("runs", [])
        if subtitle_runs:
            subtitle = "".join([r.get("text", "") for r in subtitle_runs])

        return {
            "title": title,
            "playlistId": playlist_id,
            "thumbnails": thumbnails,
            "description": subtitle
        }
    except Exception:
        return None

def parse_responsive_list_item(data):
    """Parse musicResponsiveListItemRenderer"""
    try:
        flex_columns = data.get("flexColumns", [])
        title = ""
        if flex_columns:
            title_runs = flex_columns[0].get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [])
            if title_runs:
                title = title_runs[0].get("text", "")

        nav_endpoint = data.get("navigationEndpoint", {}) or data.get("overlay", {}).get("musicItemThumbnailOverlayRenderer", {}).get("content", {}).get("musicPlayButtonRenderer", {}).get("playNavigationEndpoint", {})
        playlist_id = nav_endpoint.get("watchEndpoint", {}).get("playlistId", "") or nav_endpoint.get("browseEndpoint", {}).get("browseId", "")

        thumbnails = data.get("thumbnail", {}).get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails", [])

        return {
            "title": title,
            "playlistId": playlist_id,
            "thumbnails": thumbnails,
            "description": ""
        }
    except Exception:
        return None

def parse_navigation_button(data):
    """Parse musicNavigationButtonRenderer (for genre cards)"""
    try:
        title = data.get("buttonText", {}).get("runs", [{}])[0].get("text", "")

        nav_endpoint = data.get("clickCommand", {})
        browse_endpoint = nav_endpoint.get("browseEndpoint", {})
        playlist_id = browse_endpoint.get("browseId", "")

        return {
            "title": title,
            "playlistId": playlist_id,
            "thumbnails": [],
            "description": ""
        }
    except Exception:
        return None

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
async def get_home(request: Request, limit: int = 5, country: str = None):
    location = country or get_country_from_request(request)
    ytmusic = get_ytmusic(location=location)
    try:
        data = await run_in_thread(ytmusic.get_home, limit)
        return {"success": True, "data": data, "country": location}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/search")
async def search(q: str, filter: str = None):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.search, q, filter)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/search/suggestions")
async def get_suggestions(q: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_search_suggestions, q)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/explore")
async def get_explore(request: Request, country: str = None):
    location = country or get_country_from_request(request)
    ytmusic = get_ytmusic(location=location)
    try:
        data = await run_in_thread(ytmusic.get_explore)
        return {"success": True, "data": data, "country": location}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@app.get("/api/charts")
async def get_charts(request: Request, country: str = None):
    location = country or get_country_from_request(request)
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_charts, location)
        return {"success": True, "data": data, "country": location}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@app.get("/api/moods")
async def get_moods(request: Request, country: str = None):
    location = country or get_country_from_request(request)
    ytmusic = get_ytmusic(location=location)
    try:
        data = await run_in_thread(ytmusic.get_mood_categories)
        return {"success": True, "data": data, "country": location}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@app.get("/api/mood-playlists")
async def get_mood_playlists(params: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(custom_get_mood_playlists, ytmusic, params)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/artist/{artist_id}")
async def get_artist(artist_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_artist, artist_id)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/artist/{artist_id}/albums")
async def get_artist_albums(artist_id: str):
    ytmusic = get_ytmusic()
    try:
        artist = await run_in_thread(ytmusic.get_artist, artist_id)
        if artist and "albums" in artist and "params" in artist["albums"]:
            data = await run_in_thread(ytmusic.get_artist_albums, artist_id, artist["albums"]["params"])
            return {"success": True, "data": data}
        return {"success": True, "data": []}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/album/{album_id}")
async def get_album(album_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_album, album_id)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/playlist/{playlist_id}")
async def get_playlist(playlist_id: str):
    ytmusic = get_ytmusic()
    try:
        if playlist_id.startswith("MPRE"):
            data = await run_in_thread(ytmusic.get_album, playlist_id)
            if data:
                data["trackCount"] = len(data.get("tracks", []))
        elif playlist_id.startswith("OLAK"):
            watch_data = await run_in_thread(ytmusic.get_watch_playlist, playlistId=playlist_id)
            if watch_data:
                tracks = watch_data.get("tracks", [])
                for track in tracks:
                    if track.get("thumbnail") and not track.get("thumbnails"):
                        track["thumbnails"] = track["thumbnail"]
                    if track.get("length") and not track.get("duration"):
                        track["duration"] = track["length"]

                data = {
                    "title": playlist_id,
                    "tracks": tracks,
                    "trackCount": len(tracks),
                    "thumbnails": tracks[0].get("thumbnails") if tracks else None
                }
                if tracks and tracks[0].get("album"):
                    data["title"] = tracks[0]["album"].get("name", "Album")
            else:
                data = None
        else:
            data = await run_in_thread(ytmusic.get_playlist, playlist_id)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/song/{video_id}")
async def get_song(video_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_song, video_id)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/watch")
async def get_watch(videoId: str = None, playlistId: str = None):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_watch_playlist, videoId=videoId, playlistId=playlistId)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/lyrics/{browse_id}")
async def get_lyrics(browse_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_lyrics, browse_id)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/related/{browse_id}")
async def get_related(browse_id: str):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_song_related, browse_id)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

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
async def get_episodes_playlist(country: str = None):
    ytmusic = get_ytmusic(location=country)
    try:
        explore_data = await run_in_thread(ytmusic.get_explore)
        episodes = explore_data.get("top_episodes", [])
        return {"success": True, "data": episodes}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}
