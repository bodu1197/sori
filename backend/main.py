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

        # 1. Search for artists
        artists_search = ytmusic.search(q, filter="artists", limit=5)

        # 2. Search for songs (for exact title matches)
        songs_search = ytmusic.search(q, filter="songs", limit=50)

        # 3. Search for albums
        albums_search = ytmusic.search(q, filter="albums", limit=20)

        # 4. For each artist, get complete discography
        artists_data = []
        albums_data = []

        for artist in artists_search[:3]:  # Top 3 artists only
            artist_id = artist.get("browseId")
            if artist_id:
                try:
                    artist_info = ytmusic.get_artist(artist_id)

                    # Extract artist details
                    artist_entry = {
                        "artist": artist_info.get("name", artist.get("artist", "")),
                        "browseId": artist_id,
                        "thumbnails": artist_info.get("thumbnails", []),
                        "description": artist_info.get("description", ""),
                        "subscribers": artist_info.get("subscribers", "")
                    }
                    artists_data.append(artist_entry)

                    # Extract songs from artist
                    if "songs" in artist_info and artist_info["songs"].get("results"):
                        for song in artist_info["songs"]["results"]:
                            song["artist_bid"] = artist_id
                            albums_data.append(song)

                    # Extract albums
                    if "albums" in artist_info and artist_info["albums"].get("results"):
                        for album in artist_info["albums"]["results"]:
                            album_id = album.get("browseId")
                            if album_id:
                                try:
                                    album_detail = ytmusic.get_album(album_id)
                                    album_entry = {
                                        "title": album_detail.get("title", ""),
                                        "browseId": album_id,
                                        "artists": album_detail.get("artists", []),
                                        "thumbnails": album_detail.get("thumbnails", []),
                                        "year": album_detail.get("year", ""),
                                        "type": album_detail.get("type", "Album"),
                                        "artist_bid": artist_id,
                                        "tracks": album_detail.get("tracks", [])
                                    }
                                    albums_data.append(album_entry)
                                except Exception as album_err:
                                    logger.warning(f"Album fetch error: {album_err}")

                    # Extract singles
                    if "singles" in artist_info and artist_info["singles"].get("results"):
                        for single in artist_info["singles"]["results"]:
                            single_id = single.get("browseId")
                            if single_id:
                                try:
                                    single_detail = ytmusic.get_album(single_id)
                                    single_entry = {
                                        "title": single_detail.get("title", ""),
                                        "browseId": single_id,
                                        "artists": single_detail.get("artists", []),
                                        "thumbnails": single_detail.get("thumbnails", []),
                                        "year": single_detail.get("year", ""),
                                        "type": single_detail.get("type", "Single"),
                                        "artist_bid": artist_id,
                                        "tracks": single_detail.get("tracks", [])
                                    }
                                    albums_data.append(single_entry)
                                except Exception as single_err:
                                    logger.warning(f"Single fetch error: {single_err}")

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
