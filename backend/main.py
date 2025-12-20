# MusicGram Backend API
# 200만 DAU 대응 확장 가능 설계

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import os
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# Supabase 클라이언트 (영구 저장소)
# =============================================================================
supabase_client = None
try:
    from supabase import create_client, Client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supabase_url and supabase_key:
        supabase_client: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase connected!")
except ImportError:
    logger.warning("Supabase not installed")
except Exception as e:
    logger.warning(f"Supabase connection failed: {e}")

# Redis 캐시 (선택적)
redis_client = None
try:
    import redis
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        redis_client = redis.from_url(redis_url, decode_responses=True)
        logger.info("Redis connected!")
except ImportError:
    logger.warning("Redis not installed, using in-memory cache")
except Exception as e:
    logger.warning(f"Redis connection failed: {e}")

# 메모리 캐시 (Redis 없을 때 폴백)
memory_cache = {}

# YTMusic 인스턴스 (국가별)
ytmusic_instances = {}

def get_ytmusic(country: str = "US"):
    """국가별 YTMusic 인스턴스 (싱글톤)"""
    from ytmusicapi import YTMusic
    
    if country not in ytmusic_instances:
        lang_map = {
            'KR': 'ko', 'JP': 'ja', 'US': 'en', 'GB': 'en',
            'DE': 'de', 'FR': 'fr', 'BR': 'pt', 'ES': 'es'
        }
        lang = lang_map.get(country, 'en')
        ytmusic_instances[country] = YTMusic(language=lang, location=country)
    
    return ytmusic_instances[country]

def cache_get(key: str):
    """캐시에서 데이터 가져오기"""
    if redis_client:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    return memory_cache.get(key)

def cache_set(key: str, value, ttl: int = 3600):
    """캐시에 데이터 저장"""
    if redis_client:
        redis_client.setex(key, ttl, json.dumps(value))
    else:
        memory_cache[key] = value

# =============================================================================
# Supabase DB 헬퍼 함수
# =============================================================================

def db_save_artist(artist_data: dict) -> str | None:
    """아티스트를 DB에 저장 (upsert)"""
    if not supabase_client:
        return None

    try:
        browse_id = artist_data.get("browseId") or artist_data.get("browse_id")
        if not browse_id:
            return None

        data = {
            "browse_id": browse_id,
            "name": artist_data.get("name") or artist_data.get("artist") or "",
            "thumbnails": json.dumps(artist_data.get("thumbnails") or []),
            "description": artist_data.get("description") or "",
            "subscribers": artist_data.get("subscribers") or "",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

        result = supabase_client.table("music_artists").upsert(
            data, on_conflict="browse_id"
        ).execute()

        if result.data:
            return result.data[0].get("id")
        return None
    except Exception as e:
        logger.warning(f"DB save artist error: {e}")
        return None

def db_save_album(album_data: dict, artist_id: str = None) -> str | None:
    """앨범을 DB에 저장 (upsert)"""
    if not supabase_client:
        return None

    try:
        browse_id = album_data.get("browseId") or album_data.get("browse_id")
        if not browse_id:
            return None

        # 아티스트 정보 추출
        artists = album_data.get("artists") or []
        artist_browse_id = None
        if artists and isinstance(artists, list) and len(artists) > 0:
            artist_browse_id = artists[0].get("id") or artists[0].get("browseId")

        data = {
            "browse_id": browse_id,
            "artist_browse_id": artist_browse_id or album_data.get("artist_bid"),
            "title": album_data.get("title") or "",
            "album_type": album_data.get("type") or "Album",
            "year": album_data.get("year") or "",
            "thumbnails": json.dumps(album_data.get("thumbnails") or []),
            "track_count": len(album_data.get("tracks") or []),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

        if artist_id:
            data["artist_id"] = artist_id

        result = supabase_client.table("music_albums").upsert(
            data, on_conflict="browse_id"
        ).execute()

        if result.data:
            return result.data[0].get("id")
        return None
    except Exception as e:
        logger.warning(f"DB save album error: {e}")
        return None

def db_save_track(track_data: dict, album_id: str = None, artist_id: str = None) -> str | None:
    """트랙을 DB에 저장 (upsert)"""
    if not supabase_client:
        return None

    try:
        video_id = track_data.get("videoId") or track_data.get("video_id")
        if not video_id:
            return None

        # 아티스트 이름 추출
        artists = track_data.get("artists") or []
        artist_name = ""
        artist_browse_id = None
        if artists and isinstance(artists, list) and len(artists) > 0:
            artist_name = artists[0].get("name") or ""
            artist_browse_id = artists[0].get("id") or artists[0].get("browseId")

        # 앨범 정보 추출
        album = track_data.get("album") or {}
        album_title = album.get("name") or ""
        album_browse_id = album.get("id") or album.get("browseId")

        # 재생 시간 파싱
        duration = track_data.get("duration") or ""
        duration_seconds = track_data.get("duration_seconds") or 0
        if duration and not duration_seconds:
            try:
                parts = duration.split(":")
                if len(parts) == 2:
                    duration_seconds = int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            except:
                pass

        data = {
            "video_id": video_id,
            "artist_browse_id": artist_browse_id or track_data.get("artist_bid"),
            "album_browse_id": album_browse_id,
            "title": track_data.get("title") or "",
            "artist_name": artist_name,
            "album_title": album_title,
            "duration": duration,
            "duration_seconds": duration_seconds,
            "thumbnails": json.dumps(track_data.get("thumbnails") or []),
            "is_explicit": track_data.get("isExplicit") or False
        }

        if album_id:
            data["album_id"] = album_id
        if artist_id:
            data["artist_id"] = artist_id

        result = supabase_client.table("music_tracks").upsert(
            data, on_conflict="video_id"
        ).execute()

        if result.data:
            return result.data[0].get("id")
        return None
    except Exception as e:
        logger.warning(f"DB save track error: {e}")
        return None

def db_get_cached_search(keyword: str, country: str = "US") -> dict | None:
    """검색 캐시에서 데이터 조회"""
    if not supabase_client:
        return None

    try:
        keyword_normalized = keyword.lower()

        # 검색 캐시 조회
        result = supabase_client.table("music_search_cache").select("*").eq(
            "keyword_normalized", keyword_normalized
        ).eq("country", country).single().execute()

        if not result.data:
            return None

        cache_entry = result.data
        last_searched = cache_entry.get("last_searched")

        # 24시간 이내인지 확인
        if last_searched:
            last_time = datetime.fromisoformat(last_searched.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) - last_time > timedelta(hours=24):
                logger.info(f"Cache expired for: {keyword}")
                return None  # 캐시 만료

        # 아티스트 ID 목록으로 데이터 조회
        artist_ids = cache_entry.get("artist_ids") or []
        if not artist_ids:
            return None

        # 아티스트 데이터 조회
        artists_result = supabase_client.table("music_artists").select("*").in_(
            "id", artist_ids
        ).execute()

        artists = []
        for a in (artists_result.data or []):
            artists.append({
                "browseId": a.get("browse_id"),
                "artist": a.get("name"),
                "name": a.get("name"),
                "thumbnails": json.loads(a.get("thumbnails") or "[]"),
                "description": a.get("description"),
                "subscribers": a.get("subscribers")
            })

        # 아티스트별 앨범 및 트랙 조회
        albums_data = []
        for artist in artists:
            browse_id = artist.get("browseId")
            if not browse_id:
                continue

            # 앨범 조회
            albums_result = supabase_client.table("music_albums").select("*").eq(
                "artist_browse_id", browse_id
            ).order("year", desc=True).limit(30).execute()

            for album in (albums_result.data or []):
                album_browse_id = album.get("browse_id")

                # 앨범의 트랙 조회
                tracks_result = supabase_client.table("music_tracks").select("*").eq(
                    "album_browse_id", album_browse_id
                ).execute()

                tracks = []
                for t in (tracks_result.data or []):
                    tracks.append({
                        "videoId": t.get("video_id"),
                        "title": t.get("title"),
                        "artists": [{"name": t.get("artist_name"), "id": t.get("artist_browse_id")}],
                        "album": {"name": t.get("album_title"), "id": t.get("album_browse_id")},
                        "duration": t.get("duration"),
                        "thumbnails": json.loads(t.get("thumbnails") or "[]"),
                        "isExplicit": t.get("is_explicit")
                    })

                albums_data.append({
                    "browseId": album_browse_id,
                    "title": album.get("title"),
                    "type": album.get("album_type"),
                    "year": album.get("year"),
                    "thumbnails": json.loads(album.get("thumbnails") or "[]"),
                    "artist_bid": browse_id,
                    "tracks": tracks
                })

        # 검색 카운트 증가
        supabase_client.table("music_search_cache").update({
            "search_count": cache_entry.get("search_count", 0) + 1,
            "last_searched": datetime.now(timezone.utc).isoformat()
        }).eq("id", cache_entry.get("id")).execute()

        return {
            "keyword": keyword,
            "country": country,
            "artists": artists,
            "songs": [],  # 개별 곡 검색은 ytmusicapi에서
            "albums": [],
            "albums2": albums_data,
            "source": "database"
        }

    except Exception as e:
        logger.warning(f"DB get cached search error: {e}")
        return None

def db_get_existing_video_ids(artist_browse_id: str) -> set:
    """아티스트의 기존 video_id 목록 조회 (중복 방지용)"""
    if not supabase_client or not artist_browse_id:
        return set()

    try:
        result = supabase_client.table("music_tracks").select("video_id").eq(
            "artist_browse_id", artist_browse_id
        ).execute()

        return {r.get("video_id") for r in (result.data or []) if r.get("video_id")}
    except Exception as e:
        logger.warning(f"DB get existing video_ids error: {e}")
        return set()

def db_get_existing_album_ids(artist_browse_id: str) -> set:
    """아티스트의 기존 album browse_id 목록 조회 (중복 방지용)"""
    if not supabase_client or not artist_browse_id:
        return set()

    try:
        result = supabase_client.table("music_albums").select("browse_id").eq(
            "artist_browse_id", artist_browse_id
        ).execute()

        return {r.get("browse_id") for r in (result.data or []) if r.get("browse_id")}
    except Exception as e:
        logger.warning(f"DB get existing album_ids error: {e}")
        return set()

def db_artist_needs_update(browse_id: str, hours: int = 6) -> bool:
    """아티스트가 업데이트 필요한지 확인 (마지막 업데이트 후 N시간 경과)"""
    if not supabase_client or not browse_id:
        return True

    try:
        result = supabase_client.table("music_artists").select("last_updated").eq(
            "browse_id", browse_id
        ).single().execute()

        if not result.data:
            return True  # 없으면 업데이트 필요

        last_updated = result.data.get("last_updated")
        if not last_updated:
            return True

        last_time = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) - last_time > timedelta(hours=hours)
    except Exception as e:
        logger.warning(f"DB artist needs update check error: {e}")
        return True

def db_save_related_artists(main_artist_browse_id: str, related_artists: list):
    """유사 아티스트 관계 저장"""
    if not supabase_client or not related_artists:
        return

    try:
        for related in related_artists:
            related_browse_id = related.get("browseId")
            if not related_browse_id:
                continue

            # 먼저 관련 아티스트도 music_artists 테이블에 저장
            db_save_artist(related)

            # 관계 저장
            data = {
                "main_artist_browse_id": main_artist_browse_id,
                "related_artist_browse_id": related_browse_id,
                "relation_type": "similar"
            }

            supabase_client.table("artist_relations").upsert(
                data, on_conflict="main_artist_browse_id,related_artist_browse_id"
            ).execute()

        logger.info(f"Saved {len(related_artists)} related artists for {main_artist_browse_id}")
    except Exception as e:
        logger.warning(f"DB save related artists error: {e}")

def db_save_search_cache(keyword: str, country: str, artist_ids: list):
    """검색 결과를 캐시에 저장"""
    if not supabase_client or not artist_ids:
        return

    try:
        data = {
            "keyword": keyword,
            "keyword_normalized": keyword.lower(),
            "country": country,
            "artist_ids": artist_ids,
            "result_count": len(artist_ids),
            "last_searched": datetime.now(timezone.utc).isoformat()
        }

        supabase_client.table("music_search_cache").upsert(
            data, on_conflict="keyword_normalized,country"
        ).execute()

    except Exception as e:
        logger.warning(f"DB save search cache error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    logger.info("🚀 MusicGram API starting...")
    yield
    # 종료 시
    logger.info("👋 MusicGram API shutting down...")

# FastAPI 앱
app = FastAPI(
    title="MusicGram API",
    description="YouTube Music 기반 음악 플레이리스트 소셜 플랫폼 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 설정 (프론트엔드 허용)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# 헬스 체크
# =============================================================================

@app.get("/")
async def root():
    return {
        "service": "MusicGram API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "redis": "connected" if redis_client else "not configured",
        "supabase": "connected" if supabase_client else "not configured"
    }

# =============================================================================
# 음악 검색 API
# =============================================================================

@app.get("/api/search")
async def search_music(
    request: Request,
    q: str,
    filter: str = "songs",
    limit: int = 20,
    country: str = None
):
    """음악 검색"""
    # 국가 감지 (헤더 또는 파라미터)
    if not country:
        country = request.headers.get("CF-IPCountry", "US")
    
    # 캐시 키
    cache_key = f"search:{country}:{filter}:{q}"
    
    # 캐시 확인
    cached = cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit: {cache_key}")
        return {"source": "cache", "results": cached}
    
    # API 호출
    try:
        ytmusic = get_ytmusic(country)
        results = ytmusic.search(q, filter=filter, limit=limit)
        
        # 캐시 저장 (30분)
        cache_set(cache_key, results, ttl=1800)
        
        return {"source": "api", "results": results}
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 차트 API
# =============================================================================

@app.get("/api/charts")
async def get_charts(request: Request, country: str = None):
    """국가별 인기 차트"""
    if not country:
        country = request.headers.get("CF-IPCountry", "US")
    
    cache_key = f"charts:{country}"
    
    cached = cache_get(cache_key)
    if cached:
        return {"country": country, "source": "cache", "charts": cached}
    
    try:
        ytmusic = get_ytmusic(country)
        charts = ytmusic.get_charts(country=country)
        
        # 1시간 캐시
        cache_set(cache_key, charts, ttl=3600)
        
        return {"country": country, "source": "api", "charts": charts}
    except Exception as e:
        logger.error(f"Charts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 신규 앨범 API
# =============================================================================

@app.get("/api/new-albums")
async def get_new_albums(request: Request, country: str = None):
    """국가별 신규 앨범"""
    if not country:
        country = request.headers.get("CF-IPCountry", "US")
    
    cache_key = f"new_albums:{country}"
    
    cached = cache_get(cache_key)
    if cached:
        return {"country": country, "source": "cache", "albums": cached}
    
    try:
        ytmusic = get_ytmusic(country)
        albums = ytmusic.get_new_albums()
        
        # 1시간 캐시
        cache_set(cache_key, albums, ttl=3600)
        
        return {"country": country, "source": "api", "albums": albums}
    except Exception as e:
        logger.error(f"New albums error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Summary Search API (Sample folder compatible)
# =============================================================================

@app.get("/api/search/summary")
async def search_summary(
    request: Request,
    q: str,
    country: str = None,
    force_refresh: bool = False
):
    """
    Comprehensive search returning all artist data (songs, albums, singles).
    Compatible with sample folder's api_proxy.php?type=summary
    Uses ytmusicapi 1.11.4 with get_artist_albums() for complete discography.

    Data Flow:
    1. Check Redis cache (30min TTL) - fastest
    2. Check Supabase DB (24hr TTL) - permanent storage
    3. Call ytmusicapi and save to both DB and cache
    """
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"summary:{country}:{q}"

    # 1. Redis 캐시 확인 (가장 빠름)
    if not force_refresh:
        cached = cache_get(cache_key)
        if cached:
            logger.info(f"Redis cache hit: {cache_key}")
            cached["source"] = "redis"
            return cached

        # 2. Supabase DB 확인 (24시간 이내 데이터)
        db_cached = db_get_cached_search(q, country)
        if db_cached:
            logger.info(f"DB cache hit: {q}")
            # Redis에도 캐시 (다음 요청 빠르게)
            cache_set(cache_key, db_cached, ttl=1800)
            return db_cached

    logger.info(f"Fetching from ytmusicapi: {q}")

    try:
        ytmusic = get_ytmusic(country)

        # 1. Search for artists (with error handling)
        # Note: filter="artists" sometimes returns empty, so use general search as fallback
        artists_search = []
        try:
            artists_search = ytmusic.search(q, filter="artists", limit=5) or []
            # Fallback: if filtered search returns empty, use general search
            if not artists_search:
                general_results = ytmusic.search(q, limit=50) or []
                artists_search = [r for r in general_results if r.get("resultType") == "artist"][:5]
        except Exception as e:
            logger.warning(f"Artist search error: {e}")

        # 2. Also search for songs directly (for song title searches)
        # This helps when user searches for a song title like "Dynamite"
        songs_search = []
        try:
            direct_song_results = ytmusic.search(q, filter="songs", limit=20) or []
            for song in direct_song_results:
                if isinstance(song, dict) and song.get("videoId"):
                    song_copy = dict(song)
                    song_copy["resultType"] = "song"
                    song_copy["from_direct_search"] = True  # Mark as from direct search
                    songs_search.append(song_copy)
        except Exception as e:
            logger.warning(f"Song search error: {e}")

        # 3. Skip general albums search - we'll get albums from artist page only
        albums_search = []  # Will be populated from artist page below

        # 4. For each artist, get complete discography
        artists_data = []
        albums_data = []

        for artist in artists_search[:2]:  # Top 2 artists to reduce load
            if not isinstance(artist, dict):
                continue
            artist_id = artist.get("browseId")
            if not artist_id:
                continue
            try:
                artist_info = ytmusic.get_artist(artist_id)
                if not artist_info or not isinstance(artist_info, dict):
                    continue

                # Extract artist details
                # Use search result thumbnails (square) instead of get_artist thumbnails (banner)
                search_thumbnails = artist.get("thumbnails") or []
                artist_entry = {
                    "artist": artist_info.get("name") or artist.get("artist") or "",
                    "browseId": artist_id,
                    "thumbnails": search_thumbnails if search_thumbnails else artist_info.get("thumbnails") or [],
                    "description": artist_info.get("description") or "",
                    "subscribers": artist_info.get("subscribers") or ""
                }
                artists_data.append(artist_entry)

                # Extract songs from artist page (only this artist's songs)
                songs_section = artist_info.get("songs")
                if songs_section and isinstance(songs_section, dict):
                    song_results = songs_section.get("results") or []
                    for song in song_results:
                        if isinstance(song, dict):
                            song_copy = dict(song)
                            song_copy["artist_bid"] = artist_id
                            song_copy["resultType"] = "song"
                            songs_search.append(song_copy)  # Add to songs list

                # Get albums list WITHOUT fetching each album's details (FAST!)
                # Album details can be fetched on-demand when user clicks an album
                albums_section = artist_info.get("albums")
                if albums_section and isinstance(albums_section, dict):
                    # First try get_artist_albums for complete list
                    params = albums_section.get("params")
                    browse_id = albums_section.get("browseId")
                    album_list = []

                    if params and browse_id:
                        try:
                            album_list = ytmusic.get_artist_albums(browse_id, params) or []
                        except Exception as e:
                            logger.warning(f"get_artist_albums error: {e}")

                    # Fallback to results from artist page
                    if not album_list:
                        album_list = albums_section.get("results") or []

                    # Add albums WITHOUT fetching details (no get_album calls!)
                    for album in album_list[:15]:  # Limit to 15 albums
                        if not isinstance(album, dict):
                            continue
                        album_id = album.get("browseId")
                        if not album_id:
                            continue

                        album_entry = {
                            "title": album.get("title") or "",
                            "browseId": album_id,
                            "artists": [{"name": artist_entry.get("artist"), "id": artist_id}],
                            "thumbnails": album.get("thumbnails") or [],
                            "year": album.get("year") or "",
                            "type": album.get("type") or "Album",
                            "artist_bid": artist_id,
                            "tracks": []  # Empty - fetch on demand
                        }
                        albums_data.append(album_entry)

                # Get related artists from artist page
                related_section = artist_info.get("related")
                if related_section and isinstance(related_section, dict):
                    related_results = related_section.get("results") or []
                    for related_artist in related_results[:10]:  # Limit to 10 related artists
                        if isinstance(related_artist, dict):
                            related_entry = {
                                "browseId": related_artist.get("browseId") or "",
                                "artist": related_artist.get("title") or related_artist.get("name") or "",
                                "name": related_artist.get("title") or related_artist.get("name") or "",
                                "subscribers": related_artist.get("subscribers") or "",
                                "thumbnails": related_artist.get("thumbnails") or []
                            }
                            # Add to artist_entry's related list
                            if "related" not in artist_entry:
                                artist_entry["related"] = []
                            artist_entry["related"].append(related_entry)

                # Get singles list WITHOUT fetching details (FAST!)
                singles_section = artist_info.get("singles")
                if singles_section and isinstance(singles_section, dict):
                    params = singles_section.get("params")
                    browse_id = singles_section.get("browseId")
                    singles_list = []

                    if params and browse_id:
                        try:
                            singles_list = ytmusic.get_artist_albums(browse_id, params) or []
                        except Exception as e:
                            logger.warning(f"get_artist_albums for singles error: {e}")

                    if not singles_list:
                        singles_list = singles_section.get("results") or []

                    # Add singles WITHOUT fetching details
                    for single in singles_list[:10]:  # Limit to 10 singles
                        if not isinstance(single, dict):
                            continue
                        single_id = single.get("browseId")
                        if not single_id:
                            continue

                        single_entry = {
                            "title": single.get("title") or "",
                            "browseId": single_id,
                            "artists": [{"name": artist_entry.get("artist"), "id": artist_id}],
                            "thumbnails": single.get("thumbnails") or [],
                            "year": single.get("year") or "",
                            "type": "Single",
                            "artist_bid": artist_id,
                            "tracks": []  # Empty - fetch on demand
                        }
                        albums_data.append(single_entry)

            except Exception as artist_err:
                logger.warning(f"Artist fetch error for {artist_id}: {artist_err}")

        result = {
            "keyword": q,
            "country": country,
            "artists": artists_data,
            "songs": songs_search,
            "albums": albums_search,
            "albums2": albums_data,  # Artist discography (like sample folder)
            "source": "ytmusicapi"
        }

        # Cache for 30 minutes (Redis)
        cache_set(cache_key, result, ttl=1800)

        # Save to Supabase DB (incremental - only NEW items)
        if supabase_client and artists_data:
            try:
                saved_artist_ids = []
                new_albums_count = 0
                new_tracks_count = 0
                skipped_albums = 0
                skipped_tracks = 0

                for artist in artists_data:
                    browse_id = artist.get("browseId")
                    if not browse_id:
                        continue

                    # 아티스트 저장 (upsert - 기본 정보만 업데이트)
                    artist_db_id = db_save_artist(artist)
                    if artist_db_id:
                        saved_artist_ids.append(artist_db_id)

                    # 유사 아티스트 저장
                    related_artists = artist.get("related") or []
                    if related_artists:
                        db_save_related_artists(browse_id, related_artists)

                    # 기존 앨범/트랙 ID 가져오기 (중복 방지)
                    existing_album_ids = db_get_existing_album_ids(browse_id)
                    existing_video_ids = db_get_existing_video_ids(browse_id)

                    # 이 아티스트의 앨범만 필터링
                    artist_albums = [a for a in albums_data if a.get("artist_bid") == browse_id]

                    for album in artist_albums:
                        album_browse_id = album.get("browseId")
                        if not album_browse_id:
                            continue

                        # 새 앨범만 저장
                        if album_browse_id in existing_album_ids:
                            skipped_albums += 1
                            continue

                        album_db_id = db_save_album(album)
                        new_albums_count += 1

                        # 새 트랙만 저장
                        tracks = album.get("tracks") or []
                        for track in tracks:
                            if not isinstance(track, dict):
                                continue
                            video_id = track.get("videoId")
                            if not video_id:
                                continue

                            if video_id in existing_video_ids:
                                skipped_tracks += 1
                                continue

                            db_save_track(track, album_id=album_db_id)
                            existing_video_ids.add(video_id)  # 중복 방지
                            new_tracks_count += 1

                # 검색 캐시 저장
                if saved_artist_ids:
                    db_save_search_cache(q, country, saved_artist_ids)

                logger.info(f"DB save complete: {q} | "
                           f"New: {new_albums_count} albums, {new_tracks_count} tracks | "
                           f"Skipped: {skipped_albums} albums, {skipped_tracks} tracks")

            except Exception as db_err:
                logger.warning(f"DB save error (non-blocking): {db_err}")

        return result

    except Exception as e:
        logger.error(f"Summary search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 아티스트 정보 API
# =============================================================================

@app.get("/api/artist/{artist_id}")
async def get_artist(artist_id: str):
    """아티스트 상세 정보"""
    cache_key = f"artist:{artist_id}"
    
    cached = cache_get(cache_key)
    if cached:
        return {"source": "cache", "artist": cached}
    
    try:
        ytmusic = get_ytmusic("US")
        artist = ytmusic.get_artist(artist_id)
        
        # 6시간 캐시
        cache_set(cache_key, artist, ttl=21600)
        
        return {"source": "api", "artist": artist}
    except Exception as e:
        logger.error(f"Artist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 앨범 정보 API
# =============================================================================

@app.get("/api/album/{album_id}")
async def get_album(album_id: str):
    """앨범 상세 정보"""
    cache_key = f"album:{album_id}"
    
    cached = cache_get(cache_key)
    if cached:
        return {"source": "cache", "album": cached}
    
    try:
        ytmusic = get_ytmusic("US")
        album = ytmusic.get_album(album_id)
        
        # 6시간 캐시
        cache_set(cache_key, album, ttl=21600)
        
        return {"source": "api", "album": album}
    except Exception as e:
        logger.error(f"Album error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 엔트리 포인트
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
