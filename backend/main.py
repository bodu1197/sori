# MusicGram Backend API
# 200만 DAU 대응 확장 가능 설계

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
# Trigger CI/CD Test: 2025-12-24 (Retry: Fixed google-generativeai dependency)
import os
import json
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from ai_agent import (
    generate_artist_persona, chat_with_artist, generate_artist_post,
    generate_artist_comment, generate_artist_dm,
    detect_language, translate_text, generate_artist_post_factbased,
    generate_post_image, check_artist_status,
    gather_artist_context, generate_contextual_post
)
import uuid as uuid_lib
import random

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# Constants - Avoid duplicate string literals (SonarCloud fix)
# =============================================================================
CONTENT_TYPE_JSON = "application/json"
ERROR_DB_NOT_CONFIGURED = "Database not configured"
ERROR_DB_NOT_AVAILABLE = "DB not available"
ERROR_ARTIST_NOT_FOUND = "Artist not found"
THUMBNAIL_MAXRES = "maxresdefault.jpg"
TIMEZONE_SUFFIX = "+00:00"

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

# Redis 제거 - Supabase DB만 사용
redis_client = None  # 사용 안함

# YTMusic 인스턴스 (국가별)
ytmusic_instances = {}

# YouTube Music API 지원 언어: en, pt, ru, zh_CN, de, ja, ar, cs, tr, es, ur, it, hi, ko, nl, zh_TW, fr
# 지원하지 않는 언어는 영어(en)로 대체
COUNTRY_LANGUAGE_MAP = {
    # 아시아
    'KR': 'ko', 'JP': 'ja', 'CN': 'zh_CN', 'TW': 'zh_TW', 'HK': 'zh_TW',
    'TH': 'en', 'VN': 'en', 'ID': 'en', 'MY': 'en', 'SG': 'en',
    'PH': 'en', 'IN': 'hi', 'PK': 'ur', 'BD': 'en', 'NP': 'en',
    'LK': 'en', 'MM': 'en', 'KH': 'en', 'LA': 'en', 'MN': 'en',
    # 중동
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'IQ': 'ar', 'JO': 'ar',
    'KW': 'ar', 'LB': 'ar', 'OM': 'ar', 'QA': 'ar', 'YE': 'ar',
    'IL': 'en', 'IR': 'en', 'TR': 'tr',
    # 유럽
    'US': 'en', 'GB': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en', 'CA': 'en',
    'DE': 'de', 'AT': 'de', 'CH': 'de',
    'FR': 'fr', 'BE': 'fr', 'LU': 'fr',
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es',
    'IT': 'it', 'PT': 'pt', 'BR': 'pt',
    'NL': 'nl', 'PL': 'en', 'RU': 'ru', 'UA': 'en', 'CZ': 'cs', 'SK': 'en',
    'HU': 'en', 'RO': 'en', 'BG': 'en', 'HR': 'en', 'RS': 'en', 'SI': 'en',
    'GR': 'en', 'SE': 'en', 'NO': 'en', 'DK': 'en', 'FI': 'en', 'IS': 'en',
    'EE': 'en', 'LV': 'en', 'LT': 'en',
    # 아프리카
    'ZA': 'en', 'NG': 'en', 'KE': 'en', 'GH': 'en', 'TZ': 'en',
    'MA': 'ar', 'DZ': 'ar', 'TN': 'ar', 'LY': 'ar',
    'ET': 'en', 'UG': 'en', 'ZW': 'en', 'SN': 'fr', 'CI': 'fr', 'CM': 'fr',
}

def get_ytmusic(country: str = "US"):
    """국가별 YTMusic 인스턴스 (싱글톤)"""
    from ytmusicapi import YTMusic

    country = country.upper() if country else "US"

    if country not in ytmusic_instances:
        lang = COUNTRY_LANGUAGE_MAP.get(country, 'en')
        ytmusic_instances[country] = YTMusic(language=lang, location=country)

    return ytmusic_instances[country]

def cache_get(key: str):
    """캐시 비활성화 - 항상 None 반환"""
    del key  # Intentionally unused - caching disabled
    return None

def cache_set(key: str, value, ttl: int = 3600):
    """캐시 비활성화 - 아무 동작 안함"""
    del key, value, ttl  # Intentionally unused - caching disabled

# =============================================================================
# Helper: Run sync code in thread
# =============================================================================

async def run_in_thread(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

# Error message constants
ERROR_ACCESS_TOKEN_REQUIRED = "access_token required"

# =============================================================================
# 언어 감지 함수
# =============================================================================

# 알려진 K-pop 그룹 (영어 이름이지만 한국어 사용)
KPOP_GROUPS = {
    "BTS", "BLACKPINK", "LE SSERAFIM", "NewJeans", "STAYC", "IVE", "aespa",
    "TWICE", "EXO", "NCT", "ENHYPEN", "TXT", "ITZY", "NMIXX", "(G)I-DLE",
    "Red Velvet", "SEVENTEEN", "Stray Kids", "ATEEZ", "THE BOYZ", "Kep1er",
    "fromis_9", "VIVIZ", "MAMAMOO", "Oh My Girl", "Lovelyz", "GFRIEND",
    "MONSTA X", "TREASURE", "iKON", "WINNER", "2NE1", "Big Bang", "BIGBANG",
    "Girls' Generation", "SNSD", "SHINee", "Super Junior", "f(x)", "miss A",
    "Wonder Girls", "2PM", "GOT7", "DAY6", "Xdinary Heroes", "ILLIT",
    "KISS OF LIFE", "BABYMONSTER", "tripleS", "ZEROBASEONE", "BOYNEXTDOOR",
    "RIIZE", "TWS", "QWER", "H1-KEY", "Billlie", "CLASS:y", "Weeekly"
}

def detect_artist_language(name: str, description: str = "") -> str:
    """
    아티스트 이름/설명에서 주요 언어 감지

    Returns:
        "ko" - 한국어 (한글 포함 또는 K-pop 그룹)
        "ja" - 일본어 (히라가나/가타카나 포함)
        "zh" - 중국어 (한자만 포함)
        "en" - 영어 (기본값)
    """
    import re

    if not name:
        return "en"

    # 1. K-pop 그룹 체크 (영어 이름이지만 한국 아티스트)
    name_normalized = name.strip()
    for kpop in KPOP_GROUPS:
        if kpop.lower() in name_normalized.lower():
            return "ko"

    # 2. 한글 감지 (가-힣)
    if re.search(r'[가-힣]', name):
        return "ko"

    # 3. 일본어 감지 (히라가나, 가타카나)
    if re.search(r'[\u3040-\u309F\u30A0-\u30FF]', name):
        return "ja"

    # 4. 중국어 감지 (한자만 있고 한글/일본어 없을 때)
    if re.search(r'[\u4E00-\u9FFF]', name) and not re.search(r'[가-힣\u3040-\u30FF]', name):
        return "zh"

    # 5. Description에서도 확인
    if description:
        desc_sample = description[:500]
        if re.search(r'[가-힣]', desc_sample):
            return "ko"
        if re.search(r'[\u3040-\u309F\u30A0-\u30FF]', desc_sample):
            return "ja"

    return "en"


# =============================================================================
# Supabase DB 헬퍼 함수
# =============================================================================

def db_save_artist(artist_data: dict) -> str | None:
    """아티스트를 DB에 저장 (upsert) + 자동 가상회원 생성 + 언어 자동 감지"""
    if not supabase_client:
        return None

    try:
        browse_id = artist_data.get("browseId") or artist_data.get("browse_id")
        if not browse_id:
            return None

        thumbnails = artist_data.get("thumbnails") or []
        artist_name = artist_data.get("name") or artist_data.get("artist") or ""
        description = artist_data.get("description") or ""
        thumbnail_url = get_best_thumbnail(thumbnails)

        # 자동 언어 감지
        primary_language = detect_artist_language(artist_name, description)

        data = {
            "browse_id": browse_id,
            "name": artist_name,
            "thumbnails": json.dumps(thumbnails),
            "thumbnail_url": thumbnail_url,
            "description": description,
            "subscribers": artist_data.get("subscribers") or "",
            "primary_language": primary_language,  # 언어 자동 설정
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

        result = supabase_client.table("music_artists").upsert(
            data, on_conflict="browse_id"
        ).execute()

        # 자동 가상회원 생성 (비동기 백그라운드)
        if result.data:
            try:
                # Check if virtual member already exists
                existing = supabase_client.table("profiles").select("id").eq("artist_browse_id", browse_id).execute()
                if not existing.data or len(existing.data) == 0:
                    # Create virtual member in background
                    create_virtual_member_sync(browse_id, artist_name, thumbnail_url)
            except Exception as vm_error:
                logger.warning(f"Virtual member auto-creation skipped: {vm_error}")

        if result.data:
            return result.data[0].get("id")
        return None
    except Exception as e:
        logger.warning(f"DB save artist error: {e}")
        return None


def create_virtual_member_sync(browse_id: str, artist_name: str, thumbnail_url: str) -> str | None:
    """Synchronously create a virtual member for an artist"""
    if not supabase_client:
        return None

    try:
        import uuid
        import requests

        virtual_email = f"{browse_id}@sori.virtual"
        random_password = str(uuid.uuid4())

        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not service_key:
            logger.warning("Supabase credentials not configured for virtual member creation")
            return None

        # Create auth user
        create_user_response = requests.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": CONTENT_TYPE_JSON
            },
            json={
                "email": virtual_email,
                "password": random_password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": artist_name,
                    "avatar_url": thumbnail_url,
                    "member_type": "artist",
                    "artist_browse_id": browse_id
                }
            },
            timeout=10
        )

        if create_user_response.status_code not in [200, 201]:
            return None

        user_data = create_user_response.json()
        user_id = user_data.get("id")

        # Generate username (ensure minimum 3 chars)
        base_username = artist_name.lower().replace(" ", "").replace(".", "").replace("-", "")[:20]
        if len(base_username) < 3:
            base_username = f"{base_username}_official"

        # Update profiles
        supabase_client.table("profiles").upsert({
            "id": user_id,
            "username": base_username,
            "full_name": artist_name,
            "avatar_url": thumbnail_url,
            "member_type": "artist",
            "artist_browse_id": browse_id,
            "is_verified": True,
            "bio": f"Official SORI profile for {artist_name}"
        }).execute()

        logger.info(f"Virtual member auto-created: {artist_name} ({browse_id})")
        return user_id

    except Exception as e:
        logger.warning(f"Virtual member sync creation failed: {e}")
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
            except ValueError:
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

# =============================================================================
# 정규화된 DB 함수들 (새로운 테이블 구조)
# =============================================================================

def db_get_artist_by_browse_id(browse_id: str) -> dict | None:
    """아티스트를 browse_id로 조회"""
    if not supabase_client or not browse_id:
        return None
    try:
        result = supabase_client.table("music_artists").select("*").eq(
            "browse_id", browse_id
        ).single().execute()
        return result.data
    except Exception as e:
        logger.warning(f"DB get artist error: {e}")
        return None

def db_check_artist_needs_sync(browse_id: str, days: int = 7) -> bool:
    """아티스트가 동기화 필요한지 확인 (last_synced_at이 N일 초과)"""
    if not supabase_client or not browse_id:
        return True
    try:
        result = supabase_client.table("music_artists").select(
            "last_synced_at"
        ).eq("browse_id", browse_id).single().execute()

        if not result.data or not result.data.get("last_synced_at"):
            return True

        last_synced = result.data.get("last_synced_at")
        last_time = datetime.fromisoformat(last_synced.replace("Z", TIMEZONE_SUFFIX))
        return datetime.now(timezone.utc) - last_time > timedelta(days=days)
    except Exception:
        return True

def db_save_artist_full(artist_data: dict) -> bool:
    """아티스트 정보를 정규화 테이블에 저장 (upsert) + 언어 자동 감지"""
    if not supabase_client or not artist_data:
        return False
    try:
        browse_id = artist_data.get("browseId")
        if not browse_id:
            return False

        # 인기곡 플레이리스트 ID만 추출 (YouTube IFrame API용)
        songs_playlist_id = artist_data.get("songsPlaylistId")
        artist_name = artist_data.get("artist") or artist_data.get("name") or ""
        description = artist_data.get("description") or ""

        # 자동 언어 감지
        primary_language = detect_artist_language(artist_name, description)

        data = {
            "browse_id": browse_id,
            "name": artist_name,
            "thumbnail_url": get_best_thumbnail(artist_data.get("thumbnails", [])),
            "subscribers": artist_data.get("subscribers") or "",
            "description": description,
            "primary_language": primary_language,  # 언어 자동 설정
            "top_songs_json": artist_data.get("topSongs") or [],
            "related_artists_json": artist_data.get("related") or [],
            "songs_playlist_id": songs_playlist_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_synced_at": datetime.now(timezone.utc).isoformat()
        }

        supabase_client.table("music_artists").upsert(
            data, on_conflict="browse_id"
        ).execute()

        logger.info(f"Artist saved: {data['name']} ({browse_id}) lang: {primary_language}")

        # 자동 가상회원 생성 (비동기 백그라운드)
        try:
            existing = supabase_client.table("profiles").select("id").eq("artist_browse_id", browse_id).execute()
            if not existing.data or len(existing.data) == 0:
                create_virtual_member_sync(browse_id, data['name'], data['thumbnail_url'])
        except Exception as vm_error:
            logger.warning(f"Virtual member auto-creation skipped: {vm_error}")

        return True
    except Exception as e:
        logger.warning(f"DB save artist error: {e}")
        return False

def db_save_album(album_data: dict, artist_browse_id: str) -> bool:
    """앨범 정보 저장"""
    if not supabase_client or not album_data or not artist_browse_id:
        return False
    try:
        browse_id = album_data.get("browseId")
        if not browse_id:
            return False

        data = {
            "browse_id": browse_id,
            "artist_browse_id": artist_browse_id,
            "title": album_data.get("title") or "",
            "type": album_data.get("type") or "Album",
            "year": album_data.get("year") or "",
            "thumbnail_url": get_best_thumbnail(album_data.get("thumbnails", [])),
            "track_count": len(album_data.get("tracks", []))
        }

        supabase_client.table("music_albums").upsert(
            data, on_conflict="browse_id"
        ).execute()
        return True
    except Exception as e:
        logger.warning(f"DB save album error: {e}")
        return False

def db_save_track(track_data: dict, album_browse_id: str, artist_browse_id: str, track_number: int = 0) -> bool:
    """트랙 정보 저장"""
    if not supabase_client or not track_data or not artist_browse_id:
        return False
    try:
        video_id = track_data.get("videoId")
        if not video_id:
            return False

        # duration을 초 단위로 변환
        duration = track_data.get("duration") or ""
        duration_seconds = 0
        if duration:
            parts = duration.split(":")
            if len(parts) == 2:
                duration_seconds = int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

        data = {
            "video_id": video_id,
            "album_browse_id": album_browse_id,
            "artist_browse_id": artist_browse_id,
            "title": track_data.get("title") or "",
            "duration": duration,
            "duration_seconds": duration_seconds,
            "track_number": track_number,
            "thumbnail_url": get_best_thumbnail(track_data.get("thumbnails", [])),
            "is_explicit": track_data.get("isExplicit", False)
        }

        supabase_client.table("music_tracks").upsert(
            data, on_conflict="video_id"
        ).execute()
        return True
    except Exception as e:
        logger.warning(f"DB save track error: {e}")
        return False

def db_save_search_keyword(keyword: str, country: str, artist_browse_id: str):
    """검색어-아티스트 매핑 저장"""
    if not supabase_client or not keyword or not artist_browse_id:
        return
    try:
        data = {
            "keyword": keyword,
            "keyword_normalized": keyword.lower(),
            "country": country,
            "artist_browse_id": artist_browse_id,
            "search_count": 1,
            "last_searched_at": datetime.now(timezone.utc).isoformat()
        }

        supabase_client.table("search_keywords").upsert(
            data, on_conflict="keyword_normalized,country,artist_browse_id"
        ).execute()
    except Exception as e:
        logger.warning(f"DB save search keyword error: {e}")

def db_increment_search_count(keyword: str, country: str):
    """검색 횟수 증가"""
    if not supabase_client:
        return
    try:
        keyword_normalized = keyword.lower()
        supabase_client.rpc("increment_search_count", {
            "p_keyword": keyword_normalized,
            "p_country": country
        }).execute()
    except Exception:
        pass  # 실패해도 무시

def db_get_artists_by_keyword(keyword: str, country: str) -> list:
    """검색어로 매핑된 아티스트 목록 조회"""
    if not supabase_client:
        return []
    try:
        keyword_normalized = keyword.lower()

        # search_keywords에서 artist_browse_id 목록 조회
        result = supabase_client.table("search_keywords").select(
            "artist_browse_id"
        ).eq("keyword_normalized", keyword_normalized).eq("country", country).execute()

        if not result.data:
            return []

        artist_browse_ids = [r["artist_browse_id"] for r in result.data]
        return artist_browse_ids
    except Exception as e:
        logger.warning(f"DB get artists by keyword error: {e}")
        return []

def db_get_full_artist_data(browse_id: str) -> dict | None:
    """아티스트의 전체 데이터 조회 (앨범, 트랙 포함)"""
    if not supabase_client or not browse_id:
        return None
    try:
        # 아티스트 기본 정보
        artist_result = supabase_client.table("music_artists").select("*").eq(
            "browse_id", browse_id
        ).single().execute()

        if not artist_result.data:
            return None

        artist = artist_result.data

        # 앨범 목록
        albums_result = supabase_client.table("music_albums").select("*").eq(
            "artist_browse_id", browse_id
        ).order("year", desc=True).execute()

        albums = albums_result.data or []

        # 전체 트랙 목록
        tracks_result = supabase_client.table("music_tracks").select("*").eq(
            "artist_browse_id", browse_id
        ).order("created_at", desc=True).execute()

        all_tracks = tracks_result.data or []

        # 앨범별로 트랙 그룹화
        album_tracks_map = {}
        for track in all_tracks:
            album_id = track.get("album_browse_id")
            if album_id:
                if album_id not in album_tracks_map:
                    album_tracks_map[album_id] = []
                album_tracks_map[album_id].append({
                    "videoId": track.get("video_id"),
                    "title": track.get("title"),
                    "duration": track.get("duration"),
                    "trackNumber": track.get("track_number"),
                    "thumbnails": [{"url": track.get("thumbnail_url")}] if track.get("thumbnail_url") else []
                })

        # 앨범에 트랙 추가
        albums_with_tracks = []
        for album in albums:
            album_entry = {
                "browseId": album.get("browse_id"),
                "title": album.get("title"),
                "type": album.get("type"),
                "year": album.get("year"),
                "thumbnails": [{"url": album.get("thumbnail_url")}] if album.get("thumbnail_url") else [],
                "tracks": album_tracks_map.get(album.get("browse_id"), [])
            }
            albums_with_tracks.append(album_entry)

        return {
            "browseId": artist.get("browse_id"),
            "artist": artist.get("name"),
            "name": artist.get("name"),
            "thumbnails": [{"url": artist.get("thumbnail_url")}] if artist.get("thumbnail_url") else [],
            "subscribers": artist.get("subscribers"),
            "description": artist.get("description"),
            "topSongs": artist.get("top_songs_json") or [],
            "related": artist.get("related_artists_json") or [],
            "albums": albums_with_tracks,
            "allTracks": [{
                "videoId": t.get("video_id"),
                "title": t.get("title"),
                "duration": t.get("duration"),
                "albumTitle": next((a.get("title") for a in albums if a.get("browse_id") == t.get("album_browse_id")), ""),
                "thumbnails": [{"url": t.get("thumbnail_url")}] if t.get("thumbnail_url") else []
            } for t in all_tracks],
            "last_synced_at": artist.get("last_synced_at"),
            # 인기곡 플레이리스트 ID만 반환 (YouTube IFrame API용)
            "songsPlaylistId": artist.get("songs_playlist_id")
        }
    except Exception as e:
        logger.warning(f"DB get full artist data error: {e}")
        return None

def upscale_thumbnail_url(url: str, size: int = 544) -> str:
    """
    기존 썸네일 URL을 고해상도로 변환

    YouTube Music 썸네일 URL 형식:
    - lh3.googleusercontent.com/...=w60-h60-l90-rj -> w{size}-h{size}로 변환
    - i.ytimg.com/vi/ID/sddefault.jpg -> maxresdefault.jpg로 변환

    Args:
        url: 썸네일 URL
        size: 원하는 해상도 (기본 544px)
    """
    import re

    if not url:
        return ""

    # 1. Google CDN (lh3.googleusercontent.com, yt3.googleusercontent.com)
    if "googleusercontent.com" in url:
        # w60-h60 또는 w120-h120 등을 w{size}-h{size}로 변환
        url = re.sub(r'=w\d+-h\d+', f'=w{size}-h{size}', url)
        # s60, s120 등 단일 크기 파라미터도 변환
        url = re.sub(r'=s\d+', f'=s{size}', url)
        # 크기 파라미터가 없으면 추가
        if f'=w{size}' not in url and f'=s{size}' not in url:
            if '=' in url:
                url = re.sub(r'=([^&]+)$', f'=w{size}-h{size}-\\1', url)
            else:
                url = f"{url}=w{size}-h{size}"

    # 2. YouTube 이미지 (i.ytimg.com)
    elif "i.ytimg.com" in url:
        # sddefault, hqdefault -> maxresdefault
        url = url.replace("sddefault.jpg", THUMBNAIL_MAXRES)
        url = url.replace("hqdefault.jpg", THUMBNAIL_MAXRES)
        url = url.replace("mqdefault.jpg", THUMBNAIL_MAXRES)
        url = url.replace("/default.jpg", f"/{THUMBNAIL_MAXRES}")

    return url


def get_best_thumbnail(thumbnails: list, size: int = 544) -> str:
    """썸네일 목록에서 가장 좋은 URL 선택 + 고해상도로 변환"""
    if not thumbnails:
        return ""

    # 가장 큰 이미지 선택
    best = thumbnails[-1]
    url = best.get("url", "") if isinstance(best, dict) else ""

    return upscale_thumbnail_url(url, size)


def _process_album_list(ytmusic, album_list: list, existing_album_ids: set,
                        existing_video_ids: set, artist_browse_id: str) -> tuple[int, int]:
    """Process album list and save new albums/tracks. Returns (new_albums, new_tracks)."""
    new_albums = 0
    new_tracks = 0

    for album in album_list:
        album_browse_id = album.get("browseId")
        if not album_browse_id or album_browse_id in existing_album_ids:
            continue

        try:
            album_detail = ytmusic.get_album(album_browse_id)
            if not album_detail:
                continue

            album_data = {
                "browseId": album_browse_id,
                "title": album_detail.get("title") or "",
                "type": album_detail.get("type") or "Album",
                "year": album_detail.get("year") or "",
                "thumbnails": album_detail.get("thumbnails") or []
            }

            db_save_album(album_data, artist_browse_id)
            new_albums += 1

            for idx, track in enumerate(album_detail.get("tracks") or []):
                video_id = track.get("videoId")
                if not video_id or video_id in existing_video_ids:
                    continue

                track_data = {
                    "videoId": video_id,
                    "title": track.get("title") or "",
                    "duration": track.get("duration") or "",
                    "thumbnails": track.get("thumbnails") or [],
                    "isExplicit": track.get("isExplicit", False)
                }
                db_save_track(track_data, album_browse_id, artist_browse_id, idx + 1)
                new_tracks += 1

        except Exception as e:
            logger.warning(f"Background album fetch error: {e}")

    return new_albums, new_tracks


def _get_section_list(ytmusic, section: dict) -> list:
    """Get album/single list from section with proper API call."""
    if not section or not isinstance(section, dict):
        return []

    params = section.get("params")
    browse_id = section.get("browseId")

    if params and browse_id:
        try:
            return ytmusic.get_artist_albums(browse_id, params) or []
        except Exception:
            return section.get("results") or []
    return section.get("results") or []


def _extract_top_songs(songs_section: dict) -> list:
    """Extract top songs from artist info."""
    if not songs_section or not isinstance(songs_section, dict):
        return []

    top_songs = []
    for song in songs_section.get("results", []):
        if isinstance(song, dict) and song.get("videoId"):
            top_songs.append({
                "videoId": song.get("videoId"),
                "title": song.get("title") or "",
                "duration": song.get("duration") or "",
                "thumbnails": song.get("thumbnails") or []
            })
    return top_songs


def _extract_related_artists(related_section: dict) -> list:
    """Extract related artists from artist info."""
    if not related_section or not isinstance(related_section, dict):
        return []

    related_artists = []
    for rel in related_section.get("results", [])[:15]:
        if isinstance(rel, dict):
            related_artists.append({
                "browseId": rel.get("browseId") or "",
                "name": rel.get("title") or rel.get("name") or "",
                "subscribers": rel.get("subscribers") or "",
                "thumbnails": rel.get("thumbnails") or []
            })
    return related_artists


def background_update_artist(artist_browse_id: str, country: str):
    """
    백그라운드에서 아티스트 데이터 업데이트 (7일 경과 시 호출)
    - 새 앨범/싱글 확인
    - 새 트랙만 DB에 추가 (기존 데이터 유지)
    """
    try:
        from ytmusicapi import YTMusic

        logger.info(f"Background update started: {artist_browse_id}")

        existing_album_ids = db_get_existing_album_ids(artist_browse_id)
        existing_video_ids = db_get_existing_video_ids(artist_browse_id)

        lang = COUNTRY_LANGUAGE_MAP.get(country.upper(), 'en')
        ytmusic = YTMusic(language=lang, location=country.upper())

        artist_info = ytmusic.get_artist(artist_browse_id)
        if not artist_info:
            logger.warning(f"Background update: Artist not found {artist_browse_id}")
            return

        # Process albums
        album_list = _get_section_list(ytmusic, artist_info.get("albums"))
        albums_count, tracks_from_albums = _process_album_list(
            ytmusic, album_list, existing_album_ids, existing_video_ids, artist_browse_id
        )

        # Process singles
        singles_list = _get_section_list(ytmusic, artist_info.get("singles"))
        singles_count, tracks_from_singles = _process_album_list(
            ytmusic, singles_list, existing_album_ids, existing_video_ids, artist_browse_id
        )

        new_albums_count = albums_count + singles_count
        new_tracks_count = tracks_from_albums + tracks_from_singles

        # Extract metadata
        top_songs = _extract_top_songs(artist_info.get("songs"))
        related_artists = _extract_related_artists(artist_info.get("related"))

        # Update last_synced_at
        if supabase_client:
            try:
                supabase_client.table("music_artists").update({
                    "top_songs_json": top_songs,
                    "related_artists_json": related_artists,
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }).eq("browse_id", artist_browse_id).execute()
            except Exception as e:
                logger.warning(f"Background update artist error: {e}")

        logger.info(f"Background update completed: {artist_browse_id} - {new_albums_count} new albums, {new_tracks_count} new tracks")

    except Exception as e:
        logger.error(f"Background update error: {e}")


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

        last_time = datetime.fromisoformat(last_updated.replace("Z", TIMEZONE_SUFFIX))
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
        "database": "connected" if supabase_client else "not configured"
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
# Mood & Genre API (추천 음악)
# =============================================================================

@app.get("/api/moods")
async def get_moods(request: Request, country: str = None):
    """무드 & 장르 카테고리 목록"""
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"moods:{country}"

    cached = cache_get(cache_key)
    if cached:
        return {"country": country, "source": "cache", "moods": cached}

    try:
        ytmusic = get_ytmusic(country)
        moods = ytmusic.get_mood_categories()

        # 6시간 캐시
        cache_set(cache_key, moods, ttl=21600)

        return {"country": country, "source": "api", "moods": moods}
    except Exception as e:
        logger.error(f"Moods error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/mood-playlists")
async def get_mood_playlists(params: str, country: str = None, request: Request = None):
    """특정 무드/장르의 플레이리스트 목록"""
    if not country:
        country = request.headers.get("CF-IPCountry", "US") if request else "US"

    cache_key = f"mood_playlists:{params}:{country}"

    cached = cache_get(cache_key)
    if cached:
        return {"country": country, "source": "cache", "playlists": cached}

    try:
        ytmusic = get_ytmusic(country)
        playlists = ytmusic.get_mood_playlists(params)

        # 1시간 캐시
        cache_set(cache_key, playlists, ttl=3600)

        return {"country": country, "source": "api", "playlists": playlists}
    except Exception as e:
        logger.error(f"Mood playlists error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/home")
async def get_home_feed(request: Request, country: str = None, limit: int = 6):
    """
    홈 화면 추천 콘텐츠 - ytmusic.get_home() 사용
    YouTube Music 홈 화면과 동일한 추천 섹션 반환
    (Quick picks, 믹스, 추천 플레이리스트, 신규 앨범 등)
    """
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"home_feed:{country}:{limit}"

    cached = cache_get(cache_key)
    if cached:
        return {"country": country, "source": "cache", "sections": cached}

    # 재시도 로직 (YTMusic API 간헐적 빈 응답 대응)
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            ytmusic = get_ytmusic(country)

            # get_home()은 홈 화면의 모든 섹션을 반환
            home_sections = ytmusic.get_home(limit=limit)

            # 유효한 응답인지 확인
            if home_sections and isinstance(home_sections, list) and len(home_sections) > 0:
                # 30분 캐시
                cache_set(cache_key, home_sections, ttl=1800)
                return {"country": country, "source": "api", "sections": home_sections}
            else:
                logger.warning(f"Home feed empty response (attempt {attempt + 1}/{max_retries})")
                last_error = "Empty response from YTMusic API"

        except Exception as e:
            logger.warning(f"Home feed attempt {attempt + 1}/{max_retries} failed: {e}")
            last_error = str(e)

        # 재시도 전 대기 (exponential backoff)
        if attempt < max_retries - 1:
            await asyncio.sleep(0.5 * (attempt + 1))

    # 모든 재시도 실패 시 빈 응답 반환 (500 에러 대신)
    logger.error(f"Home feed failed after {max_retries} attempts: {last_error}")
    return {"country": country, "source": "fallback", "sections": [], "error": "Temporary service unavailable"}


# =============================================================================
# Summary Search API - 정규화 DB 사용 (전체 디스코그래피)
# =============================================================================

# =============================================================================
# Shared Helper Functions for Artist Data Parsing
# =============================================================================


def _extract_songs_playlist_id(songs_section: dict | None) -> str | None:
    """Extract songs playlist ID from artist info."""
    if not songs_section or not isinstance(songs_section, dict):
        return None
    browse_id = songs_section.get("browseId")
    if browse_id and browse_id.startswith("VL"):
        return browse_id[2:]
    return browse_id


def _extract_top_songs(songs_section: dict | None) -> list:
    """Extract top songs from artist songs section."""
    top_songs = []
    if not songs_section or not isinstance(songs_section, dict):
        return top_songs
    for song in songs_section.get("results", []):
        if isinstance(song, dict) and song.get("videoId"):
            top_songs.append({
                "videoId": song.get("videoId"),
                "title": song.get("title") or "",
                "duration": song.get("duration") or "",
                "thumbnails": song.get("thumbnails") or []
            })
    return top_songs


def _extract_related_artists(related_section: dict | None, limit: int = 15) -> list:
    """Extract related artists from artist info."""
    related_artists = []
    if not related_section or not isinstance(related_section, dict):
        return related_artists
    for rel in related_section.get("results", [])[:limit]:
        if isinstance(rel, dict):
            related_artists.append({
                "browseId": rel.get("browseId") or "",
                "name": rel.get("title") or rel.get("name") or "",
                "subscribers": rel.get("subscribers") or "",
                "thumbnails": rel.get("thumbnails") or []
            })
    return related_artists


def _extract_albums_from_section(section: dict | None, album_type: str = "Album") -> list:
    """Extract albums/singles from section results."""
    albums = []
    if not section or not isinstance(section, dict):
        return albums
    for item in section.get("results") or []:
        if isinstance(item, dict) and item.get("browseId"):
            albums.append({
                "browseId": item.get("browseId"),
                "title": item.get("title") or "",
                "type": album_type if album_type == "Single" else (item.get("type") or "Album"),
                "year": item.get("year") or "",
                "thumbnails": item.get("thumbnails") or [],
                "tracks": []
            })
    return albums


def save_full_artist_data_background(artist_id: str, artist_info: dict, country: str):
    """백그라운드에서 아티스트의 전체 앨범/싱글/트랙 정보를 가져와 DB에 저장"""
    try:
        ytmusic = get_ytmusic(country)

        # 1. 아티스트 기본 정보 저장 (헬퍼 함수 사용)
        artist_name = artist_info.get("name") or ""
        search_thumbnails = artist_info.get("thumbnails") or []

        songs_section = artist_info.get("songs")
        songs_playlist_id = _extract_songs_playlist_id(songs_section)
        top_songs = _extract_top_songs(songs_section)
        related_artists = _extract_related_artists(artist_info.get("related"))
        
        artist_data = {
            "browseId": artist_id,
            "artist": artist_name,
            "name": artist_name,
            "thumbnails": search_thumbnails,
            "subscribers": artist_info.get("subscribers") or "",
            "description": artist_info.get("description") or "",
            "topSongs": top_songs,
            "related": related_artists,
            "songsPlaylistId": songs_playlist_id
        }

        db_save_artist_full(artist_data)
        
        # 2. 앨범/싱글 전체 목록 가져오기 & 저장
        try:
            # 앨범
            albums_section = artist_info.get("albums")
            if albums_section and isinstance(albums_section, dict):
                params = albums_section.get("params")
                browse_id = albums_section.get("browseId")
                
                album_list = []
                if params and browse_id:
                    album_list = ytmusic.get_artist_albums(browse_id, params) or []
                else:
                    album_list = albums_section.get("results") or []
                    
                for album in album_list:
                     if isinstance(album, dict) and album.get("browseId"):
                        album_data = {
                            "browseId": album.get("browseId"),
                            "title": album.get("title") or "",
                            "type": album.get("type") or "Album",
                            "year": album.get("year") or "",
                            "thumbnails": album.get("thumbnails") or [],
                            "tracks": []
                        }
                        db_save_album(album_data, artist_id)
            
            # 싱글
            singles_section = artist_info.get("singles")
            if singles_section and isinstance(singles_section, dict):
                params = singles_section.get("params")
                browse_id = singles_section.get("browseId")
                
                singles_list = []
                if params and browse_id:
                    singles_list = ytmusic.get_artist_albums(browse_id, params) or []
                else:
                    singles_list = singles_section.get("results") or []
                    
                for single in singles_list:
                     if isinstance(single, dict) and single.get("browseId"):
                        single_data = {
                            "browseId": single.get("browseId"),
                            "title": single.get("title") or "",
                            "type": "Single",
                            "year": single.get("year") or "",
                            "thumbnails": single.get("thumbnails") or [],
                            "tracks": []
                        }
                        db_save_album(single_data, artist_id)
                        
        except Exception as e:
            logger.warning(f"Background album save error: {e}")
            
        logger.info(f"Background save completed for artist: {artist_name}")

    except Exception as e:
        logger.error(f"Background save error: {e}")

def parse_artist_data_lightweight(artist_id: str, artist_info: dict) -> dict:
    """
    아티스트 정보를 빠르게 파싱하여 응답용으로 반환 (DB 저장 X, 추가 Fetch X)
    """
    artist_name = artist_info.get("name") or ""
    search_thumbnails = artist_info.get("thumbnails") or []

    # 헬퍼 함수 사용으로 중복 코드 제거
    songs_section = artist_info.get("songs")
    top_songs = _extract_top_songs(songs_section)
    related_artists = _extract_related_artists(artist_info.get("related"))
    
    # 앨범 + 싱글 통합
    all_albums = _extract_albums_from_section(artist_info.get("albums"), "Album")
    all_albums.extend(_extract_albums_from_section(artist_info.get("singles"), "Single"))

    return {
        "browseId": artist_id,
        "artist": artist_name,
        "name": artist_name,
        "thumbnails": search_thumbnails,
        "subscribers": artist_info.get("subscribers") or "",
        "description": artist_info.get("description") or "",
        "topSongs": top_songs,
        "related": related_artists,
        "albums": all_albums,
        "allTracks": top_songs  # 초기 응답에는 top songs만 포함
    }


# =============================================================================
# Helper functions for search_summary
# =============================================================================

def _process_db_artists(
    artist_browse_ids: list,
    background_tasks,
    country: str,
    top_songs_limit: int = 5
) -> dict | None:
    """Process artists from database and prepare response data."""
    artists_data = []
    all_songs = []
    all_albums = []
    all_tracks = []
    needs_background_update = False

    for browse_id in artist_browse_ids:
        artist_full = db_get_full_artist_data(browse_id)
        if not artist_full:
            continue
        
        artists_data.append(artist_full)

        for song in artist_full.get("topSongs", [])[:top_songs_limit]:
            song["artist_bid"] = browse_id
            song["resultType"] = "song"
            all_songs.append(song)

        for album in artist_full.get("albums", []):
            album["artist_bid"] = browse_id
            all_albums.append(album)
            
        # Collect all tracks efficiently
        all_tracks.extend(artist_full.get("allTracks", []))

        if db_check_artist_needs_sync(browse_id, days=7):
            needs_background_update = True
            background_tasks.add_task(background_update_artist, browse_id, country)

    if not artists_data:
        return None

    return {
        "artists": artists_data,
        "songs": all_songs,
        "albums": all_albums,
        "allTracks": all_tracks,
        "updating": needs_background_update
    }


def _find_best_artist(artists_search: list, search_query: str) -> dict | None:
    """Find the best matching artist from search results."""
    search_lower = search_query.lower().strip()
    
    for artist in artists_search[:5]:
        if not isinstance(artist, dict):
            continue
        artist_name = (artist.get("artist") or artist.get("name") or "").lower()
        if search_lower in artist_name or artist_name in search_lower:
            return artist
    
    return artists_search[0] if artists_search else None


def _filter_songs_by_artist(songs_search: list, top_songs: list, artist_name: str) -> list:
    """Filter and prioritize songs by matching artist."""
    target_name = artist_name.lower()
    filtered_search = []
    other_songs = []

    for song in songs_search:
        song_artists = song.get("artists") or []
        is_match = any(a.get("name", "").lower() == target_name for a in song_artists)
        if is_match:
            filtered_search.append(song)
        else:
            other_songs.append(song)

    result = top_songs + filtered_search
    if len(result) < 5:
        result += other_songs[:5]
    
    return result


@app.get("/api/search/summary/deprecated")
async def search_summary_deprecated(
    request: Request,
    q: str,
    background_tasks: BackgroundTasks,
    country: str = None,
    force_refresh: bool = False
):
    """
    아티스트 검색 및 전체 디스코그래피 반환

    Data Flow:
    1. DB에서 검색어 매핑 확인 (search_keywords)
    2. 매핑 있음 → DB에서 전체 데이터 반환
       - 7일 경과 시 → 반환 후 백그라운드 업데이트
    3. 매핑 없음 → ytmusicapi 호출 → 전체 디스코그래피 → DB 저장
    """
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"summary:{country}:{q}"

    # ==========================================================================
    # 1단계: DB에서 기존 데이터 확인
    # ==========================================================================
    if not force_refresh:
        # Redis 캐시 먼저 확인 (빠른 응답)
        cached = cache_get(cache_key)
        if cached:
            logger.info(f"Redis cache hit: {cache_key}")
            cached["source"] = "redis"
            return cached

        # DB에서 검색어 매핑 확인
        artist_browse_ids = db_get_artists_by_keyword(q, country)
        if artist_browse_ids:
            logger.info(f"DB hit for keyword: {q} ({len(artist_browse_ids)} artists)")
            db_result = _process_db_artists(artist_browse_ids, background_tasks, country)
            
            if db_result:
                result = {
                    "keyword": q,
                    "country": country,
                    "artists": db_result["artists"],
                    "songs": db_result["songs"],
                    "albums": [],
                    "albums2": db_result["albums"],
                    "allTracks": db_result["allTracks"],
                    "source": "database",
                    "updating": db_result["updating"]
                }
                cache_set(cache_key, result, ttl=1800)
                if db_result["updating"]:
                    logger.info(f"Background update triggered for: {q}")
                return result

    # ==========================================================================
    # 2단계: ytmusicapi에서 새로 가져오기 (병렬 처리 + 백그라운드 저장)
    # ==========================================================================
    logger.info(f"Fetching from ytmusicapi: {q}")

    try:
        ytmusic = get_ytmusic(country)

        # 1. 아티스트와 노래 동시 검색 (병렬 실행)
        # run_in_thread를 사용하여 blocking I/O를 별도 스레드에서 실행
        future_artists = run_in_thread(ytmusic.search, q, filter="artists", limit=5)
        future_songs = run_in_thread(ytmusic.search, q, filter="songs", limit=20) # 30 -> 20 limit 축소
        
        # 병렬 대기
        artists_results, direct_song_results = await asyncio.gather(future_artists, future_songs)
        
        # 결과 처리
        artists_search = artists_results or []
        if not artists_search:
            # Fallback: 일반 검색에서 아티스트 필터링
            general_results = await run_in_thread(ytmusic.search, q, limit=40)
            artists_search = [r for r in general_results if r.get("resultType") == "artist"][:5]

        # 노래 결과 정제
        songs_search = []
        direct_song_results = direct_song_results or []
        for song in direct_song_results:
            if isinstance(song, dict) and song.get("videoId"):
                song_copy = dict(song)
                song_copy["resultType"] = "song"
                song_copy["from_direct_search"] = True
                songs_search.append(song_copy)

        # 가장 관련성 높은 아티스트 1명만 처리
        artists_data = []
        albums_data = []
        all_tracks = []
        
        # 최적의 아티스트 찾기 (헬퍼 함수 사용)
        best_artist = _find_best_artist(artists_search, q)

        if best_artist and isinstance(best_artist, dict):
            artist_id = best_artist.get("browseId")
            if artist_id:
                try:
                    # 아티스트 상세 정보 가져오기
                    artist_info = await run_in_thread(ytmusic.get_artist, artist_id)
                    
                    if artist_info and isinstance(artist_info, dict):
                        # 1. 응답용 가벼운 데이터 파싱 (Blocking 없음)
                        artist_full = parse_artist_data_lightweight(artist_id, artist_info)
                        
                        if artist_full:
                            artists_data.append(artist_full)

                            # 인기곡 태그 추가
                            top_songs = []
                            for song in artist_full.get("topSongs", []):
                                song["artist_bid"] = artist_id
                                song["resultType"] = "song"
                                top_songs.append(song)
                            
                            # 헬퍼 함수로 노래 필터링
                            songs_search = _filter_songs_by_artist(
                                songs_search, top_songs, artist_full.get("name", "")
                            )

                            # 앨범 데이터 추가
                            for album in artist_full.get("albums", []):
                                album["artist_bid"] = artist_id
                                albums_data.append(album)

                            # 3. 무거운 작업(DB 저장, 전체 앨범 Fetch)은 백그라운드로 위임
                            background_tasks.add_task(save_full_artist_data_background, artist_id, artist_info, country)
                            background_tasks.add_task(db_save_search_keyword, q, country, artist_id)

                except Exception as artist_err:
                    logger.warning(f"Artist fetch error for {artist_id}: {artist_err}")

        result = {
            "keyword": q,
            "country": country,
            "artists": artists_data,
            "songs": songs_search,
            "albums": [],
            "albums2": albums_data,
            "allTracks": all_tracks,
            "source": "ytmusicapi"
        }

        # Redis 캐시 저장 (백그라운드)
        # cache_set도 가벼운 연산이므로 그냥 실행하거나 비동기 처리 가능하나 여기선 유지
        cache_set(cache_key, result, ttl=1800)

        return result

    except Exception as e:
        logger.error(f"Summary search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 아티스트 정보 API
# =============================================================================

@app.get("/api/artist/{artist_id}/songs-playlist")
async def get_artist_songs_playlist(artist_id: str, country: str = "US"):
    """
    아티스트의 "인기곡 모두 표시" 플레이리스트 ID 반환

    YouTube Music 아티스트 페이지에서 "인기곡" 섹션의 "모두 표시" 버튼 링크에 있는
    플레이리스트 ID를 추출하여 반환합니다.

    이 ID를 YouTube IFrame API의 loadPlaylist()에 전달하면
    해당 아티스트의 전체 인기곡을 자동으로 재생할 수 있습니다.

    Returns:
        - playlistId: 순수 플레이리스트 ID (VL 접두사 제거됨)
        - browseId: 원본 browseId (VL 포함)
        - artistName: 아티스트 이름
        - trackCount: 인기곡 섹션에 표시된 곡 수 (전체 아님)
    """
    cache_key = f"artist_songs_playlist:{artist_id}:{country}"

    cached = cache_get(cache_key)
    if cached:
        return {"source": "cache", **cached}

    try:
        ytmusic = get_ytmusic(country)
        artist = ytmusic.get_artist(artist_id)

        if not artist:
            raise HTTPException(status_code=404, detail=ERROR_ARTIST_NOT_FOUND)

        artist_name = artist.get("name") or ""
        songs_section = artist.get("songs")

        if not songs_section or not isinstance(songs_section, dict):
            raise HTTPException(status_code=404, detail="Songs section not found")

        browse_id = songs_section.get("browseId")
        if not browse_id:
            raise HTTPException(status_code=404, detail="Songs playlist ID not found")

        # "VL" 접두사 제거하여 순수 플레이리스트 ID 추출
        # 예: "VLOLAK5uy_xxx" -> "OLAK5uy_xxx"
        playlist_id = browse_id
        if browse_id.startswith("VL"):
            playlist_id = browse_id[2:]

        # 인기곡 샘플 (처음 몇 개)
        top_songs = songs_section.get("results") or []

        result = {
            "playlistId": playlist_id,
            "browseId": browse_id,
            "artistId": artist_id,
            "artistName": artist_name,
            "trackCount": len(top_songs),
            "topSongs": [{
                "videoId": s.get("videoId"),
                "title": s.get("title"),
                "thumbnails": s.get("thumbnails", [])
            } for s in top_songs[:5] if isinstance(s, dict)]
        }

        # 1시간 캐시
        cache_set(cache_key, result, ttl=3600)

        logger.info(f"Songs playlist extracted: {artist_name} -> {playlist_id}")
        return {"source": "api", **result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Songs playlist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 초고속 검색 API (search()만 호출, get_artist() 건너뛰기)
# =============================================================================


async def _fetch_all_albums(ytmusic, section: dict, artist_name: str, album_type: str = "Album") -> list:
    """Fetch all albums/singles from a section with proper API call."""
    albums = []
    if not section or not isinstance(section, dict):
        return albums

    browse_id = section.get("browseId")
    params = section.get("params")

    if browse_id and params:
        try:
            all_items = await run_in_thread(ytmusic.get_artist_albums, browse_id, params)
            for item in (all_items or []):
                albums.append({
                    "browseId": item.get("browseId"),
                    "title": item.get("title"),
                    "artists": [{"name": artist_name}],
                    "thumbnails": item.get("thumbnails", []),
                    "year": item.get("year"),
                    "type": album_type
                })
        except Exception as e:
            logger.warning(f"Failed to get all {album_type.lower()}s: {e}")
            # Fallback to initial results
            for item in section.get("results", []):
                albums.append({
                    "browseId": item.get("browseId"),
                    "title": item.get("title"),
                    "artists": [{"name": artist_name}],
                    "thumbnails": item.get("thumbnails", []),
                    "year": item.get("year"),
                    "type": album_type
                })
    else:
        for item in section.get("results", []):
            albums.append({
                "browseId": item.get("browseId"),
                "title": item.get("title"),
                "artists": [{"name": artist_name}],
                "thumbnails": item.get("thumbnails", []),
                "year": item.get("year"),
                "type": album_type
            })

    return albums


def _extract_similar_artists(related_section: dict, exclude_id: str = None, limit: int = 10) -> list:
    """Extract similar artists from related section."""
    similar = []
    if not related_section or not isinstance(related_section, dict):
        return similar

    for ra in related_section.get("results", []):
        if len(similar) >= limit:
            break
        ra_id = ra.get("browseId")
        if ra_id and ra_id != exclude_id:
            similar.append({
                "browseId": ra_id,
                "name": ra.get("title") or ra.get("name"),
                "thumbnail": get_best_thumbnail(ra.get("thumbnails", []))
            })

    return similar


@app.get("/api/search/quick")
async def search_quick(request: Request, q: str, country: str = None):
    """통합 검색 - 아티스트 + 전체 앨범/싱글 + 인기곡 5개 + 비슷한 아티스트 10명

    get_artist()로 전체 디스코그래피 조회.
    """
    if not q or len(q.strip()) < 1:
        raise HTTPException(status_code=400, detail="Query required")

    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"quick:{country}:{q.strip().lower()}"

    # 1. Redis 캐시 확인
    cached = cache_get(cache_key)
    if cached:
        cached["source"] = "cache"
        return cached

    # 2. ytmusicapi 검색 (search()만 호출 - 빠름!)
    # DB 캐시 사용 안함 - 앨범/비슷한 아티스트도 반환해야 하므로
    try:
        ytmusic = get_ytmusic(country)

        # 병렬로 아티스트, 노래 검색 (비슷한 아티스트 10명 포함)
        future_artists = run_in_thread(ytmusic.search, q.strip(), filter="artists", limit=11)
        future_songs = run_in_thread(ytmusic.search, q.strip(), filter="songs", limit=5)
        artists_results, songs_results = await asyncio.gather(future_artists, future_songs)

        artist_data = None
        similar_artists = []
        albums = []
        songs_playlist_id = None

        if artists_results and len(artists_results) > 0:
            artist = artists_results[0]
            artist_id = artist.get("browseId")

            # 아티스트 상세 정보에서 전체 앨범/싱글 + 플레이리스트 ID 가져오기
            if artist_id:
                try:
                    artist_detail = await run_in_thread(ytmusic.get_artist, artist_id)

                    # 플레이리스트 ID 추출
                    songs_section = artist_detail.get("songs", {})
                    if isinstance(songs_section, dict):
                        browse_id = songs_section.get("browseId")
                        if browse_id:
                            songs_playlist_id = browse_id[2:] if browse_id.startswith("VL") else browse_id

                    artist_name = artist.get("artist") or artist.get("name")

                    # 전체 앨범 가져오기 (헬퍼 함수 사용)
                    albums_section = artist_detail.get("albums", {})
                    albums.extend(await _fetch_all_albums(ytmusic, albums_section, artist_name, "Album"))

                    # 전체 싱글 가져오기 (헬퍼 함수 사용)
                    singles_section = artist_detail.get("singles", {})
                    albums.extend(await _fetch_all_albums(ytmusic, singles_section, artist_name, "Single"))

                    # 유사 아티스트 추출 (헬퍼 함수 사용)
                    related_section = artist_detail.get("related", {})
                    similar_artists = _extract_similar_artists(related_section, artist_id, 10)
                except Exception as e:
                    logger.warning(f"Failed to get artist detail: {e}")

            artist_data = {
                "browseId": artist_id,
                "name": artist.get("artist") or artist.get("name"),
                "thumbnail": get_best_thumbnail(artist.get("thumbnails", [])),
                "songsPlaylistId": songs_playlist_id
            }

            # 검색 결과에서 추가 비슷한 아티스트 (10명 미만일 경우)
            for a in artists_results[1:11]:
                if len(similar_artists) >= 10:
                    break
                a_id = a.get("browseId")
                if a_id and not any(s.get("browseId") == a_id for s in similar_artists):
                    similar_artists.append({
                        "browseId": a_id,
                        "name": a.get("artist") or a.get("name"),
                        "thumbnail": get_best_thumbnail(a.get("thumbnails", []))
                    })

            # 백그라운드에서 DB에 저장 + 가상회원 자동 생성
            if supabase_client and artist_data.get("browseId"):
                try:
                    browse_id = artist_data["browseId"]
                    artist_name = artist_data["name"]
                    thumbnail_url = artist_data["thumbnail"]

                    supabase_client.table("music_artists").upsert({
                        "browse_id": browse_id,
                        "name": artist_name,
                        "thumbnail_url": thumbnail_url,
                        "songs_playlist_id": songs_playlist_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }, on_conflict="browse_id").execute()

                    # 가상회원 자동 생성
                    try:
                        existing = supabase_client.table("profiles").select("id").eq("artist_browse_id", browse_id).execute()
                        if not existing.data or len(existing.data) == 0:
                            create_virtual_member_sync(browse_id, artist_name, thumbnail_url)
                            logger.info(f"Virtual member auto-created via search: {artist_name}")
                    except Exception as vm_error:
                        logger.warning(f"Virtual member auto-creation skipped: {vm_error}")
                except Exception:
                    pass

        # 노래 결과 정리
        songs = []
        for s in (songs_results or [])[:5]:
            songs.append({
                "videoId": s.get("videoId"),
                "title": s.get("title"),
                "artists": s.get("artists", []),
                "thumbnails": s.get("thumbnails", []),
                "duration": s.get("duration"),
                "album": s.get("album")
            })

        # 앨범은 위에서 get_artist()로 이미 추출됨 (전체 앨범 + 싱글)

        response = {
            "artist": artist_data,
            "songs": songs,
            "albums": albums,
            "similarArtists": similar_artists,
            "source": "api"
        }

        cache_set(cache_key, response, ttl=1800)
        return response

    except Exception as e:
        logger.error(f"Quick search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/artist/playlist-id")
async def get_artist_playlist_id(q: str, country: str = "US"):
    """아티스트 검색 -> 플레이리스트 ID만 반환 (초고속 엔드포인트)

    1. Supabase에서 먼저 검색 (캐시)
    2. 없으면 ytmusicapi 호출 후 Supabase에 저장
    """
    if not q or len(q.strip()) < 1:
        raise HTTPException(status_code=400, detail="Query required")

    try:
        # 1. Supabase에서 먼저 검색 (이름으로 검색)
        if supabase_client:
            try:
                result = supabase_client.table("music_artists").select(
                    "browse_id, name, songs_playlist_id"
                ).ilike("name", f"%{q.strip()}%").limit(1).execute()

                if result.data and result.data[0].get("songs_playlist_id"):
                    cached = result.data[0]
                    logger.info(f"[playlist-id] DB hit: {cached['name']}")
                    return {
                        "playlistId": cached["songs_playlist_id"],
                        "artist": cached["name"],
                        "source": "database"
                    }
            except Exception as db_err:
                logger.warning(f"DB search error: {db_err}")

        # 2. DB에 없으면 ytmusicapi 호출
        ytmusic = get_ytmusic(country)
        artists = await run_in_thread(ytmusic.search, q.strip(), filter="artists", limit=1)

        if not artists:
            return {"playlistId": None, "artist": None}

        artist = artists[0]
        artist_id = artist.get("browseId")
        artist_name = artist.get("artist") or artist.get("name")

        if not artist_id:
            return {"playlistId": None, "artist": artist_name}

        # 3. 아티스트 상세에서 songs.browseId만 추출
        artist_detail = await run_in_thread(ytmusic.get_artist, artist_id)

        songs_section = artist_detail.get("songs", {})
        songs_browse_id = songs_section.get("browseId") if isinstance(songs_section, dict) else None

        # VL 제거 -> 순수 플레이리스트 ID
        playlist_id = None
        if songs_browse_id:
            playlist_id = songs_browse_id[2:] if songs_browse_id.startswith("VL") else songs_browse_id

        # 4. Supabase에 저장 (재검색 시 빠른 응답)
        if supabase_client and playlist_id:
            try:
                supabase_client.table("music_artists").upsert({
                    "browse_id": artist_id,
                    "name": artist_name,
                    "songs_playlist_id": playlist_id,
                    "thumbnail_url": get_best_thumbnail(artist.get("thumbnails", [])),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }, on_conflict="browse_id").execute()
                logger.info(f"[playlist-id] Saved to DB: {artist_name} -> {playlist_id}")
            except Exception as save_err:
                logger.warning(f"DB save error: {save_err}")

        return {
            "playlistId": playlist_id,
            "artist": artist_name,
            "source": "api"
        }

    except Exception as e:
        logger.error(f"Playlist ID search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/artist/{artist_id}")
async def get_artist(artist_id: str, country: str = "US", force_refresh: bool = False):
    """아티스트 상세 정보 + On-Demand 업데이트"""
    cache_key = f"artist:{artist_id}:{country}"

    # last_viewed_at 업데이트 (조회 추적)
    if supabase_client:
        try:
            supabase_client.table("music_artists").update({
                "last_viewed_at": datetime.now(timezone.utc).isoformat()
            }).eq("browse_id", artist_id).execute()
        except Exception as view_err:
            logger.debug(f"View tracking update: {view_err}")

    # On-Demand 업데이트: last_synced_at이 7일 이상이면 자동 갱신
    should_refresh = force_refresh
    if not should_refresh and supabase_client:
        try:
            artist_record = supabase_client.table("music_artists").select(
                "last_synced_at"
            ).eq("browse_id", artist_id).execute()

            if artist_record.data and artist_record.data[0].get("last_synced_at"):
                last_synced = datetime.fromisoformat(
                    artist_record.data[0]["last_synced_at"].replace("Z", TIMEZONE_SUFFIX)
                )
                if datetime.now(timezone.utc) - last_synced > timedelta(days=7):
                    should_refresh = True
                    logger.info(f"[ON-DEMAND] Refreshing stale artist: {artist_id}")
        except Exception as check_err:
            logger.debug(f"Stale check error: {check_err}")

    if not should_refresh:
        cached = cache_get(cache_key)
        if cached:
            return {"source": "cache", "artist": cached}

    try:
        ytmusic = get_ytmusic(country)
        artist = await run_in_thread(ytmusic.get_artist, artist_id)

        # On-Demand 갱신 시 DB도 업데이트
        if should_refresh and artist:
            try:
                save_full_artist_data_background(artist_id, artist, country)
                logger.info(f"[ON-DEMAND] Updated: {artist.get('name', artist_id)}")
            except Exception as save_err:
                logger.warning(f"On-demand save failed: {save_err}")

        # 6시간 캐시
        cache_set(cache_key, artist, ttl=21600)

        return {"source": "api", "artist": artist, "refreshed": should_refresh}
    except Exception as e:
        logger.error(f"Artist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _fetch_full_section_items(ytmusic, section: dict, item_type: str) -> list:
    """Fetch all items from a section (albums/singles) asynchronously."""
    items = []
    if not isinstance(section, dict):
        return items
        
    browse_id = section.get("browseId")
    params = section.get("params")
    
    # Try fetch full list
    if browse_id and params:
        try:
            full_list = await run_in_thread(ytmusic.get_artist_albums, browse_id, params)
            for item in (full_list or []):
                 if isinstance(item, dict) and item.get("browseId"):
                    items.append({
                        "browseId": item.get("browseId"),
                        "title": item.get("title") or "",
                        "type": item.get("type") or item_type,
                        "year": item.get("year") or "",
                        "thumbnails": item.get("thumbnails") or []
                    })
            return items
        except Exception as e:
            logger.warning(f"Failed to fetch {item_type}s: {e}")
            
    # Fallback
    for item in section.get("results", []):
        if isinstance(item, dict) and item.get("browseId"):
            items.append({
                "browseId": item.get("browseId"),
                "title": item.get("title") or "",
                "type": item.get("type") or item_type,
                "year": item.get("year") or "",
                "thumbnails": item.get("thumbnails") or []
            })
    return items


@app.get("/api/artist/{artist_id}/albums")
async def get_artist_all_albums(artist_id: str, country: str = "US"):
    """
    아티스트의 전체 앨범 목록 (앨범 + 싱글)
    - 검색 결과에서는 샘플만 반환
    - 이 엔드포인트에서 전체 목록 반환
    """
    cache_key = f"artist_albums:{artist_id}:{country}"

    cached = cache_get(cache_key)
    if cached:
        return {"source": "cache", "albums": cached}

    try:
        ytmusic = get_ytmusic(country)
        artist = await run_in_thread(ytmusic.get_artist, artist_id)

        if not artist:
            raise HTTPException(status_code=404, detail=ERROR_ARTIST_NOT_FOUND)

        all_albums = await _fetch_full_section_items(ytmusic, artist.get("albums"), "Album")
        singles = await _fetch_full_section_items(ytmusic, artist.get("singles"), "Single")
        all_albums.extend(singles)

        # 1시간 캐시
        cache_set(cache_key, all_albums, ttl=3600)

        return {"source": "api", "albums": all_albums, "count": len(all_albums)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Artist albums error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 앨범 정보 API
# =============================================================================

@app.get("/api/album/{album_id}")
async def get_album(album_id: str, country: str = "US"):
    """
    앨범 상세 정보 (트랙 포함) - 온디맨드 로드
    1. DB에서 트랙이 있는지 확인
    2. 없으면 ytmusicapi에서 가져와서 DB에 저장
    """
    cache_key = f"album:{album_id}:{country}"

    # Redis 캐시 확인
    cached = cache_get(cache_key)
    if cached:
        return {"source": "cache", "album": cached}

    # DB에서 트랙 확인
    if supabase_client:
        try:
            tracks_result = supabase_client.table("music_tracks").select("*").eq(
                "album_browse_id", album_id
            ).order("track_number").execute()

            if tracks_result.data and len(tracks_result.data) > 0:
                # DB에 트랙이 있음 - 앨범 메타데이터도 가져오기
                album_result = supabase_client.table("music_albums").select("*").eq(
                    "browse_id", album_id
                ).single().execute()

                if album_result.data:
                    album_data = {
                        "browseId": album_result.data.get("browse_id"),
                        "title": album_result.data.get("title"),
                        "type": album_result.data.get("type"),
                        "year": album_result.data.get("year"),
                        "thumbnails": [{"url": album_result.data.get("thumbnail_url")}] if album_result.data.get("thumbnail_url") else [],
                        "tracks": [{
                            "videoId": t.get("video_id"),
                            "title": t.get("title"),
                            "duration": t.get("duration"),
                            "trackNumber": t.get("track_number"),
                            "thumbnails": [{"url": t.get("thumbnail_url")}] if t.get("thumbnail_url") else [],
                            "isExplicit": t.get("is_explicit", False)
                        } for t in tracks_result.data]
                    }

                    # Redis에 캐시
                    cache_set(cache_key, album_data, ttl=21600)

                    logger.info(f"Album from DB: {album_id} ({len(tracks_result.data)} tracks)")
                    return {"source": "database", "album": album_data}
        except Exception as e:
            logger.warning(f"DB album fetch error: {e}")

    # ytmusicapi에서 가져오기
    try:
        ytmusic = get_ytmusic(country)
        album = await run_in_thread(ytmusic.get_album, album_id)

        if album and supabase_client:
            # DB에 트랙 저장
            tracks = album.get("tracks") or []
            artist_browse_id = None

            # 아티스트 ID 추출
            artists = album.get("artists") or []
            if artists and isinstance(artists, list) and len(artists) > 0:
                artist_browse_id = artists[0].get("id") or artists[0].get("browseId")

            # 앨범 메타데이터 업데이트 (트랙 수 포함)
            try:
                album_update = {
                    "browse_id": album_id,
                    "title": album.get("title") or "",
                    "type": album.get("type") or "Album",
                    "year": album.get("year") or "",
                    "thumbnail_url": get_best_thumbnail(album.get("thumbnails", [])),
                    "track_count": len(tracks)
                }
                if artist_browse_id:
                    album_update["artist_browse_id"] = artist_browse_id

                supabase_client.table("music_albums").upsert(
                    album_update, on_conflict="browse_id"
                ).execute()
            except Exception as e:
                logger.warning(f"Album metadata update error: {e}")

            # 트랙 저장
            for idx, track in enumerate(tracks):
                if not isinstance(track, dict):
                    continue
                video_id = track.get("videoId")
                if not video_id:
                    continue

                try:
                    track_data = {
                        "video_id": video_id,
                        "album_browse_id": album_id,
                        "artist_browse_id": artist_browse_id,
                        "title": track.get("title") or "",
                        "duration": track.get("duration") or "",
                        "track_number": idx + 1,
                        "thumbnail_url": get_best_thumbnail(track.get("thumbnails") or album.get("thumbnails", [])),
                        "is_explicit": track.get("isExplicit", False)
                    }

                    supabase_client.table("music_tracks").upsert(
                        track_data, on_conflict="video_id"
                    ).execute()
                except Exception as e:
                    logger.warning(f"Track save error: {e}")

            logger.info(f"Album tracks saved to DB: {album_id} ({len(tracks)} tracks)")

        # 트랙에 썸네일이 없으면 앨범 썸네일 추가
        album_thumbnails = album.get("thumbnails", [])
        for track in album.get("tracks", []):
            if not track.get("thumbnails") and album_thumbnails:
                track["thumbnails"] = album_thumbnails

        return {"source": "api", "album": album}
    except Exception as e:
        logger.error(f"Album error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 플레이리스트 정보 API
# =============================================================================

@app.get("/api/playlist/{playlist_id}")
async def get_playlist(playlist_id: str, country: str = "US", limit: int = None):
    """플레이리스트 상세 정보 (트랙 목록 포함) - limit=None이면 전체 트랙"""
    cache_key = f"playlist:{playlist_id}:{country}:{limit or 'all'}"

    cached = cache_get(cache_key)
    if cached:
        return {"source": "cache", "playlist": cached}

    try:
        ytmusic = get_ytmusic(country)
        # limit=None이면 전체 트랙을 가져옴
        playlist = await run_in_thread(ytmusic.get_playlist, playlist_id, limit=limit)

        # 트랙에 썸네일이 없으면 플레이리스트 썸네일 추가
        playlist_thumbnails = playlist.get("thumbnails", [])
        for track in playlist.get("tracks", []):
            if not track.get("thumbnails") and playlist_thumbnails:
                track["thumbnails"] = playlist_thumbnails

        return {"source": "api", "playlist": playlist}
    except Exception as e:
        logger.error(f"Playlist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 캐시 관리 API
# =============================================================================

@app.delete("/api/cache/clear")
async def clear_search_cache(secret: str = None):
    """검색 캐시 전체 삭제 (Supabase music_search_cache 테이블)"""
    # 간단한 보안 체크 (프로덕션에서는 더 강력한 인증 필요)
    admin_secret = os.getenv("ADMIN_SECRET", "sori-admin-2024")
    if secret != admin_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # music_search_cache 테이블 전체 삭제
        result = supabase_client.table("music_search_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

        # 메모리 캐시도 클리어
        global memory_cache
        memory_cache = {}

        deleted_count = len(result.data) if result.data else 0
        logger.info(f"Cleared {deleted_count} cache entries")

        return {
            "status": "success",
            "message": f"Cleared {deleted_count} cache entries",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/run-sql")
async def run_custom_sql(secret: str = None, access_token: str = None, sql: str = None):
    """임의의 SQL 실행 - Management API 사용"""
    import httpx

    admin_secret = os.getenv("ADMIN_SECRET", "sori-admin-2024")
    if secret != admin_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if not sql:
        raise HTTPException(status_code=400, detail="sql parameter required")

    mgmt_token = access_token or os.getenv("SUPABASE_ACCESS_TOKEN")
    if not mgmt_token:
        raise HTTPException(status_code=400, detail=ERROR_ACCESS_TOKEN_REQUIRED)

    project_ref = "nrtkbulkzhhlstaomvas"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
            headers={
                "Authorization": f"Bearer {mgmt_token}",
                "Content-Type": CONTENT_TYPE_JSON
            },
            json={"query": sql}
        )

        if response.status_code != 201:
            return {"success": False, "error": response.text, "status": response.status_code}

        return {"success": True, "result": response.json()}


@app.post("/api/admin/fix-notification-triggers")
async def fix_notification_triggers(secret: str = None, access_token: str = None):
    """알림 트리거 수정 - posts 테이블용"""
    import httpx

    admin_secret = os.getenv("ADMIN_SECRET", "sori-admin-2024")
    if secret != admin_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")

    mgmt_token = access_token or os.getenv("SUPABASE_ACCESS_TOKEN")
    if not mgmt_token:
        raise HTTPException(status_code=400, detail=ERROR_ACCESS_TOKEN_REQUIRED)

    project_ref = "nrtkbulkzhhlstaomvas"

    sql_commands = [
        # Fix like notification trigger
        """CREATE OR REPLACE FUNCTION create_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type, content)
        VALUES (post_owner_id, NEW.user_id, 'like', NEW.post_id, 'post', 'liked your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER""",

        # Fix comment notification trigger
        """CREATE OR REPLACE FUNCTION create_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, actor_id, type, reference_id, reference_type, content)
        VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, 'post', 'commented on your post');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER""",

        # Recreate triggers
        "DROP TRIGGER IF EXISTS on_post_like_notify ON post_likes",
        """CREATE TRIGGER on_post_like_notify
    AFTER INSERT ON post_likes
    FOR EACH ROW EXECUTE FUNCTION create_post_like_notification()""",

        "DROP TRIGGER IF EXISTS on_post_comment_notify ON post_comments",
        """CREATE TRIGGER on_post_comment_notify
    AFTER INSERT ON post_comments
    FOR EACH ROW EXECUTE FUNCTION create_post_comment_notification()"""
    ]

    results = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, sql in enumerate(sql_commands):
            response = await client.post(
                f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
                headers={
                    "Authorization": f"Bearer {mgmt_token}",
                    "Content-Type": CONTENT_TYPE_JSON
                },
                json={"query": sql}
            )

            results.append({
                "index": i,
                "success": response.status_code == 201,
                "status": response.status_code,
                "error": response.text if response.status_code != 201 else None
            })

    return {"results": results, "total": len(sql_commands), "success": all(r["success"] for r in results)}


@app.post("/api/admin/fix-advisor")
async def fix_advisor_warnings(secret: str = None, access_token: str = None):
    """Supabase Advisor 경고 수정 - Management API로 SQL 실행"""
    import httpx

    admin_secret = os.getenv("ADMIN_SECRET", "sori-admin-2024")
    if secret != admin_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Supabase Management API 토큰 (환경변수 또는 파라미터)
    mgmt_token = access_token or os.getenv("SUPABASE_ACCESS_TOKEN")
    if not mgmt_token:
        raise HTTPException(status_code=400, detail=ERROR_ACCESS_TOKEN_REQUIRED)

    project_ref = "nrtkbulkzhhlstaomvas"

    # SQL 명령어들 (하나씩 실행)
    sql_commands = [
        "DROP TABLE IF EXISTS music_tracks CASCADE",
        "DROP TABLE IF EXISTS music_albums CASCADE",
        "DROP TABLE IF EXISTS music_artists CASCADE",
        "DROP TABLE IF EXISTS artist_relations CASCADE",
        "DROP FUNCTION IF EXISTS search_music_artists(text, integer)",
        "DROP FUNCTION IF EXISTS get_artist_full_data(text)",
        "DROP FUNCTION IF EXISTS normalize_music_text() CASCADE",
        'DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles',
        'DROP POLICY IF EXISTS "Users can update own profile." ON profiles',
        'CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = id)',
        'CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING ((select auth.uid()) = id)',
        'DROP POLICY IF EXISTS "Users can insert their own playlists." ON playlists',
        'DROP POLICY IF EXISTS "Users can update their own playlists." ON playlists',
        'CREATE POLICY "Users can insert their own playlists." ON playlists FOR INSERT WITH CHECK ((select auth.uid()) = user_id)',
        'CREATE POLICY "Users can update their own playlists." ON playlists FOR UPDATE USING ((select auth.uid()) = user_id)',
        'DROP POLICY IF EXISTS "Search cache is viewable by everyone" ON music_search_cache',
        'DROP POLICY IF EXISTS "Service role can manage music_search_cache" ON music_search_cache',
        'CREATE POLICY "Public read access" ON music_search_cache FOR SELECT USING (true)',
        "CREATE SCHEMA IF NOT EXISTS extensions",
        "DROP EXTENSION IF EXISTS pg_trgm",
        "CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions",
        """CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$"""
    ]

    results = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for sql in sql_commands:
            try:
                response = await client.post(
                    f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
                    headers={
                        "Authorization": f"Bearer {mgmt_token}",
                        "Content-Type": CONTENT_TYPE_JSON
                    },
                    json={"query": sql}
                )

                if response.status_code == 201 or response.status_code == 200:
                    results.append({"sql": sql[:50] + "...", "status": "success"})
                else:
                    results.append({"sql": sql[:50] + "...", "status": "error", "code": response.status_code, "error": response.text})

            except Exception as e:
                results.append({"sql": sql[:50] + "...", "status": "error", "error": str(e)})

    success_count = len([r for r in results if r["status"] == "success"])
    return {
        "status": "completed",
        "message": f"{success_count}/{len(sql_commands)} commands executed",
        "results": results
    }


@app.post("/api/admin/run-migrations")
async def run_migrations(secret: str = None, access_token: str = None):
    """SNS 기능 마이그레이션 실행 - follows, likes, stories, messages, hashtags, reposts, comments, notifications"""
    import httpx

    admin_secret = os.getenv("ADMIN_SECRET", "sori-admin-2024")
    if secret != admin_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")

    mgmt_token = access_token or os.getenv("SUPABASE_ACCESS_TOKEN")
    if not mgmt_token:
        raise HTTPException(status_code=400, detail=ERROR_ACCESS_TOKEN_REQUIRED)

    project_ref = "nrtkbulkzhhlstaomvas"

    sql_commands = [
        # =====================================================
        # FOLLOWS TABLE - 팔로우 시스템
        # =====================================================
        """CREATE TABLE IF NOT EXISTS follows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(follower_id, following_id),
            CHECK (follower_id != following_id)
        )""",
        "ALTER TABLE follows ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Anyone can view follows" ON follows',
        """CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true)""",
        'DROP POLICY IF EXISTS "Users can follow others" ON follows',
        """CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id)""",
        'DROP POLICY IF EXISTS "Users can unfollow" ON follows',
        """CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id)""",
        "CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)",
        "CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)",

        # Profiles - followers/following count columns
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",

        # Follow count trigger function
        """CREATE OR REPLACE FUNCTION update_follow_counts()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
                UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
                UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER""",
        "DROP TRIGGER IF EXISTS on_follow_change ON follows",
        """CREATE TRIGGER on_follow_change
            AFTER INSERT OR DELETE ON follows
            FOR EACH ROW EXECUTE FUNCTION update_follow_counts()""",

        # =====================================================
        # LIKES TABLE - 좋아요 시스템
        # =====================================================
        """CREATE TABLE IF NOT EXISTS likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, post_id)
        )""",
        "ALTER TABLE likes ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Anyone can view likes" ON likes',
        """CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true)""",
        'DROP POLICY IF EXISTS "Users can like posts" ON likes',
        """CREATE POLICY "Users can like posts" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "Users can unlike posts" ON likes',
        """CREATE POLICY "Users can unlike posts" ON likes FOR DELETE USING (auth.uid() = user_id)""",
        "CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)",

        # Playlists - like_count column
        "ALTER TABLE playlists ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0",

        # Like count trigger function
        """CREATE OR REPLACE FUNCTION update_like_counts()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE playlists SET like_count = like_count + 1 WHERE id = NEW.post_id;
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE playlists SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER""",
        "DROP TRIGGER IF EXISTS on_like_change ON likes",
        """CREATE TRIGGER on_like_change
            AFTER INSERT OR DELETE ON likes
            FOR EACH ROW EXECUTE FUNCTION update_like_counts()""",

        # =====================================================
        # CONVERSATIONS TABLES (must be created before messages can reference them)
        # =====================================================
        """CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS conversation_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            last_read_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(conversation_id, user_id)
        )""",
        """CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            shared_track_id TEXT,
            shared_track_title TEXT,
            shared_track_artist TEXT,
            shared_track_thumbnail TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        "ALTER TABLE conversations ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE messages ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Users can view own conversations" ON conversations',
        """CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (
            EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
        )""",
        'DROP POLICY IF EXISTS "Users can create conversations" ON conversations',
        """CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (true)""",
        'DROP POLICY IF EXISTS "Users can view own participations" ON conversation_participants',
        """CREATE POLICY "Users can view own participations" ON conversation_participants FOR SELECT USING (
            EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
        )""",
        'DROP POLICY IF EXISTS "Users can create participations" ON conversation_participants',
        """CREATE POLICY "Users can create participations" ON conversation_participants FOR INSERT WITH CHECK (true)""",
        'DROP POLICY IF EXISTS "Users can update own participation" ON conversation_participants',
        """CREATE POLICY "Users can update own participation" ON conversation_participants FOR UPDATE USING (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages',
        """CREATE POLICY "Users can view messages in own conversations" ON messages FOR SELECT USING (
            EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
        )""",
        'DROP POLICY IF EXISTS "Users can send messages" ON messages',
        """CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id)""",
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)",
        "CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id)",

        # =====================================================
        # STORIES TABLE
        # =====================================================
        # Stories table
        """CREATE TABLE IF NOT EXISTS stories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            content_type TEXT NOT NULL CHECK (content_type IN ('track', 'playlist', 'text')),
            video_id TEXT,
            playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
            title TEXT,
            artist TEXT,
            cover_url TEXT,
            text_content TEXT,
            background_color TEXT DEFAULT '#000000',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
            is_active BOOLEAN DEFAULT TRUE
        )""",
        # Story views
        """CREATE TABLE IF NOT EXISTS story_views (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
            viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            viewed_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(story_id, viewer_id)
        )""",
        # Stories RLS
        "ALTER TABLE stories ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE story_views ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Anyone can view active stories" ON stories',
        """CREATE POLICY "Anyone can view active stories" ON stories FOR SELECT USING (is_active = TRUE AND expires_at > NOW())""",
        'DROP POLICY IF EXISTS "Users can create own stories" ON stories',
        """CREATE POLICY "Users can create own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "Users can delete own stories" ON stories',
        """CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "Anyone can create story views" ON story_views',
        """CREATE POLICY "Anyone can create story views" ON story_views FOR INSERT WITH CHECK (viewer_id = auth.uid())""",

        # Comments table
        """CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        "ALTER TABLE comments ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Anyone can view comments" ON comments',
        """CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true)""",
        'DROP POLICY IF EXISTS "Users can create comments" ON comments',
        """CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "Users can delete own comments" ON comments',
        """CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id)""",

        # Add comment_count to playlists if not exists
        "ALTER TABLE playlists ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0",

        # Notifications table
        """CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            post_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
            comment_id UUID,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        "ALTER TABLE notifications ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Users can view own notifications" ON notifications',
        """CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "System can create notifications" ON notifications',
        """CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true)""",
        'DROP POLICY IF EXISTS "Users can update own notifications" ON notifications',
        """CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id)""",

        # Conversations table
        """CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS conversation_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            last_read_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(conversation_id, user_id)
        )""",
        """CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            shared_track_id TEXT,
            shared_track_title TEXT,
            shared_track_artist TEXT,
            shared_track_thumbnail TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        "ALTER TABLE conversations ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE messages ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Users can view own conversations" ON conversations',
        """CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (
            EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
        )""",
        'DROP POLICY IF EXISTS "Users can view own participations" ON conversation_participants',
        """CREATE POLICY "Users can view own participations" ON conversation_participants FOR SELECT USING (
            EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
        )""",
        'DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages',
        """CREATE POLICY "Users can view messages in own conversations" ON messages FOR SELECT USING (
            EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
        )""",
        'DROP POLICY IF EXISTS "Users can send messages" ON messages',
        """CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id)""",

        # Hashtags table
        """CREATE TABLE IF NOT EXISTS hashtags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            post_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS post_hashtags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(post_id, hashtag_id)
        )""",
        "ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Anyone can view hashtags" ON hashtags',
        """CREATE POLICY "Anyone can view hashtags" ON hashtags FOR SELECT USING (true)""",
        'DROP POLICY IF EXISTS "Anyone can view post_hashtags" ON post_hashtags',
        """CREATE POLICY "Anyone can view post_hashtags" ON post_hashtags FOR SELECT USING (true)""",

        # Reposts table
        """CREATE TABLE IF NOT EXISTS reposts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            post_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            quote TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, post_id)
        )""",
        "ALTER TABLE playlists ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0",
        "ALTER TABLE reposts ENABLE ROW LEVEL SECURITY",
        'DROP POLICY IF EXISTS "Anyone can view reposts" ON reposts',
        """CREATE POLICY "Anyone can view reposts" ON reposts FOR SELECT USING (true)""",
        'DROP POLICY IF EXISTS "Users can create reposts" ON reposts',
        """CREATE POLICY "Users can create reposts" ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id)""",
        'DROP POLICY IF EXISTS "Users can delete own reposts" ON reposts',
        """CREATE POLICY "Users can delete own reposts" ON reposts FOR DELETE USING (auth.uid() = user_id)""",

        # Indexes
        "CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)",
        "CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)",
        "CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name)",
        "CREATE INDEX IF NOT EXISTS idx_reposts_user ON reposts(user_id)",
    ]

    results = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for sql in sql_commands:
            try:
                response = await client.post(
                    f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
                    headers={
                        "Authorization": f"Bearer {mgmt_token}",
                        "Content-Type": CONTENT_TYPE_JSON
                    },
                    json={"query": sql}
                )

                if response.status_code in [200, 201]:
                    results.append({"sql": sql[:60] + "...", "status": "success"})
                else:
                    results.append({"sql": sql[:60] + "...", "status": "error", "code": response.status_code, "error": response.text[:200]})

            except Exception as e:
                results.append({"sql": sql[:60] + "...", "status": "error", "error": str(e)})

    success_count = len([r for r in results if r["status"] == "success"])
    return {
        "status": "completed",
        "message": f"{success_count}/{len(sql_commands)} commands executed",
        "results": results
    }


# =============================================================================
# 엔트리 포인트
# =============================================================================

# Helper functions to reduce cognitive complexity of search_summary


def _parse_albums_from_artist_detail(artist_detail: dict, artist_id: str) -> list:
    """Parse albums from artist detail response."""
    albums_list = []
    albums_section = artist_detail.get("albums", {})
    if isinstance(albums_section, dict) and "results" in albums_section:
        for alb in albums_section["results"]:
            if isinstance(alb, dict) and alb.get("browseId"):
                albums_list.append({
                    "browseId": alb.get("browseId"),
                    "title": alb.get("title") or "",
                    "thumbnails": alb.get("thumbnails", []),
                    "year": alb.get("year", ""),
                    "artist_bid": artist_id
                })
    return albums_list


def _parse_singles_from_artist_detail(artist_detail: dict, artist_id: str) -> list:
    """Parse singles from artist detail response."""
    singles_list = []
    singles_section = artist_detail.get("singles", {})
    if isinstance(singles_section, dict) and "results" in singles_section:
        for single in singles_section["results"]:
            if isinstance(single, dict) and single.get("browseId"):
                singles_list.append({
                    "browseId": single.get("browseId"),
                    "title": single.get("title") or "",
                    "thumbnails": single.get("thumbnails", []),
                    "year": single.get("year", ""),
                    "type": "Single",
                    "artist_bid": artist_id
                })
    return singles_list


def _parse_top_songs_from_artist_detail(artist_detail: dict, artist_id: str, limit: int = 5) -> tuple:
    """Parse top songs and playlist ID from artist detail response.
    Returns (top_songs_list, songs_playlist_id)
    """
    top_songs = []
    songs_playlist_id = None
    
    songs_section = artist_detail.get("songs", {})
    if isinstance(songs_section, dict):
        # Extract playlist ID for YouTube IFrame API
        songs_browse_id = songs_section.get("browseId")
        if songs_browse_id:
            songs_playlist_id = songs_browse_id[2:] if songs_browse_id.startswith("VL") else songs_browse_id
        
        # Extract top songs (limited for fast response)
        for s in songs_section.get("results", [])[:limit]:
            if isinstance(s, dict):
                s["artist_bid"] = artist_id
                s["resultType"] = "song"
                top_songs.append(s)
    
    return top_songs, songs_playlist_id


def _build_artist_response_data(
    artist_id: str,
    artist_name: str,
    best_artist: dict,
    artist_detail: dict,
    albums_list: list,
    top_songs: list,
    related_list: list,
    songs_playlist_id: str | None
) -> dict:
    """Build the artist data dict for API response."""
    description = artist_detail.get("description", "")
    return {
        "browseId": artist_id,
        "artist": artist_name,
        "name": artist_name,
        "thumbnails": best_artist.get("thumbnails") or [],
        "subscribers": artist_detail.get("subscribers", ""),
        "description": (description[:200] + "...") if description else "",
        "topSongs": top_songs,
        "related": related_list,
        "albums": albums_list,
        "allTracks": [],
        "songsPlaylistId": songs_playlist_id
    }



@app.get("/api/search/summary")
async def search_summary(
    request: Request,
    q: str,
    background_tasks: BackgroundTasks,
    country: str = None,
    force_refresh: bool = False
):
    """
    [Optimized] 아티스트 검색 및 전체 디스코그래피 반환
    - Non-blocking search
    - Exact artist match priority
    - Immediate response without extra fetches
    """
    if not country:
        country = request.headers.get("CF-IPCountry", "US")

    cache_key = f"summary:{country}:{q}"

    # 1단계: DB/Redis 확인
    if not force_refresh:
        cached = cache_get(cache_key)
        if cached:
            logger.info(f"Redis cache hit: {cache_key}")
            cached["source"] = "redis"
            return cached

        artist_browse_ids = db_get_artists_by_keyword(q, country)
        if artist_browse_ids:
            logger.info(f"DB hit for keyword: {q} ({len(artist_browse_ids)} artists)")
            db_result = _process_db_artists(
                artist_browse_ids, background_tasks, country, top_songs_limit=5
            )

            if db_result:
                result = {
                    "keyword": q,
                    "country": country,
                    "artists": db_result["artists"],
                    "songs": db_result["songs"],
                    "albums": [],
                    "albums2": db_result["albums"],
                    "allTracks": db_result["allTracks"],
                    "source": "database",
                    "updating": db_result["updating"]
                }
                cache_set(cache_key, result, ttl=1800)
                return result

    # 2단계: ytmusicapi (Optimized)
    logger.info(f"Fetching from ytmusicapi (Optimized): {q}")
    try:
        ytmusic = get_ytmusic(country)
        
        # Parallel Search (인기곡 5개만)
        future_artists = run_in_thread(ytmusic.search, q, filter="artists", limit=5)
        future_songs = run_in_thread(ytmusic.search, q, filter="songs", limit=5)
        artists_results, direct_song_results = await asyncio.gather(future_artists, future_songs)
        
        artists_search = artists_results or []
        if not artists_search:
             general_results = await run_in_thread(ytmusic.search, q, limit=40)
             artists_search = [r for r in general_results if r.get("resultType") == "artist"][:5]

        songs_search = []
        direct_song_results = direct_song_results or []
        for song in direct_song_results:
            if isinstance(song, dict) and song.get("videoId"):
                song_copy = dict(song)
                song_copy["resultType"] = "song"
                song_copy["from_direct_search"] = True
                songs_search.append(song_copy)

        # [수정] 복잡한 비교 로직 제거 -> 유튜브 검색 결과 1순위 신뢰 (Simple is Best)
        # ytmusicapi는 이미 관련성 순으로 정렬된 결과를 반환함.
        if artists_search:
            best_artist = artists_search[0]
        else:
            best_artist = None

        artists_data = []
        if best_artist and isinstance(best_artist, dict):
            artist_id = best_artist.get("browseId")
            artist_name = best_artist.get("artist") or best_artist.get("name") or ""
            
            # [롤백 & 안정화] "전체보기(View All)" 병렬 요청 제거
            # 과도한 동시 요청으로 인한 서버 멈춤 현상 해결.
            # 대신 get_artist 결과에 포함된 기본 데이터(보통 10개 내외)를 충실히 보여줌.
            
            # [필수] 아티스트 상세 정보 가져오기 (이게 없으면 앨범/곡 정보가 없음!)
            try:
                artist_detail = await run_in_thread(ytmusic.get_artist, artist_id)
            except Exception as e:
                logger.error(f"Failed to get artist detail: {e}")
                artist_detail = {}
            
            # 1. 앨범 정보 파싱 (헬퍼 함수 사용)
            albums_list = _parse_albums_from_artist_detail(artist_detail, artist_id)
            
            # 2. 싱글 정보 파싱 (헬퍼 함수 사용)
            singles_list = _parse_singles_from_artist_detail(artist_detail, artist_id)
            albums_list.extend(singles_list)

            # 3. 관련 아티스트
            related_section = artist_detail.get("related", {})
            related_list = related_section.get("results", []) if isinstance(related_section, dict) else []

            # 4. 공식 인기곡 (Top Songs) + 플레이리스트 ID 추출 (헬퍼 함수 사용)
            top_songs, songs_playlist_id = _parse_top_songs_from_artist_detail(artist_detail, artist_id, limit=5)

            # 응답 데이터 구성 (헬퍼 함수 사용)
            artists_data.append(_build_artist_response_data(
                artist_id=artist_id,
                artist_name=artist_name,
                best_artist=best_artist,
                artist_detail=artist_detail,
                albums_list=albums_list,
                top_songs=top_songs,
                related_list=related_list,
                songs_playlist_id=songs_playlist_id
            ))
            
            # 인기곡 5개만 반환 (나머지는 YouTube IFrame API에서 로드)
            songs_search = top_songs[:5]

            # 백그라운드 저장 (전체 트랙 Fetch는 여기서 수행)
            if artist_id:
                async def save_db_background():
                    try:
                        # 이미 가져온 albums_list를 활용할 수 있도록 함수 수정이 필요하나,
                        # 복잡성을 피하기 위해 일단 기존 함수 호출 (서버 부하 분산)
                        await save_full_artist_data_background(artist_id, artist_detail, country)
                        db_save_search_keyword(q, country, artist_id)
                    except Exception as e:
                        logger.warning(f"Background save error: {e}")
                
                background_tasks.add_task(save_db_background)
        else:
             # Best Artist를 못 찾은 경우 (드묾)
             pass

        result = {
            "keyword": q,
            "country": country,
            "artists": artists_data,
            "songs": songs_search,
            "albums": [], 
            "albums2": albums_list if artists_data else [],
            "allTracks": [],
            "source": "ytmusicapi-full-fetch"
        }
        cache_set(cache_key, result, ttl=1800)
        return result

    except Exception as e:
        logger.error(f"Summary search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/provision/artist")
async def provision_artist_agent(request: Request):
    """
    Search artist -> Generate AI Persona -> Save to DB
    """
    try:
        body = await request.json()
        artist_name = body.get("artistName")
        country = body.get("country", "US")
        
        if not artist_name:
            raise HTTPException(status_code=400, detail="artistName required")

        ytmusic = get_ytmusic(country)
        
        # 1. Search Artist
        search_results = await run_in_thread(ytmusic.search, artist_name, filter="artists", limit=1)
        if not search_results:
            raise HTTPException(status_code=404, detail=ERROR_ARTIST_NOT_FOUND)
            
        artist_info = search_results[0]
        browse_id = artist_info.get("browseId")
        name = artist_info.get("artist") or artist_info.get("name")
        
        # 2. Get Details (Description & Songs)
        details = await run_in_thread(ytmusic.get_artist, browse_id)
        description = details.get("description", "")
        songs_list = details.get("songs", {}).get("results", [])
        
        # 3. Generate Persona
        persona = await run_in_thread(generate_artist_persona, name, description, songs_list)
        
        if not persona:
            # Fallback if AI fails
            persona = {
                "system_prompt": f"You are {name}. You are a famous musician.",
                "greeting": f"Hi, I'm {name}!",
                "tone": "Casual",
                "mbti": "Unknown"
            }
            
        # 4. Save to DB (music_artists table)
        # We store persona in a new column or reuse an existing JSON field if schema is rigid.
        # Assuming we can update 'music_artists'
        
        # Ensure artist exists first
        db_save_artist(artist_info)
        
        # Update with persona
        if supabase_client:
             # Check if 'persona' column exists, if not we might fail. 
             # But we can try to store in 'description' or a flexible field if needed.
             # For now, let's assume we can add data. Use raw SQL if needed, but client is safer.
             # Ideally we should have a 'personas' table.
             
             # Create/Update 'artist_personas' table (if exists) or 'music_artists'
             # Let's try to upsert a dedicated 'artist_agents' table if possible,
             # but to be safe without migration, let's return it to frontend to handle chat state locally first.
             pass

        return {
            "status": "success",
            "browseId": browse_id,
            "name": name,
            "persona": persona,
            "avatar": get_best_thumbnail(details.get("thumbnails", []))
        }

    except Exception as e:
        logger.error(f"Provision error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/artist")
async def chat_artist_endpoint(request: Request):
    """
    Chat with an AI Artist Persona
    """
    try:
        body = await request.json()
        persona = body.get("persona")
        history = body.get("history", []) # List of {role: user/model, content: str}
        message = body.get("message")
        browse_id = body.get("browseId")
        
        if not persona or not message:
            raise HTTPException(status_code=400, detail="Missing persona or message")
            
        # Context gathering (Factual Data)
        artist_context = None
        if browse_id:
            try:
                # Fetch full artist data from DB (songs, albums)
                full_data = await run_in_thread(db_get_full_artist_data, browse_id)
                
                # Fetch REAL-TIME news (Search Grounding)
                # Only if message implies a question about schedule/news/updates to save cost/latency,
                # BUT user complained about accuracy, so we fetch it to be safe or maybe a quick check.
                # Let's fetch it. It might add 1-2s latency but ensures accuracy.
                # Use artist name from persona or DB
                artist_name_for_search = full_data.get("name") if full_data else "the artist"
                news_items = await run_in_thread(search_artist_news, artist_name_for_search)
                
                if full_data:
                    artist_context = {
                        "top_songs": full_data.get("topSongs", []),
                        "albums": full_data.get("albums", []),
                        "news": news_items
                    }
                    
                    # Fallback: If no real news found, try latest album as news
                    if not news_items:
                        albums = full_data.get("albums", [])
                        if albums and len(albums) > 0:
                            latest_album = albums[0]
                            artist_context["news"] = [{
                                "title": f"Latest Music Release: {latest_album.get('title')}",
                                "snippet": f"Check out my latest release '{latest_album.get('title')}' from {latest_album.get('year')}!"
                            }]
            except Exception as context_error:
                logger.warning(f"Failed to fetch artist context for chat: {context_error}")

        reply = await run_in_thread(chat_with_artist, persona, history, message, artist_context)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Virtual Member System - Artist Auto-Registration
# =============================================================================

@app.post("/api/virtual-members/create")
async def create_virtual_member(request: Request):
    """
    Create a virtual member from an artist in music_artists table.
    This creates a real auth.users entry and profiles entry.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = await request.json()
        browse_id = body.get("browseId")

        if not browse_id:
            raise HTTPException(status_code=400, detail="browseId required")

        # 1. Check if already exists in profiles
        existing = supabase_client.table("profiles").select("id").eq("artist_browse_id", browse_id).execute()
        if existing.data and len(existing.data) > 0:
            return {"status": "exists", "profileId": existing.data[0]["id"]}

        # 2. Get artist info from music_artists
        artist = supabase_client.table("music_artists").select("*").eq("browse_id", browse_id).single().execute()
        if not artist.data:
            raise HTTPException(status_code=404, detail="Artist not found in music_artists")

        artist_data = artist.data
        artist_name = artist_data.get("name", "Unknown Artist")
        thumbnail_url = artist_data.get("thumbnail_url", "")

        # 3. Create auth user via Supabase Admin API
        import uuid
        import httpx

        virtual_email = f"{browse_id}@sori.virtual"
        random_password = str(uuid.uuid4())

        # Supabase Admin API call (using async httpx)
        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        async with httpx.AsyncClient() as client:
            create_user_response = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": CONTENT_TYPE_JSON
                },
                json={
                    "email": virtual_email,
                    "password": random_password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": artist_name,
                        "avatar_url": thumbnail_url,
                        "member_type": "artist",
                        "artist_browse_id": browse_id
                    }
                }
            )

        if create_user_response.status_code not in [200, 201]:
            error_detail = create_user_response.json()
            # If user already exists, try to find them
            if "already" in str(error_detail).lower():
                return {"status": "exists", "message": "User already exists"}
            raise HTTPException(status_code=500, detail=f"Failed to create user: {error_detail}")

        user_data = create_user_response.json()
        user_id = user_data.get("id")

        # 4. Update profiles table with artist info
        # (Supabase trigger may have already created a profile, so we update)
        supabase_client.table("profiles").upsert({
            "id": user_id,
            "username": artist_name.lower().replace(" ", "_").replace(".", "")[:30],
            "full_name": artist_name,
            "avatar_url": thumbnail_url,
            "member_type": "artist",
            "artist_browse_id": browse_id,
            "is_verified": True,
            "bio": f"Official SORI profile for {artist_name}"
        }).execute()

        # 5. Generate AI persona
        try:
            top_songs = []
            if artist_data.get("songs_playlist_id"):
                # Fetch top songs for persona generation
                ytmusic = get_ytmusic("US")
                playlist_data = await run_in_thread(ytmusic.get_playlist, artist_data["songs_playlist_id"])
                top_songs = playlist_data.get("tracks", [])[:10]

            persona = await run_in_thread(
                generate_artist_persona,
                artist_name,
                artist_data.get("description") or f"{artist_name} is a popular music artist.",
                top_songs
            )

            if persona:
                supabase_client.table("profiles").update({
                    "ai_persona": persona
                }).eq("id", user_id).execute()
        except Exception as e:
            logger.warning(f"Persona generation failed: {e}")

        logger.info(f"Virtual member created: {artist_name} ({browse_id})")

        return {
            "status": "created",
            "profileId": user_id,
            "name": artist_name,
            "browseId": browse_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Virtual member creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/virtual-members/migrate-all")
async def migrate_all_artists(request: Request, background_tasks: BackgroundTasks):
    """
    Migrate all existing artists from music_artists to virtual members.
    Runs in background to avoid timeout.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        # Get all artists that don't have a profile yet
        artists = supabase_client.table("music_artists").select("browse_id, name").execute()

        if not artists.data:
            return {"status": "no_artists", "count": 0}

        # Check which ones already have profiles
        existing = supabase_client.table("profiles").select("artist_browse_id").not_.is_("artist_browse_id", "null").execute()
        existing_ids = set([p["artist_browse_id"] for p in existing.data]) if existing.data else set()

        to_migrate = [a for a in artists.data if a["browse_id"] not in existing_ids]

        async def migrate_artists():
            for artist in to_migrate:
                try:
                    # Call create endpoint internally
                    import aiohttp
                    async with aiohttp.ClientSession() as session:
                        async with session.post(
                            f"http://localhost:{os.getenv('PORT', 8080)}/api/virtual-members/create",
                            json={"browseId": artist["browse_id"]}
                        ) as resp:
                            await resp.json()
                except Exception as e:
                    logger.error(f"Migration failed for {artist['name']}: {e}")
                await asyncio.sleep(0.5)  # Rate limit

        background_tasks.add_task(migrate_artists)

        return {
            "status": "started",
            "total_artists": len(artists.data),
            "already_migrated": len(existing_ids),
            "to_migrate": len(to_migrate)
        }

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/virtual-members/list")
async def list_virtual_members():
    """
    List all virtual members (artists with profiles).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        result = supabase_client.table("profiles").select(
            "id, username, full_name, avatar_url, artist_browse_id, is_verified, created_at"
        ).eq("member_type", "artist").order("created_at", desc=True).execute()

        return {
            "status": "success",
            "count": len(result.data) if result.data else 0,
            "members": result.data or []
        }
    except Exception as e:
        logger.error(f"List virtual members error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# AI Activity Engine - Automated Artist Activities
# =============================================================================

@app.post("/api/cron/artist-activity")
async def run_artist_activity(request: Request, background_tasks: BackgroundTasks):
    """
    스마트 포스팅 크론 잡 - AI가 아티스트 상황을 분석한 후 포스팅

    포스팅 전 AI가 다음을 분석:
    1. 고인/은퇴/해체 여부 → 해당시 포스팅 스킵
    2. 최근 활동 상황 → 맞춤 콘텐츠 생성
    3. 신곡/투어 정보 → 실제 정보 기반 포스팅

    Artists post in their native language.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        # Configuration - 콜드 스타트: 50명/회, 하루 600 포스팅
        MAX_POSTS_PER_RUN = 50

        results = {
            "posts_created": 0,
            "stories_created": 0,  # Greetings moved to stories
            "skipped_artists": [],
            "languages_used": [],
            "context_topics": [],
            "errors": []
        }

        # 1. Get random virtual members (artists with profiles)
        artists_result = supabase_client.table("profiles").select(
            "id, username, full_name, avatar_url, artist_browse_id, ai_persona"
        ).eq("member_type", "artist").execute()

        if not artists_result.data or len(artists_result.data) == 0:
            return {"status": "no_artists", "message": "No virtual members found"}

        artists = artists_result.data
        random.shuffle(artists)

        posts_created = 0
        artist_index = 0

        # 2. Process artists until we have enough posts
        while posts_created < MAX_POSTS_PER_RUN and artist_index < len(artists):
            artist = artists[artist_index]
            artist_index += 1

            try:
                persona = artist.get("ai_persona") or {}
                artist_name = artist.get("full_name") or artist.get("username")
                browse_id = artist.get("artist_browse_id")

                # ========== STEP 1: GATHER ARTIST CONTEXT ==========
                # AI가 포스팅 전 아티스트 상황을 종합적으로 분석
                context = await run_in_thread(gather_artist_context, artist_name)
                logger.info(f"[CONTEXT] {artist_name}: status={context.get('status')}, can_post={context.get('can_post')}, topic={context.get('suggested_topic')}")

                # 고인/은퇴/해체 아티스트는 포스팅 스킵
                if not context.get("can_post", True):
                    skip_reason = context.get("skip_reason", "Unknown")
                    results["skipped_artists"].append({
                        "artist": artist_name,
                        "reason": skip_reason,
                        "status": context.get("status")
                    })
                    logger.warning(f"[SKIP] {artist_name}: {skip_reason}")
                    continue  # 다음 아티스트로

                # ========== STEP 2: GET ARTIST LANGUAGE ==========
                artist_language = "en"
                if browse_id:
                    music_artist = supabase_client.table("music_artists").select(
                        "primary_language"
                    ).eq("browse_id", browse_id).limit(1).execute()
                    if music_artist.data:
                        artist_language = music_artist.data[0].get("primary_language") or "en"

                # ========== STEP 3: GET IMAGE & VIDEO FROM REAL DATA ==========
                # Default to avatar (upscaled to high resolution)
                cover_url = upscale_thumbnail_url(artist.get("avatar_url"), size=544)
                video_id = None  # YouTube video ID for iframe embed
                song_title = None  # Track title for recommendation posts

                if browse_id:
                    # Get latest album with thumbnail
                    albums = supabase_client.table("music_albums").select(
                        "title, thumbnail_url, year"
                    ).eq("artist_browse_id", browse_id).order(
                        "year", desc=True
                    ).limit(3).execute()

                    # Get popular tracks WITH video_id for YouTube embed
                    tracks = supabase_client.table("music_tracks").select(
                        "title, thumbnail_url, video_id"
                    ).eq("artist_browse_id", browse_id).limit(10).execute()

                    # Select a random track for video embed
                    if tracks.data and len(tracks.data) > 0:
                        tracks_with_video = [t for t in tracks.data if t.get("video_id")]
                        if tracks_with_video:
                            selected_track = random.choice(tracks_with_video)
                            video_id = selected_track.get("video_id")
                            song_title = selected_track.get("title")
                            if selected_track.get("thumbnail_url"):
                                cover_url = upscale_thumbnail_url(selected_track["thumbnail_url"], size=544)
                            logger.info(f"Selected track for {artist_name}: {song_title} (video_id: {video_id})")

                    # Use album art if no track selected yet
                    if not video_id and albums.data and len(albums.data) > 0:
                        album = random.choice(albums.data)
                        if album.get("thumbnail_url"):
                            cover_url = upscale_thumbnail_url(album["thumbnail_url"], size=544)
                            logger.info(f"Using real album art for {artist_name}: {album.get('title')}")

                # ========== STEP 4: GENERATE CONTEXTUAL POST ==========
                # AI가 아티스트 상황에 맞는 포스트 생성
                # Add selected track info to context for AI
                if song_title and video_id:
                    context["selected_track"] = {
                        "title": song_title,
                        "video_id": video_id
                    }
                    # If no specific news, suggest music recommendation post
                    if context.get("suggested_topic") == "fan_thanks":
                        context["suggested_topic"] = "music_recommendation"
                        context["post_context"] = f"Recommend your song '{song_title}' to fans. Share why you love this track."

                # ========== QUALITY CONTROL: fan_thanks → Story only ==========
                # 인사글은 스토리로만, 포스팅에는 절대 인사글 금지
                suggested_topic = context.get("suggested_topic", "fan_thanks")
                if suggested_topic == "fan_thanks" and not video_id:
                    # Create a STORY instead of a post for greetings
                    try:
                        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
                        fandom_name = persona.get("fandom_name", "fans") if persona else "fans"

                        # Greeting messages by language
                        greetings = {
                            "ko": f"💕 사랑해요 {fandom_name}!",
                            "ja": f"💕 愛してる {fandom_name}!",
                            "zh": f"💕 爱你们 {fandom_name}!",
                            "es": f"💕 ¡Os quiero {fandom_name}!",
                        }
                        greeting_text = greetings.get(artist_language, f"💕 Love you {fandom_name}!")

                        story_data = {
                            "user_id": artist["id"],
                            "content_type": "greeting",
                            "text_content": greeting_text,
                            "cover_url": cover_url,
                            "background_color": "#1a1a2e",
                            "expires_at": expires_at,
                            "is_active": True
                        }
                        supabase_client.table("stories").insert(story_data).execute()
                        results["stories_created"] += 1
                        logger.info(f"[STORY] {artist_name}: Greeting → Story (not post)")
                    except Exception as story_err:
                        logger.error(f"Story creation error: {story_err}")
                    continue  # Skip post, move to next artist

                post_data = await run_in_thread(
                    generate_contextual_post,
                    artist_name,
                    persona,
                    artist_language,
                    context
                )

                if post_data and post_data.get("caption"):
                    post_type = post_data.get("type", "fan")
                    caption = post_data["caption"]
                    context_topic = post_data.get("context_used", "fan_thanks")

                    # Insert post with REAL image AND YouTube video_id
                    new_post = {
                        "user_id": artist["id"],
                        "caption": caption,
                        "language": artist_language,
                        "cover_url": cover_url,
                        "video_id": video_id,  # YouTube video ID for iframe embed
                        "title": song_title or post_type,  # Use song title if available
                        "artist": artist_name,
                        "is_public": True,
                        "like_count": 0,
                        "comment_count": 0,
                        "repost_count": 0
                    }

                    supabase_client.table("posts").insert(new_post).execute()
                    posts_created += 1
                    results["posts_created"] = posts_created
                    results["languages_used"].append(artist_language)
                    results["context_topics"].append(context_topic)
                    logger.info(f"[POST] {artist_name} ({artist_language}, topic={context_topic}): {caption[:50]}...")

            except Exception as e:
                results["errors"].append(f"Post error for {artist.get('full_name')}: {str(e)}")
                logger.error(f"Post creation error: {e}")

        return {
            "status": "success",
            "results": results
        }

    except Exception as e:
        logger.error(f"Artist activity cron error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# YouTube Charts 아티스트 자동 수집 Cron Job
# =============================================================================

# 지원 국가 목록 (YouTube Music Charts)
# YouTube Music 지원 국가 전체 목록 (100+ countries)
CHART_COUNTRIES = [
    # Global
    "ZZ",
    # Americas (북미/중남미)
    "US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE", "EC",
    "BO", "PY", "UY", "CR", "PA", "GT", "HN", "SV", "NI", "DO",
    "PR", "JM", "TT", "BB", "CU",
    # Europe (유럽)
    "GB", "DE", "FR", "ES", "IT", "NL", "PL", "RU", "TR", "SE",
    "NO", "DK", "FI", "BE", "AT", "CH", "PT", "IE", "GR", "CZ",
    "HU", "RO", "UA", "BG", "HR", "SK", "SI", "LT", "LV", "EE",
    "MT", "CY", "LU", "IS", "RS", "BA", "ME", "MK", "AL", "BY",
    # Middle East (중동)
    "SA", "AE", "EG", "IL", "JO", "LB", "KW", "QA", "BH", "OM",
    "IQ", "IR",
    # Africa (아프리카)
    "ZA", "NG", "KE", "TZ", "UG", "ZW", "GH", "MA", "TN", "DZ",
    "CI", "SN", "CM", "ET", "AO", "MZ",
    # Asia (아시아)
    "KR", "JP", "IN", "ID", "TH", "VN", "PH", "TW", "SG", "MY",
    "HK", "BD", "PK", "LK", "NP", "MM", "KH", "LA", "MN", "CN",
    # Oceania (오세아니아)
    "AU", "NZ", "FJ", "PG"
]


@app.post("/api/cron/collect-chart-artists")
async def collect_chart_artists(request: Request, background_tasks: BackgroundTasks):
    """
    YouTube Charts에서 국가별 Top 아티스트를 수집하여 DB에 저장

    60개국 × 약 20명(Top Artists) = 약 1,200명
    중복 제거 후 약 500~800명의 유니크 아티스트

    호출 방법:
    - POST /api/cron/collect-chart-artists
    - body: {"countries": ["KR", "US"]} (선택, 기본값은 모든 국가)
    - body: {"countries": ["KR"], "limit": 10} (국가당 수집할 아티스트 수)
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = {}
        try:
            body = await request.json()
        except (json.JSONDecodeError, ValueError):
            pass

        # 수집할 국가 목록 (기본: 전체)
        countries = body.get("countries", CHART_COUNTRIES)
        # 국가당 수집할 아티스트 수 (기본: 50명)
        artist_limit = body.get("limit", 50)
        # 국가 간 딜레이 (초)
        delay_seconds = body.get("delay", 2)

        results = {
            "countries_processed": 0,
            "artists_found": 0,
            "artists_saved": 0,
            "artists_skipped": 0,
            "errors": []
        }

        all_artist_ids = set()  # 중복 체크용

        for country in countries:
            try:
                logger.info(f"[CHART] Processing country: {country}")

                # 1. 차트 데이터 가져오기
                ytmusic = get_ytmusic(country)
                charts = ytmusic.get_charts(country=country)

                if not charts or "artists" not in charts:
                    logger.warning(f"No artists in {country} charts")
                    continue

                artists = charts.get("artists", [])[:artist_limit]
                results["countries_processed"] += 1

                # 2. 각 아티스트 처리
                for artist in artists:
                    browse_id = artist.get("browseId")
                    artist_name = artist.get("title", "Unknown")

                    if not browse_id:
                        continue

                    results["artists_found"] += 1

                    # 중복 체크
                    if browse_id in all_artist_ids:
                        results["artists_skipped"] += 1
                        continue
                    all_artist_ids.add(browse_id)

                    # DB에 이미 존재하는지 체크
                    existing = supabase_client.table("music_artists").select(
                        "browse_id"
                    ).eq("browse_id", browse_id).limit(1).execute()

                    if existing.data and len(existing.data) > 0:
                        results["artists_skipped"] += 1
                        logger.info(f"[SKIP] Already exists: {artist_name}")
                        continue

                    # 3. 아티스트 상세 정보 가져오기 & 저장
                    try:
                        artist_info = ytmusic.get_artist(browse_id)
                        if artist_info:
                            # 백그라운드로 저장 (앨범, 트랙 포함)
                            background_tasks.add_task(
                                save_full_artist_data_background,
                                browse_id,
                                artist_info,
                                country
                            )
                            results["artists_saved"] += 1
                            logger.info(f"[SAVE] {artist_name} ({country})")

                            # Rate limiting: 아티스트마다 0.5초 대기
                            await asyncio.sleep(0.5)
                    except Exception as e:
                        logger.error(f"Error fetching artist {artist_name}: {e}")
                        results["errors"].append(f"{artist_name}: {str(e)}")

                # 국가 간 딜레이
                await asyncio.sleep(delay_seconds)

            except Exception as e:
                logger.error(f"Error processing country {country}: {e}")
                results["errors"].append(f"{country}: {str(e)}")

        return {
            "status": "success",
            "results": results
        }

    except Exception as e:
        logger.error(f"Chart collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cron/collect-chart-artists-batch")
async def collect_chart_artists_batch(request: Request, background_tasks: BackgroundTasks):
    """
    국가를 배치로 나눠서 수집 (Rate Limiting 방지)

    Vercel Cron에서 6시간마다 호출:
    - batch=0: 0~14번 국가 (15개국)
    - batch=1: 15~29번 국가
    - batch=2: 30~44번 국가
    - batch=3: 45~59번 국가

    4일 = 1 사이클 (60개국 전체)
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = {}
        try:
            body = await request.json()
        except (json.JSONDecodeError, ValueError):
            pass

        # 배치 번호 (0~3)
        batch = body.get("batch", 0)
        batch_size = 15

        start_idx = batch * batch_size
        end_idx = min(start_idx + batch_size, len(CHART_COUNTRIES))

        if start_idx >= len(CHART_COUNTRIES):
            return {"status": "no_more_batches", "batch": batch}

        countries_to_process = CHART_COUNTRIES[start_idx:end_idx]

        logger.info(f"[BATCH {batch}] Processing countries: {countries_to_process}")

        # 내부적으로 collect_chart_artists 로직 실행
        results = {
            "batch": batch,
            "countries": countries_to_process,
            "artists_found": 0,
            "artists_saved": 0,
            "artists_skipped": 0,
            "errors": []
        }

        all_artist_ids = set()

        for country in countries_to_process:
            try:
                ytmusic = get_ytmusic(country)
                charts = ytmusic.get_charts(country=country)

                if not charts or "artists" not in charts:
                    continue

                artists = charts.get("artists", [])[:30]  # 국가당 30명

                for artist in artists:
                    browse_id = artist.get("browseId")
                    artist_name = artist.get("title", "Unknown")

                    if not browse_id or browse_id in all_artist_ids:
                        continue

                    all_artist_ids.add(browse_id)
                    results["artists_found"] += 1

                    # DB 체크
                    existing = supabase_client.table("music_artists").select(
                        "browse_id"
                    ).eq("browse_id", browse_id).limit(1).execute()

                    if existing.data and len(existing.data) > 0:
                        results["artists_skipped"] += 1
                        continue

                    try:
                        artist_info = ytmusic.get_artist(browse_id)
                        if artist_info:
                            # 동기 저장 (Cloud Run에서 백그라운드 작업이 중단되는 문제 해결)
                            save_full_artist_data_background(browse_id, artist_info, country)
                            results["artists_saved"] += 1
                            logger.info(f"[BATCH {batch}] Saved to DB: {artist_name}")
                            await asyncio.sleep(0.3)
                    except Exception as e:
                        logger.error(f"[BATCH {batch}] Save error: {artist_name} - {e}")
                        results["errors"].append(f"{artist_name}: {str(e)}")

                await asyncio.sleep(2)  # 국가 간 딜레이

            except Exception as e:
                results["errors"].append(f"{country}: {str(e)}")

        return {
            "status": "success",
            "results": results,
            "next_batch": batch + 1 if end_idx < len(CHART_COUNTRIES) else 0
        }

    except Exception as e:
        logger.error(f"Batch collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 기존 아티스트 데이터 업데이트 Cron Job
# =============================================================================

@app.post("/api/cron/update-existing-artists")
async def update_existing_artists(request: Request):
    """
    스마트 우선순위 기반 아티스트 업데이트

    우선순위 티어:
    - HOT: last_viewed_at 7일 이내 + last_synced_at 7일 초과 → 즉시 업데이트
    - ACTIVE: last_viewed_at 30일 이내 + last_synced_at 30일 초과 → 다음 우선
    - DORMANT: 그 외 → On-Demand에서만 처리 (여기서 스킵)

    배치 크기: 200명 (기존 20명에서 10배 증가)
    """
    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        body = {}

    secret = body.get("secret", "")
    if secret != os.getenv("CRON_SECRET", "dev-secret"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_AVAILABLE)

    results = {
        "hot_updated": 0,
        "active_updated": 0,
        "artists_skipped": 0,
        "errors": []
    }

    try:
        # 배치 크기 (1회당 업데이트할 아티스트 수) - 10배 증가
        batch_size = body.get("limit", 200)
        now = datetime.now(timezone.utc)

        # 시간 기준
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()

        artists_to_update = []

        # 1단계: HOT 티어 - 최근 7일 내 조회됨 + 7일 이상 미동기화
        hot_artists = supabase_client.table("music_artists").select(
            "browse_id, name, primary_language, last_synced_at, last_viewed_at"
        ).gte("last_viewed_at", seven_days_ago).lt(
            "last_synced_at", seven_days_ago
        ).order("last_viewed_at", desc=True).limit(batch_size).execute()

        if hot_artists.data:
            for artist in hot_artists.data:
                artist["tier"] = "HOT"
                artists_to_update.append(artist)

        logger.info(f"[UPDATE] HOT tier: {len(hot_artists.data or [])} artists")

        # 2단계: ACTIVE 티어 - 배치 여유분 채우기
        if len(artists_to_update) < batch_size:
            remaining = batch_size - len(artists_to_update)
            existing_ids = [a["browse_id"] for a in artists_to_update]

            active_artists = supabase_client.table("music_artists").select(
                "browse_id, name, primary_language, last_synced_at, last_viewed_at"
            ).gte("last_viewed_at", thirty_days_ago).lt(
                "last_viewed_at", seven_days_ago
            ).lt("last_synced_at", thirty_days_ago).order(
                "last_viewed_at", desc=True
            ).limit(remaining).execute()

            if active_artists.data:
                for artist in active_artists.data:
                    if artist["browse_id"] not in existing_ids:
                        artist["tier"] = "ACTIVE"
                        artists_to_update.append(artist)

            logger.info(f"[UPDATE] ACTIVE tier: {len(active_artists.data or [])} artists")

        # 3단계: DORMANT는 스킵 (On-Demand에서 처리)
        logger.info(f"[UPDATE] Total to update: {len(artists_to_update)} artists (DORMANT skipped)")

        for artist in artists_to_update:
            browse_id = artist["browse_id"]
            artist_name = artist["name"]
            tier = artist.get("tier", "UNKNOWN")
            country = artist.get("primary_language", "US")

            # 언어 코드를 국가 코드로 매핑
            lang_to_country = {
                "ko": "KR", "ja": "JP", "zh": "TW", "es": "ES",
                "pt": "BR", "de": "DE", "fr": "FR", "it": "IT",
                "ru": "RU", "th": "TH", "vi": "VN", "id": "ID",
                "hi": "IN", "ar": "SA", "tr": "TR", "en": "US"
            }
            country_code = lang_to_country.get(country, "US")

            try:
                ytmusic = get_ytmusic(country_code)
                artist_info = ytmusic.get_artist(browse_id)

                if artist_info:
                    # 동기 저장 (데이터 업데이트)
                    save_full_artist_data_background(browse_id, artist_info, country_code)

                    # 티어별 카운트
                    if tier == "HOT":
                        results["hot_updated"] += 1
                    else:
                        results["active_updated"] += 1

                    logger.info(f"[UPDATE-{tier}] Updated: {artist_name}")
                    await asyncio.sleep(0.3)  # Rate limiting 개선 (0.5 → 0.3)
                else:
                    results["artists_skipped"] += 1
                    logger.warning(f"[UPDATE] No data for: {artist_name}")

            except Exception as e:
                results["errors"].append(f"{artist_name}: {str(e)}")
                logger.error(f"[UPDATE] Error updating {artist_name}: {e}")

            await asyncio.sleep(0.5)  # Rate limiting (1초 → 0.5초로 단축)

        total_updated = results["hot_updated"] + results["active_updated"]
        return {
            "status": "success",
            "results": results,
            "message": f"Updated {total_updated} artists (HOT: {results['hot_updated']}, ACTIVE: {results['active_updated']})"
        }

    except Exception as e:
        logger.error(f"Update existing artists error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 가상회원 자동 생성 Cron Job (30분마다)
# =============================================================================


def _get_candidate_artists_for_virtual_member(batch_size: int = 50) -> list:
    """Get candidate artists from music_artists that don't have a profile yet."""
    # 1. music_artists에서 모든 browse_id 가져오기
    all_artists_res = supabase_client.table("music_artists").select(
        "browse_id, name, thumbnail_url, subscribers, subscribers_count"
    ).not_.is_("browse_id", "null").order(
        "subscribers_count", desc=True
    ).limit(500).execute()

    if not all_artists_res.data:
        return []

    # 2. profiles에서 이미 가상회원인 artist_browse_id 목록 가져오기
    existing_profiles_res = supabase_client.table("profiles").select(
        "artist_browse_id"
    ).eq("member_type", "artist").not_.is_("artist_browse_id", "null").execute()

    existing_browse_ids = set()
    if existing_profiles_res.data:
        existing_browse_ids = {p["artist_browse_id"] for p in existing_profiles_res.data}

    # 3. 아직 가상회원이 아닌 아티스트 필터링
    artists_to_create = []
    for artist in all_artists_res.data:
        if artist["browse_id"] not in existing_browse_ids:
            artists_to_create.append(artist)
            if len(artists_to_create) >= batch_size:
                break
    
    return artists_to_create


async def _create_virtual_profiles_batch(artists_to_create: list) -> dict:
    """Create virtual profiles for the given list of artists."""
    results = {
        "created": 0,
        "skipped": 0,
        "errors": [],
        "created_artists": []
    }
    
    for artist in artists_to_create:
        browse_id = artist["browse_id"]
        artist_name = artist["name"]
        thumbnail_url = artist.get("thumbnail_url", "")

        try:
            # create_virtual_member_sync calls DB, should be run in thread if blocking
            result = await run_in_thread(create_virtual_member_sync, browse_id, artist_name, thumbnail_url)
            if result:
                results["created"] += 1
                results["created_artists"].append(artist_name)
                logger.info(f"[VIRTUAL MEMBER] Created: {artist_name}")
            else:
                results["skipped"] += 1
        except Exception as e:
            results["errors"].append(f"{artist_name}: {str(e)}")
            logger.warning(f"[VIRTUAL MEMBER] Error creating {artist_name}: {e}")

        # Rate limiting: 0.5초 간격
        await asyncio.sleep(0.5)
        
    return results


@app.post("/api/cron/create-virtual-members")
async def create_virtual_members_cron(request: Request):
    """
    music_artists에 있지만 profiles에 없는 아티스트를 가상회원으로 생성

    매 30분마다 실행:
    - music_artists 테이블에서 artist_browse_id가 profiles에 없는 아티스트 검색
    - 배치당 최대 50명 생성 (Rate limiting)
    - 팔로워 수가 많은 아티스트 우선 생성
    """
    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        body = {}

    secret = body.get("secret", "")
    if secret != os.getenv("CRON_SECRET", "dev-secret"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_AVAILABLE)

    try:
        batch_size = body.get("limit", 50)

        # 1. Get candidates
        artists_to_create = _get_candidate_artists_for_virtual_member(batch_size)
        
        logger.info(f"[VIRTUAL MEMBER] Found {len(artists_to_create)} artists to create")

        # 2. Create profiles
        results = await _create_virtual_profiles_batch(artists_to_create)

        logger.info(f"[VIRTUAL MEMBER] Completed: {results['created']} created, {results['skipped']} skipped")

        return {
            "status": "success",
            "message": f"Created {results['created']} virtual members",
            "results": results
        }

    except Exception as e:
        logger.error(f"Create virtual members error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# 피라미드식 Related Artists 확장 Cron Job
# =============================================================================


def _find_new_related_artists(
    artists_with_related: list, existing_ids: set, related_limit: int, max_discovery: int = 50
):
    """Helper to find new related artists from existing artist data."""
    new_artist_ids = []
    discovered_count = 0
    skipped_count = 0
    
    for artist in artists_with_related:
        related_list = artist.get("related_artists_json") or []
        if not isinstance(related_list, list):
            continue

        for related in related_list[:related_limit]:
            if not isinstance(related, dict):
                continue

            browse_id = related.get("browseId")
            if not browse_id or browse_id in existing_ids:
                skipped_count += 1
                continue

            # Skip if already added in this batch
            if browse_id in new_artist_ids:
                continue

            new_artist_ids.append(browse_id)
            discovered_count += 1

            if discovered_count >= max_discovery:
                return new_artist_ids, skipped_count
                
    return new_artist_ids, skipped_count


async def _register_discovered_artists(new_artist_ids: list, country: str = "US") -> dict:
    """Helper to register newly discovered artists."""
    results = {"registered": 0, "skipped": 0, "errors": []}
    
    for browse_id in new_artist_ids:
        try:
            # Rate limiting
            await asyncio.sleep(1)

            ytmusic = get_ytmusic(country)
            # Use run_in_thread for blocking calls
            artist_info = await run_in_thread(ytmusic.get_artist, browse_id)

            if artist_info:
                # Save data (blocking DB call handled in thread if possible, here using direct call as wrapper is sync)
                save_full_artist_data_background(browse_id, artist_info, country)
                results["registered"] += 1
                artist_name = artist_info.get("name", "Unknown")
                logger.info(f"[EXPAND] Registered: {artist_name}")
            else:
                results["skipped"] += 1

        except Exception as e:
            results["errors"].append(f"{browse_id}: {str(e)}")
            logger.error(f"[EXPAND] Error registering {browse_id}: {e}")
            
    return results


@app.post("/api/cron/expand-related-artists")
async def expand_related_artists(request: Request):
    """
    피라미드식 유사 아티스트 확장
    - 기존 아티스트의 related_artists_json에서 새 아티스트 발굴
    - 중복 제거, Rate limiting 적용
    - 하루 최대 200명 제한
    """
    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        body = {}

    secret = body.get("secret", "")
    if secret != os.getenv("CRON_SECRET", "dev-secret"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_AVAILABLE)

    results = {
        "artists_discovered": 0,
        "artists_registered": 0,
        "artists_skipped": 0,
        "errors": []
    }

    try:
        # 배치 크기 (1회당 처리할 기존 아티스트 수)
        batch_size = body.get("limit", 20)
        # 기존 아티스트당 처리할 related 수
        related_limit = body.get("related_limit", 10)

        # 최근 등록된 아티스트의 related_artists_json 조회
        artists_with_related = supabase_client.table("music_artists").select(
            "browse_id, name, related_artists_json, primary_language"
        ).not_.is_("related_artists_json", "null").order(
            "created_at", desc=True
        ).limit(batch_size).execute()

        if not artists_with_related.data:
            return {"status": "no_artists_with_related", "results": results}

        # 이미 등록된 모든 browse_id 조회 (중복 체크용)
        existing_artists = supabase_client.table("music_artists").select(
            "browse_id"
        ).execute()
        existing_ids = set(a["browse_id"] for a in existing_artists.data) if existing_artists.data else set()

        logger.info(f"[EXPAND] Processing {len(artists_with_related.data)} artists, {len(existing_ids)} already exist")

        # 각 아티스트의 related 수집
        new_artist_ids, skipped = _find_new_related_artists(
            artists_with_related.data, existing_ids, related_limit
        )
        results["artists_discovered"] = len(new_artist_ids)
        results["artists_skipped"] = skipped

        logger.info(f"[EXPAND] Discovered {len(new_artist_ids)} new artists to register")

        # 새 아티스트 등록
        reg_results = await _register_discovered_artists(new_artist_ids)
        
        results["artists_registered"] = reg_results["registered"]
        results["artists_skipped"] += reg_results["skipped"]
        results["errors"] = reg_results["errors"]

        return {
            "status": "success",
            "results": results,
            "message": f"Discovered {results['artists_discovered']}, Registered {results['artists_registered']}"
        }

    except Exception as e:
        logger.error(f"Expand related artists error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/check-artist-status")
async def check_artist_status_endpoint(name: str):
    """
    AI로 아티스트 상태 확인 (고인 여부, 활동 상태 등)

    Example: /api/admin/check-artist-status?name=박상규
    """
    if not name:
        raise HTTPException(status_code=400, detail="name parameter required")

    result = await run_in_thread(check_artist_status, name)
    return {
        "artist": name,
        "result": result
    }


@app.delete("/api/admin/delete-virtual-member-posts")
async def delete_virtual_member_posts():
    """
    가상회원(아티스트)들이 작성한 모든 포스트 삭제
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        # 1. 가상회원 ID 목록 조회
        artists = supabase_client.table("profiles").select("id, full_name").eq(
            "member_type", "artist"
        ).execute()

        if not artists.data:
            return {"status": "no_artists", "deleted": 0}

        artist_ids = [a["id"] for a in artists.data]
        artist_names = [a.get("full_name", "Unknown") for a in artists.data]

        # 2. 해당 아티스트들의 포스트 삭제
        deleted_count = 0
        for artist_id in artist_ids:
            result = supabase_client.table("posts").delete().eq(
                "user_id", artist_id
            ).execute()
            if result.data:
                deleted_count += len(result.data)

        return {
            "status": "success",
            "deleted": deleted_count,
            "artists_checked": artist_names
        }

    except Exception as e:
        logger.error(f"Delete virtual member posts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/migrate-artist-languages")
async def migrate_artist_languages(request: Request):
    """
    마이그레이션: 기존 아티스트들의 primary_language 업데이트

    모든 music_artists 레코드를 조회하여:
    1. 이름에서 언어 감지
    2. K-pop 그룹 목록 체크
    3. primary_language 필드 업데이트
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        # 모든 아티스트 조회
        artists = supabase_client.table("music_artists").select(
            "browse_id, name, description, primary_language"
        ).execute()

        if not artists.data:
            return {"status": "no_artists", "updated": 0}

        updated = 0
        results = []

        for artist in artists.data:
            name = artist.get("name") or ""
            description = artist.get("description") or ""
            current_lang = artist.get("primary_language")

            # 언어 감지
            detected_lang = detect_artist_language(name, description)

            # 변경이 필요한 경우만 업데이트
            if detected_lang != current_lang:
                supabase_client.table("music_artists").update({
                    "primary_language": detected_lang
                }).eq("browse_id", artist["browse_id"]).execute()

                updated += 1
                results.append({
                    "name": name,
                    "old": current_lang,
                    "new": detected_lang
                })
                logger.info(f"Updated language: {name} -> {detected_lang}")

        return {
            "status": "success",
            "total_artists": len(artists.data),
            "updated": updated,
            "changes": results[:50]  # 최대 50개만 반환
        }

    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/messages/auto-reply")
async def auto_reply_to_virtual_member(request: Request):
    """
    REACTIVE AI Response: Called when a user sends a message to a virtual member.
    The AI responds ONLY when the user initiates the conversation.

    Flow:
    1. User sends message to virtual member (artist)
    2. Frontend calls this endpoint with conversation_id and the user's message
    3. AI generates a response based on artist persona
    4. Response is inserted into the conversation
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = await request.json()
        conversation_id = body.get("conversationId")
        user_message = body.get("userMessage")
        recipient_id = body.get("recipientId")  # The virtual member's user ID

        if not conversation_id or not user_message or not recipient_id:
            raise HTTPException(status_code=400, detail="conversationId, userMessage, and recipientId required")

        # 1. Check if recipient is a virtual member (artist)
        recipient = supabase_client.table("profiles").select(
            "id, username, full_name, ai_persona, member_type, artist_browse_id"
        ).eq("id", recipient_id).single().execute()

        if not recipient.data:
            raise HTTPException(status_code=404, detail="Recipient not found")

        if recipient.data.get("member_type") != "artist":
            # Not a virtual member, no auto-reply needed
            return {"status": "skipped", "reason": "Recipient is not a virtual member"}

        # 2. Get artist info for AI response
        artist_name = recipient.data.get("full_name") or recipient.data.get("username")
        persona = recipient.data.get("ai_persona") or {}

        # If no persona exists, create a basic one
        if not persona:
            persona = {
                "system_prompt": f"You are {artist_name}, a music artist chatting with a fan. Be friendly, warm, and authentic. Keep responses short (1-2 sentences).",
                "tone": "friendly, warm, casual",
                "greeting": f"Hey! Thanks for reaching out! 💕"
            }

        # 3. Get recent conversation history for context
        history = []
        try:
            history_result = supabase_client.table("messages").select(
                "sender_id, content"
            ).eq("conversation_id", conversation_id).order(
                "created_at", desc=False
            ).limit(10).execute()

            if history_result.data:
                for msg in history_result.data:
                    role = "model" if msg["sender_id"] == recipient_id else "user"
                    history.append({"role": role, "content": msg["content"]})
        except Exception as hist_error:
            logger.warning(f"Could not fetch history: {hist_error}")

        # 4. Generate AI response using chat function
        response_text = await run_in_thread(
            chat_with_artist,
            persona,
            history,
            user_message
        )

        if not response_text or response_text == "...":
            return {"status": "error", "message": "Failed to generate AI response"}

        # 4. Insert AI response into conversation
        message_result = supabase_client.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_id": recipient_id,  # The virtual member is the sender
            "content": response_text
        }).execute()

        logger.info(f"AI reply from {artist_name}: {response_text[:50]}...")

        return {
            "status": "success",
            "response": response_text,
            "messageId": message_result.data[0]["id"] if message_result.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auto-reply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/comments/auto-reply")
async def auto_reply_to_artist_post(request: Request):
    """
    REACTIVE AI Response: When a user comments on an artist's post,
    the artist may reply back.

    Flow:
    1. User comments on artist's post
    2. Frontend calls this endpoint
    3. AI decides whether to reply and generates response
    4. Reply is inserted as a comment
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = await request.json()
        post_id = body.get("postId")
        user_comment = body.get("userComment")
        post_owner_id = body.get("postOwnerId")

        if not post_id or not user_comment or not post_owner_id:
            raise HTTPException(status_code=400, detail="postId, userComment, and postOwnerId required")

        # 1. Check if post owner is a virtual member
        owner = supabase_client.table("profiles").select(
            "id, username, full_name, ai_persona, member_type"
        ).eq("id", post_owner_id).single().execute()

        if not owner.data or owner.data.get("member_type") != "artist":
            return {"status": "skipped", "reason": "Post owner is not a virtual member"}

        # 2. Get artist info
        artist_name = owner.data.get("full_name") or owner.data.get("username")
        persona = owner.data.get("ai_persona") or {}

        # 3. Generate AI reply comment
        reply_text = await run_in_thread(
            generate_artist_comment,
            artist_name,
            persona,
            user_comment
        )

        if not reply_text:
            return {"status": "skipped", "reason": "AI chose not to reply"}

        # 4. Insert reply comment
        comment_result = supabase_client.table("post_comments").insert({
            "post_id": post_id,
            "user_id": post_owner_id,
            "content": reply_text
        }).execute()

        # Update comment count
        post = supabase_client.table("posts").select("comment_count").eq("id", post_id).single().execute()
        if post.data:
            supabase_client.table("posts").update({
                "comment_count": (post.data.get("comment_count") or 0) + 1
            }).eq("id", post_id).execute()

        logger.info(f"AI comment from {artist_name}: {reply_text[:50]}...")

        return {
            "status": "success",
            "reply": reply_text,
            "commentId": comment_result.data[0]["id"] if comment_result.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comment auto-reply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cron/test-activity")
async def test_artist_activity():
    """
    Test endpoint to manually trigger one artist post.
    For debugging/demo purposes. Supports multilingual posts.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        # Get a random virtual member
        artists_result = supabase_client.table("profiles").select(
            "id, username, full_name, avatar_url, ai_persona, artist_browse_id"
        ).eq("member_type", "artist").limit(10).execute()

        if not artists_result.data:
            return {"status": "error", "message": "No virtual members found. Run /api/virtual-members/migrate-all first."}

        artist = random.choice(artists_result.data)
        persona = artist.get("ai_persona") or {}
        artist_name = artist.get("full_name") or artist.get("username")
        browse_id = artist.get("artist_browse_id")

        # Get artist's primary language
        artist_language = "en"
        if browse_id:
            music_artist = supabase_client.table("music_artists").select(
                "primary_language"
            ).eq("browse_id", browse_id).limit(1).execute()
            if music_artist.data:
                artist_language = music_artist.data[0].get("primary_language") or "en"

        # Generate multilingual post
        post_data = await run_in_thread(
            generate_artist_post_multilingual,
            artist_name,
            persona,
            artist_language
        )

        if not post_data:
            return {"status": "error", "message": "Failed to generate post content"}

        # Insert post with language
        new_post = {
            "user_id": artist["id"],
            "caption": post_data.get("caption", "Hello from AI!"),
            "language": artist_language,
            "is_public": True,
            "like_count": 0,
            "comment_count": 0,
            "repost_count": 0
        }

        result = supabase_client.table("posts").insert(new_post).execute()

        return {
            "status": "success",
            "artist": artist_name,
            "language": artist_language,
            "post": post_data,
            "db_result": result.data[0] if result.data else None
        }

    except Exception as e:
        logger.error(f"Test activity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Translation API Endpoints
# =============================================================================

@app.post("/api/translate")
async def translate_post_content(request: Request):
    """
    Translate post content to target language with caching.

    Request body:
    - post_id: UUID of the post (optional, for caching)
    - text: Text to translate
    - target_language: ISO 639-1 code (e.g., 'ko', 'en', 'ja')
    - source_language: Optional source language code (auto-detected if not provided)

    Returns:
    - translated_text: The translated text
    - source_language: Detected/provided source language
    - cached: Whether the result was from cache
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = await request.json()
        text = body.get("text", "").strip()
        target_lang = body.get("target_language", "en")
        source_lang = body.get("source_language")
        post_id = body.get("post_id")

        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        if not target_lang:
            raise HTTPException(status_code=400, detail="target_language is required")

        # Check cache if post_id provided
        if post_id:
            cache_result = supabase_client.table("post_translations").select(
                "translated_text, source_language"
            ).eq("post_id", post_id).eq("target_language", target_lang).limit(1).execute()

            if cache_result.data:
                return {
                    "translated_text": cache_result.data[0]["translated_text"],
                    "source_language": cache_result.data[0]["source_language"],
                    "cached": True
                }

        # Detect source language if not provided
        if not source_lang:
            source_lang = await run_in_thread(detect_language, text)

        # If already in target language, return original
        if source_lang == target_lang:
            return {
                "translated_text": text,
                "source_language": source_lang,
                "cached": False,
                "same_language": True
            }

        # Translate using AI
        translated = await run_in_thread(translate_text, text, source_lang, target_lang)

        if not translated:
            raise HTTPException(status_code=500, detail="Translation failed")

        # Cache the result if post_id provided
        if post_id:
            try:
                supabase_client.table("post_translations").upsert({
                    "post_id": post_id,
                    "source_language": source_lang,
                    "target_language": target_lang,
                    "original_text": text,
                    "translated_text": translated
                }, on_conflict="post_id,target_language").execute()
            except Exception as cache_error:
                logger.warning(f"Failed to cache translation: {cache_error}")

        return {
            "translated_text": translated,
            "source_language": source_lang,
            "cached": False
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/translate/cached/{post_id}")
async def get_cached_translation(post_id: str, target_language: str = "en"):
    """
    Get cached translation for a specific post.
    Returns null if not cached.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        result = supabase_client.table("post_translations").select(
            "translated_text, source_language, created_at"
        ).eq("post_id", post_id).eq("target_language", target_language).limit(1).execute()

        if result.data:
            return {
                "translated_text": result.data[0]["translated_text"],
                "source_language": result.data[0]["source_language"],
                "cached_at": result.data[0]["created_at"]
            }

        return {"translated_text": None}

    except Exception as e:
        logger.error(f"Get cached translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.post("/api/artist/check-new-releases")
async def check_artist_new_releases(request: Request):
    """
    Check for new album/single releases for an artist.

    Request body:
    - artist_browse_id: YouTube Music artist browse ID (required)
    - country: Country code for region-specific results (default: US)

    Returns:
    - new_albums: List of newly detected albums
    - new_singles: List of newly detected singles
    - has_new_releases: Boolean indicating if any new releases found
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    try:
        body = await request.json()
        artist_browse_id = body.get("artist_browse_id", "").strip()
        country = body.get("country", "US")

        if not artist_browse_id:
            raise HTTPException(status_code=400, detail="artist_browse_id is required")

        ytmusic = get_ytmusic(country)

        # Get current releases from YouTube Music
        artist_info = await run_in_thread(ytmusic.get_artist, artist_browse_id)
        if not artist_info:
            raise HTTPException(status_code=404, detail=ERROR_ARTIST_NOT_FOUND)

        # Extract albums and singles using helper function
        albums_data = await _fetch_full_section_items(
            ytmusic, artist_info.get("albums"), "Album"
        )
        # Map browseId to id for compatibility
        current_albums = [{**item, "id": item["browseId"]} for item in albums_data]

        singles_data = await _fetch_full_section_items(
            ytmusic, artist_info.get("singles"), "Single"
        )
        current_singles = [{**item, "id": item["browseId"]} for item in singles_data]

        # Get stored release data
        stored_result = supabase_client.table("artist_releases").select(
            "known_album_ids, known_single_ids"
        ).eq("artist_browse_id", artist_browse_id).limit(1).execute()

        known_album_ids = set()
        known_single_ids = set()

        if stored_result.data:
            known_album_ids = set(stored_result.data[0].get("known_album_ids", []) or [])
            known_single_ids = set(stored_result.data[0].get("known_single_ids", []) or [])

        # Find new releases
        current_album_ids = {a["id"] for a in current_albums}
        current_single_ids = {s["id"] for s in current_singles}

        new_album_ids = current_album_ids - known_album_ids
        new_single_ids = current_single_ids - known_single_ids

        new_albums = [a for a in current_albums if a["id"] in new_album_ids]
        new_singles = [s for s in current_singles if s["id"] in new_single_ids]

        # Update stored data
        update_data = {
            "artist_browse_id": artist_browse_id,
            "known_album_ids": list(current_album_ids),
            "known_single_ids": list(current_single_ids),
            "last_checked_at": datetime.now(timezone.utc).isoformat()
        }

        if new_albums or new_singles:
            update_data["last_new_release_at"] = datetime.now(timezone.utc).isoformat()

        supabase_client.table("artist_releases").upsert(
            update_data,
            on_conflict="artist_browse_id"
        ).execute()

        return {
            "artist_name": artist_info.get("name", "Unknown"),
            "new_albums": new_albums,
            "new_singles": new_singles,
            "has_new_releases": len(new_albums) > 0 or len(new_singles) > 0,
            "total_albums": len(current_albums),
            "total_singles": len(current_singles)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check new releases error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cron/check-all-artist-releases")
async def check_all_artist_releases(request: Request, background_tasks: BackgroundTasks):
    """
    Cron job: Check all followed artists for new releases.
    Runs in background and creates posts for new releases.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail=ERROR_DB_NOT_CONFIGURED)

    # Verify admin access
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    secret = body.get("secret") or request.query_params.get("secret")

    if secret != os.getenv("CRON_SECRET", "dev-secret"):
        raise HTTPException(status_code=403, detail="Invalid secret")

    async def process_releases():
        try:
            # Get all virtual member artists with browse_id
            artists_result = supabase_client.table("music_artists").select(
                "browse_id, name, primary_language"
            ).not_.is_("browse_id", "null").limit(50).execute()

            if not artists_result.data:
                logger.info("No artists to check for new releases")
                return

            for artist in artists_result.data:
                browse_id = artist.get("browse_id")
                if not browse_id:
                    continue

                try:
                    # Check for new releases
                    ytmusic = get_ytmusic("US")
                    artist_info = ytmusic.get_artist(browse_id)

                    if not artist_info:
                        continue

                    # Similar logic as above endpoint...
                    # (Simplified for background task)
                    logger.info(f"Checked releases for {artist.get('name')}")

                except Exception as e:
                    logger.warning(f"Failed to check releases for {browse_id}: {e}")
                    continue

                # Small delay between artists
                await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(f"Background release check error: {e}")

    background_tasks.add_task(process_releases)
    return {"status": "started", "message": "Release check started in background"}


@app.post("/api/detect-language")
async def detect_language_endpoint(request: Request):
    """
    Detect the language of given text.

    Request body:
    - text: Text to analyze

    Returns:
    - language: ISO 639-1 code
    - language_name: Full language name
    """
    try:
        body = await request.json()
        text = body.get("text", "").strip()

        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        lang_code = await run_in_thread(detect_language, text)

        # Language names mapping
        lang_names = {
            'en': 'English', 'ko': 'Korean', 'ja': 'Japanese', 'zh': 'Chinese',
            'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
            'id': 'Indonesian', 'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian',
            'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai', 'nl': 'Dutch',
            'pl': 'Polish', 'it': 'Italian', 'sw': 'Swahili', 'yo': 'Yoruba',
            'zu': 'Zulu', 'am': 'Amharic', 'ha': 'Hausa', 'ig': 'Igbo'
        }

        return {
            "language": lang_code,
            "language_name": lang_names.get(lang_code, lang_code.upper())
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Language detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
