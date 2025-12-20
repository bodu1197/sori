# 🎵 ytmusicapi 가이드

> YouTube Music API 비공식 라이브러리 사용 가이드

---

## 📋 인증 vs 비인증 모드 비교

### 비인증(Unauthenticated) 모드

**인증 없이도 사용 가능한 기능들:**

| 기능                     | 설명                      | 메서드             |
| ------------------------ | ------------------------- | ------------------ |
| 🔍 **음악 검색**         | 노래, 아티스트, 앨범 검색 | `search()`         |
| 🎤 **아티스트 정보**     | 아티스트 상세 정보        | `get_artist()`     |
| 💿 **앨범 정보**         | 앨범 상세 정보            | `get_album()`      |
| 📝 **가사**              | 노래 가사 조회            | `get_lyrics()`     |
| 📺 **공개 플레이리스트** | 공개 플레이리스트 조회    | `get_playlist()`   |
| 📻 **차트**              | 국가별 인기 차트          | `get_charts()`     |
| 🆕 **신규 앨범**         | 최신 앨범 목록            | `get_new_albums()` |

```python
# 비인증 모드 사용 예시
from ytmusicapi import YTMusic

ytmusic = YTMusic()  # 인증 없이 초기화

# 검색
results = ytmusic.search("아이유", filter="songs")

# 차트
charts = ytmusic.get_charts(country='KR')

# 신규 앨범
new_albums = ytmusic.get_new_albums()
```

---

### 인증(Authenticated) 모드

**인증이 필요한 기능들:**

| 기능                       | 설명              | 메서드                                   |
| -------------------------- | ----------------- | ---------------------------------------- |
| 📁 **플레이리스트 관리**   | 생성, 삭제, 수정  | `create_playlist()`, `delete_playlist()` |
| 🔒 **비공개 플레이리스트** | 본인 플레이리스트 | `get_library_playlists()`                |
| ⭐ **좋아요/평가**         | 노래 평가         | `rate_song()`                            |
| 👤 **아티스트 구독**       | 구독 관리         | `subscribe_artists()`                    |
| 📜 **재생 기록**           | 기록 조회         | `get_history()`                          |
| ⬆️ **음악 업로드**         | 개인 음악 업로드  | `upload_song()`                          |

```python
# 인증 모드 사용 예시
from ytmusicapi import YTMusic

# 방법 1: Browser 인증 (헤더 복사 방식)
ytmusic = YTMusic("browser.json")

# 방법 2: OAuth 인증 (권장)
ytmusic = YTMusic("oauth.json")

# 이제 개인 기능 사용 가능!
ytmusic.create_playlist("My Playlist", "My description")
ytmusic.rate_song("videoId", "LIKE")
```

---

## 🎯 MusicGram에서의 사용

### 권장: 비인증 모드만 사용

MusicGram 프로젝트에서는 **비인증 모드만으로 충분**합니다!

| 필요한 기능         |       인증 필요 여부        |
| ------------------- | :-------------------------: |
| 음악 검색           |          ❌ 불필요          |
| 곡 메타데이터 조회  |          ❌ 불필요          |
| 국가별 차트         |          ❌ 불필요          |
| 신규 앨범 목록      |          ❌ 불필요          |
| 사용자 플레이리스트 | ❌ 불필요 (Supabase에 저장) |

---

## 🌏 국가별 콘텐츠 설정

```python
from ytmusicapi import YTMusic

# 한국
ytmusic_kr = YTMusic(language='ko', location='KR')

# 일본
ytmusic_jp = YTMusic(language='ja', location='JP')

# 미국
ytmusic_us = YTMusic(language='en', location='US')
```

---

## 📦 설치 및 설정

### 설치

```bash
pip install ytmusicapi
```

### 기본 사용

```python
from ytmusicapi import YTMusic

# 초기화 (비인증)
ytmusic = YTMusic()

# 검색 (songs, videos, albums, artists, playlists)
results = ytmusic.search("검색어", filter="songs", limit=20)

# 검색 결과 구조
for song in results:
    print(f"제목: {song['title']}")
    print(f"아티스트: {song['artists'][0]['name']}")
    print(f"비디오 ID: {song['videoId']}")
    print(f"썸네일: {song['thumbnails'][0]['url']}")
```

---

## 🔧 주요 메서드 정리

### 검색

```python
# 통합 검색
ytmusic.search("아이유")

# 필터 검색
ytmusic.search("아이유", filter="songs")      # 노래만
ytmusic.search("아이유", filter="albums")     # 앨범만
ytmusic.search("아이유", filter="artists")    # 아티스트만
ytmusic.search("아이유", filter="playlists")  # 플레이리스트만

# 검색 제안
ytmusic.get_search_suggestions("아이")  # 자동완성
```

### 아티스트

```python
# 아티스트 정보
artist = ytmusic.get_artist("UCmMm5oVz...")

# 아티스트의 앨범들
artist['albums']['results']

# 아티스트의 인기곡
artist['songs']['results']
```

### 앨범

```python
# 앨범 정보
album = ytmusic.get_album("MPREb_...")

# 앨범의 트랙 목록
album['tracks']
```

### 차트

```python
# 국가별 차트
charts = ytmusic.get_charts(country='KR')

# 트렌딩
charts['trending']['items']

# 인기 아티스트
charts['artists']['items']
```

### 신규 앨범

```python
# 신규 앨범 목록
new_albums = ytmusic.get_new_albums()
```

---

## ⚠️ 주의사항

1. **Rate Limiting**: 너무 많은 요청 시 차단될 수 있음

   - 캐싱 필수!
   - 요청 간격 두기

2. **비공식 API**: Google 정책 변경 시 작동 안 될 수 있음

   - 에러 핸들링 필수
   - 대체 방안 준비

3. **저작권**: 음원 파일 저장 금지
   - 메타데이터만 저장
   - YouTube IFrame Player로 재생

---

## 📚 참고 링크

- [ytmusicapi 공식 문서](https://ytmusicapi.readthedocs.io/)
- [GitHub 저장소](https://github.com/sigma67/ytmusicapi)
