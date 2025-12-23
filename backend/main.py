# MusicGram Backend API
# 200만 DAU 대응 확장 가능 설계

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import os
import json
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from ai_agent import generate_artist_persona, chat_with_artist, generate_artist_post, generate_artist_comment, generate_artist_dm
import random

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
# Supabase DB 헬퍼 함수
# =============================================================================

def db_save_artist(artist_data: dict) -> str | None:
    """아티스트를 DB에 저장 (upsert) + 자동 가상회원 생성"""
    if not supabase_client:
        return None

    try:
        browse_id = artist_data.get("browseId") or artist_data.get("browse_id")
        if not browse_id:
            return None

        thumbnails = artist_data.get("thumbnails") or []
        artist_name = artist_data.get("name") or artist_data.get("artist") or ""
        thumbnail_url = get_best_thumbnail(thumbnails)

        data = {
            "browse_id": browse_id,
            "name": artist_name,
            "thumbnails": json.dumps(thumbnails),
            "thumbnail_url": thumbnail_url,
            "description": artist_data.get("description") or "",
            "subscribers": artist_data.get("subscribers") or "",
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
                "Content-Type": "application/json"
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
        last_time = datetime.fromisoformat(last_synced.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) - last_time > timedelta(days=days)
    except Exception:
        return True

def db_save_artist_full(artist_data: dict) -> bool:
    """아티스트 정보를 정규화 테이블에 저장 (upsert)"""
    if not supabase_client or not artist_data:
        return False
    try:
        browse_id = artist_data.get("browseId")
        if not browse_id:
            return False

        # 인기곡 플레이리스트 ID만 추출 (YouTube IFrame API용)
        songs_playlist_id = artist_data.get("songsPlaylistId")

        data = {
            "browse_id": browse_id,
            "name": artist_data.get("artist") or artist_data.get("name") or "",
            "thumbnail_url": get_best_thumbnail(artist_data.get("thumbnails", [])),
            "subscribers": artist_data.get("subscribers") or "",
            "description": artist_data.get("description") or "",
            "top_songs_json": artist_data.get("topSongs") or [],
            "related_artists_json": artist_data.get("related") or [],
            "songs_playlist_id": songs_playlist_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_synced_at": datetime.now(timezone.utc).isoformat()
        }

        supabase_client.table("music_artists").upsert(
            data, on_conflict="browse_id"
        ).execute()

        logger.info(f"Artist saved: {data['name']} ({browse_id}) playlist: {songs_playlist_id}")

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

def get_best_thumbnail(thumbnails: list) -> str:
    """썸네일 목록에서 가장 좋은 URL 선택"""
    if not thumbnails:
        return ""
    # 가장 큰 이미지 선택
    best = thumbnails[-1]
    return best.get("url", "") if isinstance(best, dict) else ""


def background_update_artist(artist_browse_id: str, country: str):
    """
    백그라운드에서 아티스트 데이터 업데이트 (7일 경과 시 호출)
    - 새 앨범/싱글 확인
    - 새 트랙만 DB에 추가 (기존 데이터 유지)
    """
    try:
        from ytmusicapi import YTMusic

        logger.info(f"Background update started: {artist_browse_id}")

        # 기존 앨범/트랙 ID 조회
        existing_album_ids = db_get_existing_album_ids(artist_browse_id)
        existing_video_ids = db_get_existing_video_ids(artist_browse_id)

        # ytmusicapi로 최신 데이터 가져오기
        lang = COUNTRY_LANGUAGE_MAP.get(country.upper(), 'en')
        ytmusic = YTMusic(language=lang, location=country.upper())

        artist_info = ytmusic.get_artist(artist_browse_id)
        if not artist_info:
            logger.warning(f"Background update: Artist not found {artist_browse_id}")
            return

        new_albums_count = 0
        new_tracks_count = 0

        # 앨범 확인
        albums_section = artist_info.get("albums")
        if albums_section and isinstance(albums_section, dict):
            params = albums_section.get("params")
            browse_id = albums_section.get("browseId")
            album_list = []

            if params and browse_id:
                try:
                    album_list = ytmusic.get_artist_albums(browse_id, params) or []
                except Exception:
                    album_list = albums_section.get("results") or []
            else:
                album_list = albums_section.get("results") or []

            for album in album_list:
                album_browse_id = album.get("browseId")
                if not album_browse_id or album_browse_id in existing_album_ids:
                    continue

                # 새 앨범 발견!
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
                    new_albums_count += 1

                    # 트랙 저장
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
                        new_tracks_count += 1

                except Exception as e:
                    logger.warning(f"Background album fetch error: {e}")

        # 싱글 확인
        singles_section = artist_info.get("singles")
        if singles_section and isinstance(singles_section, dict):
            params = singles_section.get("params")
            browse_id = singles_section.get("browseId")
            singles_list = []

            if params and browse_id:
                try:
                    singles_list = ytmusic.get_artist_albums(browse_id, params) or []
                except Exception:
                    singles_list = singles_section.get("results") or []
            else:
                singles_list = singles_section.get("results") or []

            for single in singles_list:
                single_browse_id = single.get("browseId")
                if not single_browse_id or single_browse_id in existing_album_ids:
                    continue

                try:
                    single_detail = ytmusic.get_album(single_browse_id)
                    if not single_detail:
                        continue

                    single_data = {
                        "browseId": single_browse_id,
                        "title": single_detail.get("title") or "",
                        "type": "Single",
                        "year": single_detail.get("year") or "",
                        "thumbnails": single_detail.get("thumbnails") or []
                    }

                    db_save_album(single_data, artist_browse_id)
                    new_albums_count += 1

                    for idx, track in enumerate(single_detail.get("tracks") or []):
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

                        db_save_track(track_data, single_browse_id, artist_browse_id, idx + 1)
                        new_tracks_count += 1

                except Exception as e:
                    logger.warning(f"Background single fetch error: {e}")

        # 인기곡 업데이트
        top_songs = []
        songs_section = artist_info.get("songs")
        if songs_section and isinstance(songs_section, dict):
            for song in songs_section.get("results", []):
                if isinstance(song, dict) and song.get("videoId"):
                    top_songs.append({
                        "videoId": song.get("videoId"),
                        "title": song.get("title") or "",
                        "duration": song.get("duration") or "",
                        "thumbnails": song.get("thumbnails") or []
                    })

        # 유사 아티스트 업데이트
        related_artists = []
        related_section = artist_info.get("related")
        if related_section and isinstance(related_section, dict):
            for rel in related_section.get("results", [])[:15]:
                if isinstance(rel, dict):
                    related_artists.append({
                        "browseId": rel.get("browseId") or "",
                        "name": rel.get("title") or rel.get("name") or "",
                        "subscribers": rel.get("subscribers") or "",
                        "thumbnails": rel.get("thumbnails") or []
                    })

        # last_synced_at 업데이트
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
# Summary Search API - 정규화 DB 사용 (전체 디스코그래피)
# =============================================================================

def save_full_artist_data_background(artist_id: str, artist_info: dict, country: str):
    """백그라운드에서 아티스트의 전체 앨범/싱글/트랙 정보를 가져와 DB에 저장"""
    try:
        ytmusic = get_ytmusic(country)

        # 1. 아티스트 기본 정보 저장
        artist_name = artist_info.get("name") or ""
        search_thumbnails = artist_info.get("thumbnails") or []

        # 인기곡 플레이리스트 ID 추출 (핵심!)
        songs_playlist_id = None
        songs_browse_id = None
        songs_section = artist_info.get("songs")
        if songs_section and isinstance(songs_section, dict):
            songs_browse_id = songs_section.get("browseId")
            if songs_browse_id and songs_browse_id.startswith("VL"):
                songs_playlist_id = songs_browse_id[2:]
            elif songs_browse_id:
                songs_playlist_id = songs_browse_id

        # 인기곡 추출 & 저장 (검색용 메타데이터)
        top_songs = []
        if songs_section and isinstance(songs_section, dict):
            for song in songs_section.get("results", []):
                if isinstance(song, dict) and song.get("videoId"):
                    top_songs.append({
                        "videoId": song.get("videoId"),
                        "title": song.get("title") or "",
                        "duration": song.get("duration") or "",
                        "thumbnails": song.get("thumbnails") or []
                    })
        
        # 유사 아티스트 추출 & 저장
        related_artists = []
        related_section = artist_info.get("related")
        if related_section and isinstance(related_section, dict):
            for rel in related_section.get("results", [])[:15]:
                if isinstance(rel, dict):
                    related_artists.append({
                        "browseId": rel.get("browseId") or "",
                        "name": rel.get("title") or rel.get("name") or "",
                        "subscribers": rel.get("subscribers") or "",
                        "thumbnails": rel.get("thumbnails") or []
                    })
        
        artist_data = {
            "browseId": artist_id,
            "artist": artist_name,
            "name": artist_name,
            "thumbnails": search_thumbnails,
            "subscribers": artist_info.get("subscribers") or "",
            "description": artist_info.get("description") or "",
            "topSongs": top_songs,
            "related": related_artists,
            "songsPlaylistId": songs_playlist_id  # YouTube IFrame API용 플레이리스트 ID만
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

    # 인기곡
    top_songs = []
    songs_section = artist_info.get("songs")
    if songs_section and isinstance(songs_section, dict):
        for song in songs_section.get("results", []):
            if isinstance(song, dict) and song.get("videoId"):
                top_songs.append({
                    "videoId": song.get("videoId"),
                    "title": song.get("title") or "",
                    "duration": song.get("duration") or "",
                    "thumbnails": song.get("thumbnails") or []
                })

    # 유사 아티스트
    related_artists = []
    related_section = artist_info.get("related")
    if related_section and isinstance(related_section, dict):
        for rel in related_section.get("results", [])[:15]:
            if isinstance(rel, dict):
                related_artists.append({
                    "browseId": rel.get("browseId") or "",
                    "name": rel.get("title") or rel.get("name") or "",
                    "subscribers": rel.get("subscribers") or "",
                    "thumbnails": rel.get("thumbnails") or []
                })

    # 앨범 목록 (메인 페이지에 있는 것만 우선 반환)
    all_albums = []
    
    albums_section = artist_info.get("albums")
    if albums_section and isinstance(albums_section, dict):
        for album in albums_section.get("results") or []:
            if isinstance(album, dict) and album.get("browseId"):
                all_albums.append({
                    "browseId": album.get("browseId"),
                    "title": album.get("title") or "",
                    "type": album.get("type") or "Album",
                    "year": album.get("year") or "",
                    "thumbnails": album.get("thumbnails") or [],
                    "tracks": []
                })

    singles_section = artist_info.get("singles")
    if singles_section and isinstance(singles_section, dict):
        for single in singles_section.get("results") or []:
             if isinstance(single, dict) and single.get("browseId"):
                all_albums.append({
                    "browseId": single.get("browseId"),
                    "title": single.get("title") or "",
                    "type": "Single",
                    "year": single.get("year") or "",
                    "thumbnails": single.get("thumbnails") or [],
                    "tracks": []
                })

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
        "allTracks": top_songs # 초기 응답에는 top songs만 포함
    }


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

            artists_data = []
            all_songs = []
            all_albums = []
            needs_background_update = False

            for browse_id in artist_browse_ids:
                artist_full = db_get_full_artist_data(browse_id)
                if artist_full:
                    artists_data.append(artist_full)

                    # 인기곡을 songs에 추가
                    for song in artist_full.get("topSongs", []):
                        song["artist_bid"] = browse_id
                        song["resultType"] = "song"
                        all_songs.append(song)

                    # 앨범 추가
                    for album in artist_full.get("albums", []):
                        album["artist_bid"] = browse_id
                        all_albums.append(album)

                    # 7일 경과 체크
                    if db_check_artist_needs_sync(browse_id, days=7):
                        needs_background_update = True
                        # 백그라운드 업데이트 트리거
                        background_tasks.add_task(background_update_artist, browse_id, country)

            if artists_data:
                result = {
                    "keyword": q,
                    "country": country,
                    "artists": artists_data,
                    "songs": all_songs,
                    "albums": [],
                    "albums2": all_albums,
                    "allTracks": [t for a in artists_data for t in a.get("allTracks", [])],
                    "source": "database",
                    "updating": needs_background_update  # 업데이트 중임을 알림
                }

                # Redis에 캐시
                cache_set(cache_key, result, ttl=1800)

                if needs_background_update:
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
        best_artist = None
        search_lower = q.lower().strip()

        # 최적의 아티스트 매칭
        for artist in artists_search[:5]:
            if not isinstance(artist, dict):
                continue
            artist_name = (artist.get("artist") or artist.get("name") or "").lower()
            if search_lower in artist_name or artist_name in search_lower:
                best_artist = artist
                break
        
        if not best_artist and artists_search:
            best_artist = artists_search[0]

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

                            # 2. 결과 조합
                            # 인기곡을 songs 리스트 상단에 추가 (우선순위 높임)
                            top_songs = []
                            for song in artist_full.get("topSongs", []):
                                song["artist_bid"] = artist_id
                                song["resultType"] = "song"
                                top_songs.append(song)
                            
                            # 노래 리스트 합치기: [아티스트 인기곡] + [검색된 노래 중 아티스트 일치하는 곡] + [나머지]
                            # 외국 팝송 필터링: 아티스트가 확실하다면, 해당 아티스트의 노래 위주로 구성
                            
                            filtered_search_songs = []
                            other_songs = []
                            target_artist_name = artist_full.get("name", "").lower()

                            for s in songs_search:
                                # 노래의 아티스트 목록 확인
                                s_artists = s.get("artists") or []
                                is_match = False
                                for a in s_artists:
                                    if a.get("name", "").lower() == target_artist_name:
                                        is_match = True
                                        break
                                if is_match:
                                    filtered_search_songs.append(s)
                                else:
                                    other_songs.append(s)
                            
                            # 최종 노래 목록 재구성: 인기곡 -> 검색된 아티스트 곡 -> (필요시) 나머지 곡
                            songs_search = top_songs + filtered_search_songs
                            
                            # 나머지가 너무 없으면 다른 곡도 조금 추가 (단, 한국 가수의 경우 외국곡 제외 로직은 이름 매칭으로 어느 정도 해결)
                            if len(songs_search) < 5:
                                songs_search += other_songs[:5]

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
            raise HTTPException(status_code=404, detail="Artist not found")

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

                    # 전체 앨범 가져오기 (get_artist_albums 사용)
                    albums_section = artist_detail.get("albums", {})
                    if isinstance(albums_section, dict):
                        albums_browse_id = albums_section.get("browseId")
                        albums_params = albums_section.get("params")

                        if albums_browse_id and albums_params:
                            # 더 많은 앨범이 있음 - 전체 목록 가져오기
                            try:
                                all_albums = await run_in_thread(
                                    ytmusic.get_artist_albums, albums_browse_id, albums_params
                                )
                                for album in (all_albums or []):
                                    albums.append({
                                        "browseId": album.get("browseId"),
                                        "title": album.get("title"),
                                        "artists": [{"name": artist_name}],
                                        "thumbnails": album.get("thumbnails", []),
                                        "year": album.get("year"),
                                        "type": "Album"
                                    })
                            except Exception as e:
                                logger.warning(f"Failed to get all albums: {e}")
                                # Fallback to initial results
                                for album in albums_section.get("results", []):
                                    albums.append({
                                        "browseId": album.get("browseId"),
                                        "title": album.get("title"),
                                        "artists": [{"name": artist_name}],
                                        "thumbnails": album.get("thumbnails", []),
                                        "year": album.get("year"),
                                        "type": "Album"
                                    })
                        else:
                            # browseId/params 없으면 초기 결과 사용
                            for album in albums_section.get("results", []):
                                albums.append({
                                    "browseId": album.get("browseId"),
                                    "title": album.get("title"),
                                    "artists": [{"name": artist_name}],
                                    "thumbnails": album.get("thumbnails", []),
                                    "year": album.get("year"),
                                    "type": "Album"
                                })

                    # 전체 싱글 가져오기 (get_artist_albums 사용)
                    singles_section = artist_detail.get("singles", {})
                    if isinstance(singles_section, dict):
                        singles_browse_id = singles_section.get("browseId")
                        singles_params = singles_section.get("params")

                        if singles_browse_id and singles_params:
                            # 더 많은 싱글이 있음 - 전체 목록 가져오기
                            try:
                                all_singles = await run_in_thread(
                                    ytmusic.get_artist_albums, singles_browse_id, singles_params
                                )
                                for single in (all_singles or []):
                                    albums.append({
                                        "browseId": single.get("browseId"),
                                        "title": single.get("title"),
                                        "artists": [{"name": artist_name}],
                                        "thumbnails": single.get("thumbnails", []),
                                        "year": single.get("year"),
                                        "type": "Single"
                                    })
                            except Exception as e:
                                logger.warning(f"Failed to get all singles: {e}")
                                # Fallback to initial results
                                for single in singles_section.get("results", []):
                                    albums.append({
                                        "browseId": single.get("browseId"),
                                        "title": single.get("title"),
                                        "artists": [{"name": artist_name}],
                                        "thumbnails": single.get("thumbnails", []),
                                        "year": single.get("year"),
                                        "type": "Single"
                                    })
                        else:
                            # browseId/params 없으면 초기 결과 사용
                            for single in singles_section.get("results", []):
                                albums.append({
                                    "browseId": single.get("browseId"),
                                    "title": single.get("title"),
                                    "artists": [{"name": artist_name}],
                                    "thumbnails": single.get("thumbnails", []),
                                    "year": single.get("year"),
                                    "type": "Single"
                                })

                    # get_artist()의 related 섹션에서 비슷한 아티스트 추출
                    related_section = artist_detail.get("related", {})
                    if isinstance(related_section, dict):
                        for ra in related_section.get("results", []):
                            if len(similar_artists) >= 10:
                                break
                            ra_id = ra.get("browseId")
                            if ra_id and ra_id != artist_id:
                                similar_artists.append({
                                    "browseId": ra_id,
                                    "name": ra.get("title") or ra.get("name"),
                                    "thumbnail": get_best_thumbnail(ra.get("thumbnails", []))
                                })
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
    """아티스트 상세 정보"""
    cache_key = f"artist:{artist_id}:{country}"

    if not force_refresh:
        cached = cache_get(cache_key)
        if cached:
            return {"source": "cache", "artist": cached}

    try:
        ytmusic = get_ytmusic(country)
        artist = ytmusic.get_artist(artist_id)

        # 6시간 캐시
        cache_set(cache_key, artist, ttl=21600)

        return {"source": "api", "artist": artist}
    except Exception as e:
        logger.error(f"Artist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        artist = ytmusic.get_artist(artist_id)

        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")

        all_albums = []

        # 전체 앨범 목록 가져오기
        albums_section = artist.get("albums")
        if albums_section and isinstance(albums_section, dict):
            params = albums_section.get("params")
            browse_id = albums_section.get("browseId")

            if params and browse_id:
                try:
                    full_albums = ytmusic.get_artist_albums(browse_id, params) or []
                    for album in full_albums:
                        if isinstance(album, dict) and album.get("browseId"):
                            all_albums.append({
                                "browseId": album.get("browseId"),
                                "title": album.get("title") or "",
                                "type": album.get("type") or "Album",
                                "year": album.get("year") or "",
                                "thumbnails": album.get("thumbnails") or []
                            })
                except Exception as e:
                    logger.warning(f"get_artist_albums error: {e}")
                    # 샘플 목록이라도 반환
                    for album in albums_section.get("results") or []:
                        if isinstance(album, dict) and album.get("browseId"):
                            all_albums.append({
                                "browseId": album.get("browseId"),
                                "title": album.get("title") or "",
                                "type": album.get("type") or "Album",
                                "year": album.get("year") or "",
                                "thumbnails": album.get("thumbnails") or []
                            })

        # 전체 싱글 목록 가져오기
        singles_section = artist.get("singles")
        if singles_section and isinstance(singles_section, dict):
            params = singles_section.get("params")
            browse_id = singles_section.get("browseId")

            if params and browse_id:
                try:
                    full_singles = ytmusic.get_artist_albums(browse_id, params) or []
                    for single in full_singles:
                        if isinstance(single, dict) and single.get("browseId"):
                            all_albums.append({
                                "browseId": single.get("browseId"),
                                "title": single.get("title") or "",
                                "type": "Single",
                                "year": single.get("year") or "",
                                "thumbnails": single.get("thumbnails") or []
                            })
                except Exception as e:
                    logger.warning(f"get_artist_albums for singles error: {e}")
                    for single in singles_section.get("results") or []:
                        if isinstance(single, dict) and single.get("browseId"):
                            all_albums.append({
                                "browseId": single.get("browseId"),
                                "title": single.get("title") or "",
                                "type": "Single",
                                "year": single.get("year") or "",
                                "thumbnails": single.get("thumbnails") or []
                            })

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
        album = ytmusic.get_album(album_id)

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
        playlist = ytmusic.get_playlist(playlist_id, limit=limit)

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
                "Content-Type": "application/json"
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
                    "Content-Type": "application/json"
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
                        "Content-Type": "application/json"
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
                        "Content-Type": "application/json"
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
            artists_data = []
            all_songs = []
            all_albums = []
            needs_background_update = False

            for browse_id in artist_browse_ids:
                artist_full = db_get_full_artist_data(browse_id)
                if artist_full:
                    artists_data.append(artist_full)
                    # 인기곡 5개만 (나머지는 YouTube IFrame API에서 로드)
                    for song in artist_full.get("topSongs", [])[:5]:
                        song["artist_bid"] = browse_id
                        song["resultType"] = "song"
                        all_songs.append(song)
                    for album in artist_full.get("albums", []):
                        album["artist_bid"] = browse_id
                        all_albums.append(album)
                    if db_check_artist_needs_sync(browse_id, days=7):
                        needs_background_update = True
                        background_tasks.add_task(background_update_artist, browse_id, country)

            if artists_data:
                result = {
                    "keyword": q,
                    "country": country,
                    "artists": artists_data,
                    "songs": all_songs,
                    "albums": [],
                    "albums2": all_albums,
                    "allTracks": [t for a in artists_data for t in a.get("allTracks", [])],
                    "source": "database",
                    "updating": needs_background_update
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
            
            # 1. 앨범 정보 파싱
            albums_list = []
            if artist_detail and "albums" in artist_detail and "results" in artist_detail["albums"]:
                for alb in artist_detail["albums"]["results"]:
                    albums_list.append({
                        "browseId": alb.get("browseId"),
                        "title": alb.get("title"),
                        "thumbnails": alb.get("thumbnails", []),
                        "year": alb.get("year", ""),
                        "artist_bid": artist_id
                    })
            
            # 2. 싱글 정보 파싱
            if "singles" in artist_detail and "results" in artist_detail["singles"]:
                for single in artist_detail["singles"]["results"]:
                    albums_list.append({
                        "browseId": single.get("browseId"),
                        "title": single.get("title"),
                        "thumbnails": single.get("thumbnails", []),
                        "year": single.get("year", ""),
                        "type": "Single",
                        "artist_bid": artist_id
                    })

            # 3. 관련 아티스트
            related_list = []
            if "related" in artist_detail and "results" in artist_detail["related"]:
                related_list = artist_detail["related"]["results"]

            # 4. 공식 인기곡 (Top Songs) + 플레이리스트 ID 추출
            top_songs = []
            songs_playlist_id = None
            songs_browse_id = None

            if "songs" in artist_detail and isinstance(artist_detail["songs"], dict):
                songs_section = artist_detail["songs"]

                # 핵심: "모두 표시" 버튼의 플레이리스트 ID 추출
                songs_browse_id = songs_section.get("browseId")
                if songs_browse_id and songs_browse_id.startswith("VL"):
                    songs_playlist_id = songs_browse_id[2:]  # "VL" 제거
                elif songs_browse_id:
                    songs_playlist_id = songs_browse_id

                # 인기곡 5개만 추출 (빠른 응답)
                for s in songs_section.get("results", [])[:5]:
                    s["artist_bid"] = artist_id
                    s["resultType"] = "song"
                    top_songs.append(s)

            # 응답 데이터 구성 - songsPlaylistId만 반환 (YouTube IFrame API용)
            artists_data.append({
                "browseId": artist_id,
                "artist": artist_name,
                "name": artist_name,
                "thumbnails": best_artist.get("thumbnails") or [],
                "subscribers": artist_detail.get("subscribers", ""),
                "description": artist_detail.get("description", "")[:200] + "..." if artist_detail.get("description") else "",
                "topSongs": top_songs,
                "related": related_list,
                "albums": albums_list,
                "allTracks": [],
                "songsPlaylistId": songs_playlist_id  # YouTube IFrame API용 플레이리스트 ID만
            })
            
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
            raise HTTPException(status_code=404, detail="Artist not found")
            
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
        
        if not persona or not message:
            raise HTTPException(status_code=400, detail="Missing persona or message")
            
        reply = await run_in_thread(chat_with_artist, persona, history, message)
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
        raise HTTPException(status_code=500, detail="Database not configured")

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
        import requests

        virtual_email = f"{browse_id}@sori.virtual"
        random_password = str(uuid.uuid4())

        # Supabase Admin API call
        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        create_user_response = requests.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json"
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
                playlist_data = ytmusic.get_playlist(artist_data["songs_playlist_id"])
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
        raise HTTPException(status_code=500, detail="Database not configured")

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
        raise HTTPException(status_code=500, detail="Database not configured")

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
    Cron job to generate AI-driven artist posts.
    Call this periodically (e.g., every hour) via Cloud Scheduler or Vercel Cron.

    Note: Artists only POST on their own feed. They do NOT:
    - Proactively like user posts
    - Proactively comment on user posts
    - Proactively send DMs
    These actions only happen as RESPONSES to user interactions.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # Configuration
        MAX_POSTS_PER_RUN = 3  # Max posts to create per cron run

        results = {
            "posts_created": 0,
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

        # 2. Generate posts for random artists
        for artist in artists[:MAX_POSTS_PER_RUN]:
            try:
                persona = artist.get("ai_persona") or {}
                artist_name = artist.get("full_name") or artist.get("username")

                # Generate post content via AI
                post_data = await run_in_thread(generate_artist_post, artist_name, persona)

                if post_data and post_data.get("caption"):
                    # Insert post into DB
                    new_post = {
                        "user_id": artist["id"],
                        "caption": post_data["caption"],
                        "is_public": True,
                        "like_count": 0,
                        "comment_count": 0,
                        "repost_count": 0
                    }

                    supabase_client.table("posts").insert(new_post).execute()
                    results["posts_created"] += 1
                    logger.info(f"Created post for {artist_name}: {post_data['caption'][:50]}...")

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
        raise HTTPException(status_code=500, detail="Database not configured")

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
        raise HTTPException(status_code=500, detail="Database not configured")

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
    For debugging/demo purposes.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # Get a random virtual member
        artists_result = supabase_client.table("profiles").select(
            "id, username, full_name, avatar_url, ai_persona"
        ).eq("member_type", "artist").limit(10).execute()

        if not artists_result.data:
            return {"status": "error", "message": "No virtual members found. Run /api/virtual-members/migrate-all first."}

        artist = random.choice(artists_result.data)
        persona = artist.get("ai_persona") or {}
        artist_name = artist.get("full_name") or artist.get("username")

        # Generate post
        post_data = await run_in_thread(generate_artist_post, artist_name, persona)

        if not post_data:
            return {"status": "error", "message": "Failed to generate post content"}

        # Insert post
        new_post = {
            "user_id": artist["id"],
            "caption": post_data.get("caption", "Hello from AI!"),
            "is_public": True,
            "like_count": 0,
            "comment_count": 0,
            "repost_count": 0
        }

        result = supabase_client.table("posts").insert(new_post).execute()

        return {
            "status": "success",
            "artist": artist_name,
            "post": post_data,
            "db_result": result.data[0] if result.data else None
        }

    except Exception as e:
        logger.error(f"Test activity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
