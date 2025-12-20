# MusicGram Backend API
# 200만 DAU 대응 확장 가능 설계

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        "redis": "connected" if redis_client else "not configured"
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
    country: str = None
):
    """
    Comprehensive search returning all artist data (songs, albums, singles).
    Compatible with sample folder's api_proxy.php?type=summary
    Uses ytmusicapi 1.11.4 with get_artist_albums() for complete discography.
    """
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"summary:{country}:{q}"

    cached = cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit: {cache_key}")
        return cached

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

        # 2. Search for songs (for exact title matches)
        # Note: filter="songs" sometimes returns empty, so use general search as fallback
        songs_search = []
        try:
            songs_search = ytmusic.search(q, filter="songs", limit=50) or []
            # Fallback: if filtered search returns empty, use general search
            if not songs_search:
                general_results = ytmusic.search(q, limit=100) or []
                songs_search = [r for r in general_results if r.get("resultType") == "song"]
        except Exception as e:
            logger.warning(f"Songs search error: {e}")

        # 3. Search for albums
        albums_search = []
        try:
            albums_search = ytmusic.search(q, filter="albums", limit=20) or []
        except Exception as e:
            logger.warning(f"Albums search error: {e}")

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
                artist_entry = {
                    "artist": artist_info.get("name") or artist.get("artist") or "",
                    "browseId": artist_id,
                    "thumbnails": artist_info.get("thumbnails") or [],
                    "description": artist_info.get("description") or "",
                    "subscribers": artist_info.get("subscribers") or ""
                }
                artists_data.append(artist_entry)

                # Extract songs from artist page
                songs_section = artist_info.get("songs")
                if songs_section and isinstance(songs_section, dict):
                    song_results = songs_section.get("results") or []
                    for song in song_results:
                        if isinstance(song, dict):
                            song_copy = dict(song)
                            song_copy["artist_bid"] = artist_id
                            albums_data.append(song_copy)

                # Use get_artist_albums for complete album list (new in 1.11.4)
                albums_section = artist_info.get("albums")
                if albums_section and isinstance(albums_section, dict):
                    params = albums_section.get("params")
                    browse_id = albums_section.get("browseId")
                    if params and browse_id:
                        try:
                            # Get all albums using get_artist_albums
                            all_albums = ytmusic.get_artist_albums(browse_id, params) or []
                            for album in all_albums[:20]:  # Limit to 20 albums
                                if not isinstance(album, dict):
                                    continue
                                album_id = album.get("browseId")
                                if not album_id:
                                    continue
                                try:
                                    album_detail = ytmusic.get_album(album_id)
                                    if album_detail and isinstance(album_detail, dict):
                                        album_entry = {
                                            "title": album_detail.get("title") or "",
                                            "browseId": album_id,
                                            "artists": album_detail.get("artists") or [],
                                            "thumbnails": album_detail.get("thumbnails") or [],
                                            "year": album_detail.get("year") or "",
                                            "type": album_detail.get("type") or "Album",
                                            "artist_bid": artist_id,
                                            "tracks": album_detail.get("tracks") or []
                                        }
                                        albums_data.append(album_entry)
                                except Exception as album_err:
                                    logger.warning(f"Album detail fetch error: {album_err}")
                        except Exception as albums_err:
                            logger.warning(f"get_artist_albums error: {albums_err}")
                            # Fallback: use results from artist page
                            album_results = (albums_section.get("results") or [])[:10]
                            for album in album_results:
                                if not isinstance(album, dict):
                                    continue
                                album_id = album.get("browseId")
                                if album_id:
                                    try:
                                        album_detail = ytmusic.get_album(album_id)
                                        if album_detail and isinstance(album_detail, dict):
                                            album_entry = {
                                                "title": album_detail.get("title") or "",
                                                "browseId": album_id,
                                                "artists": album_detail.get("artists") or [],
                                                "thumbnails": album_detail.get("thumbnails") or [],
                                                "year": album_detail.get("year") or "",
                                                "type": album_detail.get("type") or "Album",
                                                "artist_bid": artist_id,
                                                "tracks": album_detail.get("tracks") or []
                                            }
                                            albums_data.append(album_entry)
                                    except Exception as album_err:
                                        logger.warning(f"Album fetch error: {album_err}")

                # Get singles using get_artist_albums
                singles_section = artist_info.get("singles")
                if singles_section and isinstance(singles_section, dict):
                    params = singles_section.get("params")
                    browse_id = singles_section.get("browseId")
                    if params and browse_id:
                        try:
                            all_singles = ytmusic.get_artist_albums(browse_id, params) or []
                            for single in all_singles[:10]:  # Limit to 10 singles
                                if not isinstance(single, dict):
                                    continue
                                single_id = single.get("browseId")
                                if not single_id:
                                    continue
                                try:
                                    single_detail = ytmusic.get_album(single_id)
                                    if single_detail and isinstance(single_detail, dict):
                                        single_entry = {
                                            "title": single_detail.get("title") or "",
                                            "browseId": single_id,
                                            "artists": single_detail.get("artists") or [],
                                            "thumbnails": single_detail.get("thumbnails") or [],
                                            "year": single_detail.get("year") or "",
                                            "type": single_detail.get("type") or "Single",
                                            "artist_bid": artist_id,
                                            "tracks": single_detail.get("tracks") or []
                                        }
                                        albums_data.append(single_entry)
                                except Exception as single_err:
                                    logger.warning(f"Single detail fetch error: {single_err}")
                        except Exception as singles_err:
                            logger.warning(f"get_artist_albums for singles error: {singles_err}")

            except Exception as artist_err:
                logger.warning(f"Artist fetch error for {artist_id}: {artist_err}")

        result = {
            "keyword": q,
            "country": country,
            "artists": artists_data,
            "songs": songs_search,
            "albums": albums_search,
            "albums2": albums_data  # Artist discography (like sample folder)
        }

        # Cache for 30 minutes
        cache_set(cache_key, result, ttl=1800)

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
