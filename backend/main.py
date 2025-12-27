# VibeStation Backend API - Minimal ytmusicapi endpoints
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Thread pool for blocking ytmusicapi calls
executor = ThreadPoolExecutor(max_workers=4)

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
        # First try the standard method
        return ytmusic.get_mood_playlists(params)
    except KeyError:
        # If standard method fails, try manual parsing
        response = ytmusic._send_request(
            "browse",
            {"browseId": "FEmusic_moods_and_genres_category", "params": params}
        )

        playlists = []

        # Navigate to section list
        try:
            tabs = response.get("contents", {}).get("singleColumnBrowseResultsRenderer", {}).get("tabs", [])
            if not tabs:
                return playlists

            sections = tabs[0].get("tabRenderer", {}).get("content", {}).get("sectionListRenderer", {}).get("contents", [])

            for section in sections:
                items = []

                # Handle different section types
                if "gridRenderer" in section:
                    items = section["gridRenderer"].get("items", [])
                elif "musicCarouselShelfRenderer" in section:
                    items = section["musicCarouselShelfRenderer"].get("contents", [])
                elif "musicImmersiveCarouselShelfRenderer" in section:
                    items = section["musicImmersiveCarouselShelfRenderer"].get("contents", [])

                for item in items:
                    playlist = None

                    # Try different renderer types
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

        # Get playlist ID from navigation
        nav_endpoint = data.get("navigationEndpoint", {})
        browse_endpoint = nav_endpoint.get("browseEndpoint", {})
        watch_endpoint = nav_endpoint.get("watchEndpoint", {})

        playlist_id = browse_endpoint.get("browseId") or watch_endpoint.get("playlistId", "")

        # Get thumbnails
        thumbnails = data.get("thumbnailRenderer", {}).get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails", [])

        # Get subtitle/description
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
        # Get title from flexColumns
        flex_columns = data.get("flexColumns", [])
        title = ""
        if flex_columns:
            title_runs = flex_columns[0].get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [])
            if title_runs:
                title = title_runs[0].get("text", "")

        # Get playlist ID
        nav_endpoint = data.get("navigationEndpoint", {}) or data.get("overlay", {}).get("musicItemThumbnailOverlayRenderer", {}).get("content", {}).get("musicPlayButtonRenderer", {}).get("playNavigationEndpoint", {})
        playlist_id = nav_endpoint.get("watchEndpoint", {}).get("playlistId", "") or nav_endpoint.get("browseEndpoint", {}).get("browseId", "")

        # Get thumbnails
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

        # Navigation buttons often have solid color backgrounds instead of thumbnails
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
async def get_home(limit: int = 5, country: str = None):
    ytmusic = get_ytmusic(location=country)
    try:
        data = await run_in_thread(ytmusic.get_home, limit)
        return {"success": True, "data": data}
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
async def get_explore(country: str = None):
    ytmusic = get_ytmusic(location=country)
    try:
        data = await run_in_thread(ytmusic.get_explore)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@app.get("/api/charts")
async def get_charts(country: str = "ZZ"):
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_charts, country)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@app.get("/api/moods")
async def get_moods():
    ytmusic = get_ytmusic()
    try:
        data = await run_in_thread(ytmusic.get_mood_categories)
        return {"success": True, "data": data}
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
        # MPRE IDs are album browseIds
        if playlist_id.startswith("MPRE"):
            data = await run_in_thread(ytmusic.get_album, playlist_id)
            if data:
                data["trackCount"] = len(data.get("tracks", []))
        # OLAK IDs need special handling - try get_watch_playlist
        elif playlist_id.startswith("OLAK"):
            # Use get_watch_playlist to get tracks from album playlist
            watch_data = await run_in_thread(ytmusic.get_watch_playlist, playlistId=playlist_id)
            if watch_data:
                tracks = watch_data.get("tracks", [])
                # Convert fields for each track
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
                # Try to get title from first track's album
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

# yt-dlp endpoints for Shorts and Videos
import yt_dlp

def get_ydl_opts(extract_flat=True):
    """Get yt-dlp options for metadata extraction only (no download)"""
    return {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': extract_flat,
        'skip_download': True,
        'ignoreerrors': True,
    }

def extract_short_info(entry):
    """Extract relevant info from a short/video entry"""
    if not entry:
        return None
    return {
        'id': entry.get('id'),
        'title': entry.get('title'),
        'thumbnail': entry.get('thumbnail') or (entry.get('thumbnails', [{}])[-1].get('url') if entry.get('thumbnails') else None),
        'duration': entry.get('duration'),
        'view_count': entry.get('view_count'),
        'channel': entry.get('channel') or entry.get('uploader'),
        'channel_id': entry.get('channel_id') or entry.get('uploader_id'),
        'url': f"https://www.youtube.com/shorts/{entry.get('id')}" if entry.get('id') else None,
    }

def extract_video_info(entry):
    """Extract relevant info from a video entry"""
    if not entry:
        return None
    return {
        'id': entry.get('id'),
        'title': entry.get('title'),
        'thumbnail': entry.get('thumbnail') or (entry.get('thumbnails', [{}])[-1].get('url') if entry.get('thumbnails') else None),
        'duration': entry.get('duration'),
        'view_count': entry.get('view_count'),
        'like_count': entry.get('like_count'),
        'channel': entry.get('channel') or entry.get('uploader'),
        'channel_id': entry.get('channel_id') or entry.get('uploader_id'),
        'description': entry.get('description', '')[:500] if entry.get('description') else None,
        'upload_date': entry.get('upload_date'),
        'url': f"https://www.youtube.com/watch?v={entry.get('id')}" if entry.get('id') else None,
    }

@app.get("/api/shorts/trending")
async def get_trending_shorts(country: str = "US", limit: int = 20):
    """Get trending YouTube Shorts"""
    try:
        # YouTube Shorts trending URL
        url = f"https://www.youtube.com/results?search_query=shorts&sp=EgIQAQ%253D%253D"

        opts = get_ydl_opts(extract_flat=True)
        opts['geo_bypass_country'] = country

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])[:limit]
                return [extract_short_info(e) for e in entries if e and e.get('duration', 61) <= 60]

        shorts = await run_in_thread(fetch)
        return {"success": True, "data": [s for s in shorts if s]}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/shorts/search")
async def search_shorts(q: str, limit: int = 20):
    """Search YouTube Shorts"""
    try:
        # Add shorts filter to search
        url = f"ytsearch{limit}:{q} #shorts"

        opts = get_ydl_opts(extract_flat=True)

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])
                # Filter to only short videos (<=60 seconds)
                return [extract_short_info(e) for e in entries if e and e.get('duration', 61) <= 60]

        shorts = await run_in_thread(fetch)
        return {"success": True, "data": [s for s in shorts if s]}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/shorts/{video_id}")
async def get_short_details(video_id: str):
    """Get detailed info for a specific short"""
    try:
        url = f"https://www.youtube.com/shorts/{video_id}"

        opts = get_ydl_opts(extract_flat=False)

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                return extract_video_info(result)

        info = await run_in_thread(fetch)
        return {"success": True, "data": info}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/videos/trending")
async def get_trending_videos(country: str = "US", limit: int = 20):
    """Get trending YouTube videos"""
    try:
        # YouTube trending URL
        url = f"https://www.youtube.com/feed/trending"

        opts = get_ydl_opts(extract_flat=True)
        opts['geo_bypass_country'] = country

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])[:limit]
                return [extract_video_info(e) for e in entries if e]

        videos = await run_in_thread(fetch)
        return {"success": True, "data": [v for v in videos if v]}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/videos/search")
async def search_videos(q: str, limit: int = 20):
    """Search YouTube videos"""
    try:
        url = f"ytsearch{limit}:{q}"

        opts = get_ydl_opts(extract_flat=True)

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])
                return [extract_video_info(e) for e in entries if e]

        videos = await run_in_thread(fetch)
        return {"success": True, "data": [v for v in videos if v]}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/video/{video_id}")
async def get_video_details(video_id: str):
    """Get detailed info for a specific video"""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"

        opts = get_ydl_opts(extract_flat=False)

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                info = extract_video_info(result)
                # Add extra details
                if result:
                    info['formats'] = len(result.get('formats', []))
                    info['categories'] = result.get('categories', [])
                    info['tags'] = result.get('tags', [])[:10]
                return info

        info = await run_in_thread(fetch)
        return {"success": True, "data": info}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/channel/{channel_id}/shorts")
async def get_channel_shorts(channel_id: str, limit: int = 20):
    """Get shorts from a specific channel"""
    try:
        url = f"https://www.youtube.com/channel/{channel_id}/shorts"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])[:limit]
                return [extract_short_info(e) for e in entries if e]

        shorts = await run_in_thread(fetch)
        return {"success": True, "data": [s for s in shorts if s]}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/channel/{channel_id}/videos")
async def get_channel_videos(channel_id: str, limit: int = 20):
    """Get videos from a specific channel"""
    try:
        url = f"https://www.youtube.com/channel/{channel_id}/videos"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])[:limit]
                return [extract_video_info(e) for e in entries if e]

        videos = await run_in_thread(fetch)
        return {"success": True, "data": [v for v in videos if v]}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}
