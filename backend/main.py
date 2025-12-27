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
    if not entry or not isinstance(entry, dict):
        return None

    # Safe thumbnail extraction
    thumbnail = entry.get('thumbnail')
    if not thumbnail:
        thumbnails = entry.get('thumbnails')
        if thumbnails and isinstance(thumbnails, list) and len(thumbnails) > 0:
            last_thumb = thumbnails[-1]
            if last_thumb and isinstance(last_thumb, dict):
                thumbnail = last_thumb.get('url')

    video_id = entry.get('id')
    return {
        'id': video_id,
        'title': entry.get('title'),
        'thumbnail': thumbnail,
        'duration': entry.get('duration'),
        'view_count': entry.get('view_count'),
        'channel': entry.get('channel') or entry.get('uploader'),
        'channel_id': entry.get('channel_id') or entry.get('uploader_id'),
        'url': f"https://www.youtube.com/shorts/{video_id}" if video_id else None,
    }

def extract_video_info(entry):
    """Extract relevant info from a video entry"""
    if not entry or not isinstance(entry, dict):
        return None

    # Safe thumbnail extraction
    thumbnail = entry.get('thumbnail')
    if not thumbnail:
        thumbnails = entry.get('thumbnails')
        if thumbnails and isinstance(thumbnails, list) and len(thumbnails) > 0:
            last_thumb = thumbnails[-1]
            if last_thumb and isinstance(last_thumb, dict):
                thumbnail = last_thumb.get('url')

    video_id = entry.get('id')
    return {
        'id': video_id,
        'title': entry.get('title'),
        'thumbnail': thumbnail,
        'duration': entry.get('duration'),
        'view_count': entry.get('view_count'),
        'like_count': entry.get('like_count'),
        'channel': entry.get('channel') or entry.get('uploader'),
        'channel_id': entry.get('channel_id') or entry.get('uploader_id'),
        'description': entry.get('description', '')[:500] if entry.get('description') else None,
        'upload_date': entry.get('upload_date'),
        'url': f"https://www.youtube.com/watch?v={video_id}" if video_id else None,
    }

@app.get("/api/shorts/trending")
async def get_trending_shorts(country: str = "US", limit: int = 20):
    """Get trending YouTube Shorts"""
    try:
        # Use YouTube Shorts tab from trending or popular shorts search
        # Option 1: Search for trending shorts
        url = f"ytsearch{limit * 2}:trending shorts {country} 2024"

        opts = get_ydl_opts(extract_flat=True)
        opts['geo_bypass_country'] = country

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])
                # Filter to only short videos (<=60 seconds) and with thumbnails
                shorts = []
                for e in entries:
                    if e and e.get('duration', 61) <= 60:
                        info = extract_short_info(e)
                        if info and info.get('thumbnail'):
                            shorts.append(info)
                    if len(shorts) >= limit:
                        break
                return shorts

        shorts = await run_in_thread(fetch)
        return {"success": True, "data": shorts}
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
        # Search for trending/popular videos
        url = f"ytsearch{limit * 2}:trending music video {country} 2024"

        opts = get_ydl_opts(extract_flat=True)
        opts['geo_bypass_country'] = country

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                entries = result.get('entries', [])
                # Filter to videos with proper info and duration > 60s
                videos = []
                for e in entries:
                    if e and e.get('duration', 0) > 60:
                        info = extract_video_info(e)
                        if info and info.get('thumbnail') and info.get('title'):
                            videos.append(info)
                    if len(videos) >= limit:
                        break
                return videos

        videos = await run_in_thread(fetch)
        return {"success": True, "data": videos}
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

# =====================================
# yt-dlp Full Features API
# =====================================

@app.get("/api/ytdlp/extract")
async def ytdlp_extract(url: str):
    """Extract full metadata from any supported URL"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'ignoreerrors': True,
            'extract_flat': False,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return None
                return {
                    'id': result.get('id'),
                    'title': result.get('title'),
                    'description': result.get('description', '')[:1000] if result.get('description') else None,
                    'thumbnail': result.get('thumbnail'),
                    'duration': result.get('duration'),
                    'view_count': result.get('view_count'),
                    'like_count': result.get('like_count'),
                    'comment_count': result.get('comment_count'),
                    'channel': result.get('channel') or result.get('uploader'),
                    'channel_id': result.get('channel_id') or result.get('uploader_id'),
                    'channel_url': result.get('channel_url') or result.get('uploader_url'),
                    'upload_date': result.get('upload_date'),
                    'categories': result.get('categories', []),
                    'tags': result.get('tags', [])[:20],
                    'is_live': result.get('is_live'),
                    'was_live': result.get('was_live'),
                    'live_status': result.get('live_status'),
                    'age_limit': result.get('age_limit'),
                    'webpage_url': result.get('webpage_url'),
                    'extractor': result.get('extractor'),
                    'extractor_key': result.get('extractor_key'),
                    'playlist': result.get('playlist'),
                    'playlist_index': result.get('playlist_index'),
                    'availability': result.get('availability'),
                    'original_url': url,
                }

        info = await run_in_thread(fetch)
        return {"success": True, "data": info}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/ytdlp/formats")
async def ytdlp_formats(url: str):
    """Get all available formats for a video"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'listformats': False,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return []
                formats = result.get('formats', [])
                return [{
                    'format_id': f.get('format_id'),
                    'format_note': f.get('format_note'),
                    'ext': f.get('ext'),
                    'resolution': f.get('resolution') or f"{f.get('width', '?')}x{f.get('height', '?')}",
                    'fps': f.get('fps'),
                    'vcodec': f.get('vcodec'),
                    'acodec': f.get('acodec'),
                    'filesize': f.get('filesize') or f.get('filesize_approx'),
                    'tbr': f.get('tbr'),
                    'abr': f.get('abr'),
                    'vbr': f.get('vbr'),
                    'audio_channels': f.get('audio_channels'),
                    'quality': f.get('quality'),
                } for f in formats]

        formats = await run_in_thread(fetch)
        return {"success": True, "data": formats}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/ytdlp/subtitles")
async def ytdlp_subtitles(url: str):
    """Get available subtitles/captions"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'writesubtitles': False,
            'writeautomaticsub': False,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return {'subtitles': {}, 'automatic_captions': {}}

                subtitles = {}
                for lang, subs in result.get('subtitles', {}).items():
                    subtitles[lang] = [{
                        'ext': s.get('ext'),
                        'url': s.get('url'),
                        'name': s.get('name'),
                    } for s in subs]

                auto_captions = {}
                for lang, caps in result.get('automatic_captions', {}).items():
                    auto_captions[lang] = [{
                        'ext': c.get('ext'),
                        'url': c.get('url'),
                        'name': c.get('name'),
                    } for c in caps[:3]]  # Limit to 3 formats per language

                return {
                    'subtitles': subtitles,
                    'automatic_captions': auto_captions,
                    'subtitle_count': len(subtitles),
                    'auto_caption_count': len(auto_captions),
                }

        subs = await run_in_thread(fetch)
        return {"success": True, "data": subs}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/ytdlp/chapters")
async def ytdlp_chapters(url: str):
    """Get video chapters"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return []
                chapters = result.get('chapters', [])
                return [{
                    'title': c.get('title'),
                    'start_time': c.get('start_time'),
                    'end_time': c.get('end_time'),
                } for c in chapters]

        chapters = await run_in_thread(fetch)
        return {"success": True, "data": chapters}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/ytdlp/comments")
async def ytdlp_comments(url: str, limit: int = 20):
    """Get video comments (limited)"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'getcomments': True,
            'extractor_args': {'youtube': {'max_comments': [str(limit)]}},
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return []
                comments = result.get('comments', [])[:limit]
                return [{
                    'id': c.get('id'),
                    'text': c.get('text'),
                    'author': c.get('author'),
                    'author_id': c.get('author_id'),
                    'author_thumbnail': c.get('author_thumbnail'),
                    'like_count': c.get('like_count'),
                    'timestamp': c.get('timestamp'),
                    'is_pinned': c.get('is_pinned'),
                    'parent': c.get('parent'),
                } for c in comments]

        comments = await run_in_thread(fetch)
        return {"success": True, "data": comments}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/ytdlp/playlist")
async def ytdlp_playlist(url: str, limit: int = 50):
    """Get playlist information"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': True,
            'playlistend': limit,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return None
                entries = result.get('entries', [])
                return {
                    'id': result.get('id'),
                    'title': result.get('title'),
                    'description': result.get('description', '')[:500] if result.get('description') else None,
                    'thumbnail': result.get('thumbnail'),
                    'channel': result.get('channel') or result.get('uploader'),
                    'channel_id': result.get('channel_id'),
                    'playlist_count': result.get('playlist_count') or len(entries),
                    'view_count': result.get('view_count'),
                    'modified_date': result.get('modified_date'),
                    'entries': [{
                        'id': e.get('id'),
                        'title': e.get('title'),
                        'thumbnail': e.get('thumbnail'),
                        'duration': e.get('duration'),
                        'channel': e.get('channel') or e.get('uploader'),
                    } for e in entries if e],
                }

        playlist = await run_in_thread(fetch)
        return {"success": True, "data": playlist}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/ytdlp/live")
async def ytdlp_live(url: str):
    """Get live stream information"""
    try:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return None
                return {
                    'id': result.get('id'),
                    'title': result.get('title'),
                    'thumbnail': result.get('thumbnail'),
                    'is_live': result.get('is_live'),
                    'was_live': result.get('was_live'),
                    'live_status': result.get('live_status'),
                    'release_timestamp': result.get('release_timestamp'),
                    'concurrent_view_count': result.get('concurrent_view_count'),
                    'channel': result.get('channel'),
                    'channel_id': result.get('channel_id'),
                }

        info = await run_in_thread(fetch)
        return {"success": True, "data": info}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/ytdlp/supported-sites")
async def ytdlp_supported_sites():
    """Get list of all supported sites"""
    try:
        def fetch():
            extractors = yt_dlp.list_extractors()
            sites = []
            seen = set()
            for e in extractors:
                name = e.IE_NAME if hasattr(e, 'IE_NAME') else e.__name__
                if name and name not in seen and not name.startswith('Generic'):
                    seen.add(name)
                    sites.append({
                        'name': name,
                        'description': e.IE_DESC if hasattr(e, 'IE_DESC') else None,
                    })
            return sorted(sites, key=lambda x: x['name'].lower())

        sites = await run_in_thread(fetch)
        return {"success": True, "data": sites, "count": len(sites)}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

# =====================================
# Multi-Platform Support
# =====================================

@app.get("/api/tiktok/trending")
async def tiktok_trending(limit: int = 20):
    """Get TikTok trending videos"""
    try:
        # TikTok trending search
        url = "https://www.tiktok.com/search?q=trending"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return []
                entries = result.get('entries', [])[:limit]
                return [{
                    'id': e.get('id'),
                    'title': e.get('title') or e.get('description', '')[:100],
                    'thumbnail': e.get('thumbnail'),
                    'duration': e.get('duration'),
                    'view_count': e.get('view_count'),
                    'like_count': e.get('like_count'),
                    'channel': e.get('uploader') or e.get('creator'),
                    'url': e.get('webpage_url'),
                } for e in entries if e]

        videos = await run_in_thread(fetch)
        return {"success": True, "data": videos}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/tiktok/search")
async def tiktok_search(q: str, limit: int = 20):
    """Search TikTok videos"""
    try:
        url = f"https://www.tiktok.com/search?q={q}"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return []
                entries = result.get('entries', [])[:limit]
                return [{
                    'id': e.get('id'),
                    'title': e.get('title') or e.get('description', '')[:100],
                    'thumbnail': e.get('thumbnail'),
                    'duration': e.get('duration'),
                    'view_count': e.get('view_count'),
                    'like_count': e.get('like_count'),
                    'channel': e.get('uploader') or e.get('creator'),
                    'url': e.get('webpage_url'),
                } for e in entries if e]

        videos = await run_in_thread(fetch)
        return {"success": True, "data": videos}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/tiktok/user/{username}")
async def tiktok_user(username: str, limit: int = 20):
    """Get TikTok user videos"""
    try:
        url = f"https://www.tiktok.com/@{username}"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return {'user': None, 'videos': []}
                entries = result.get('entries', [])[:limit]
                return {
                    'user': {
                        'id': result.get('id'),
                        'username': username,
                        'title': result.get('title'),
                        'thumbnail': result.get('thumbnail'),
                    },
                    'videos': [{
                        'id': e.get('id'),
                        'title': e.get('title') or e.get('description', '')[:100],
                        'thumbnail': e.get('thumbnail'),
                        'duration': e.get('duration'),
                        'view_count': e.get('view_count'),
                        'url': e.get('webpage_url'),
                    } for e in entries if e]
                }

        data = await run_in_thread(fetch)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/instagram/user/{username}")
async def instagram_user(username: str, limit: int = 20):
    """Get Instagram user posts"""
    try:
        url = f"https://www.instagram.com/{username}/"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return {'user': None, 'posts': []}
                entries = result.get('entries', [])[:limit]
                return {
                    'user': {
                        'id': result.get('id'),
                        'username': username,
                        'title': result.get('title'),
                        'thumbnail': result.get('thumbnail'),
                    },
                    'posts': [{
                        'id': e.get('id'),
                        'title': e.get('title') or e.get('description', '')[:100] if e.get('description') else '',
                        'thumbnail': e.get('thumbnail'),
                        'duration': e.get('duration'),
                        'view_count': e.get('view_count'),
                        'like_count': e.get('like_count'),
                        'url': e.get('webpage_url'),
                    } for e in entries if e]
                }

        data = await run_in_thread(fetch)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/instagram/reels/{username}")
async def instagram_reels(username: str, limit: int = 20):
    """Get Instagram user reels"""
    try:
        url = f"https://www.instagram.com/{username}/reels/"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return []
                entries = result.get('entries', [])[:limit]
                return [{
                    'id': e.get('id'),
                    'title': e.get('title') or e.get('description', '')[:100] if e.get('description') else '',
                    'thumbnail': e.get('thumbnail'),
                    'duration': e.get('duration'),
                    'view_count': e.get('view_count'),
                    'like_count': e.get('like_count'),
                    'url': e.get('webpage_url'),
                } for e in entries if e]

        reels = await run_in_thread(fetch)
        return {"success": True, "data": reels}
    except Exception as e:
        return {"success": False, "data": [], "error": str(e)}

@app.get("/api/twitter/user/{username}")
async def twitter_user(username: str, limit: int = 20):
    """Get Twitter/X user videos"""
    try:
        url = f"https://twitter.com/{username}/media"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return {'user': None, 'videos': []}
                entries = result.get('entries', [])[:limit]
                return {
                    'user': {
                        'username': username,
                        'title': result.get('title'),
                    },
                    'videos': [{
                        'id': e.get('id'),
                        'title': e.get('title') or e.get('description', '')[:100] if e.get('description') else '',
                        'thumbnail': e.get('thumbnail'),
                        'duration': e.get('duration'),
                        'view_count': e.get('view_count'),
                        'like_count': e.get('like_count'),
                        'repost_count': e.get('repost_count'),
                        'url': e.get('webpage_url'),
                    } for e in entries if e]
                }

        data = await run_in_thread(fetch)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/twitch/channel/{channel}")
async def twitch_channel(channel: str, limit: int = 20):
    """Get Twitch channel videos"""
    try:
        url = f"https://www.twitch.tv/{channel}/videos"

        opts = get_ydl_opts(extract_flat=True)
        opts['playlistend'] = limit

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return {'channel': None, 'videos': []}
                entries = result.get('entries', [])[:limit]
                return {
                    'channel': {
                        'name': channel,
                        'title': result.get('title'),
                        'thumbnail': result.get('thumbnail'),
                    },
                    'videos': [{
                        'id': e.get('id'),
                        'title': e.get('title'),
                        'thumbnail': e.get('thumbnail'),
                        'duration': e.get('duration'),
                        'view_count': e.get('view_count'),
                        'url': e.get('webpage_url'),
                    } for e in entries if e]
                }

        data = await run_in_thread(fetch)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

@app.get("/api/twitch/live/{channel}")
async def twitch_live(channel: str):
    """Get Twitch live stream info"""
    try:
        url = f"https://www.twitch.tv/{channel}"

        opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }

        def fetch():
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=False)
                if not result:
                    return None
                return {
                    'id': result.get('id'),
                    'title': result.get('title') or result.get('description'),
                    'thumbnail': result.get('thumbnail'),
                    'is_live': result.get('is_live'),
                    'view_count': result.get('view_count'),
                    'concurrent_view_count': result.get('concurrent_view_count'),
                    'channel': channel,
                    'uploader': result.get('uploader'),
                }

        info = await run_in_thread(fetch)
        return {"success": True, "data": info}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}
