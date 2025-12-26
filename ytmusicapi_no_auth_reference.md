# ytmusicapi 인증 없이 사용 가능한 기능 (v1.11.4)

YouTube Music 비공식 Python API - 인증 없이 사용할 수 있는 모든 기능 정리

---

## 설치 및 초기화

```python
pip install ytmusicapi
```

```python
from ytmusicapi import YTMusic

# 인증 없이 초기화
ytmusic = YTMusic()

# 언어/지역 설정 (선택사항)
ytmusic = YTMusic(language='ko', location='KR')
```

**지원 언어**: ar, de, en, es, fr, hi, it, ja, ko, nl, pt, ru, tr, uk, zh_CN, zh_TW

---

## 1. 검색 (Search)

### `search()`
YouTube Music 검색 실행

```python
search(
    query: str,                    # 검색어 (필수)
    filter: str | None = None,     # 필터 옵션
    scope: str | None = None,      # 검색 범위
    limit: int = 20,               # 결과 수 제한
    ignore_spelling: bool = False  # 맞춤법 교정 무시
) -> list
```

**filter 옵션:**
- `songs` - 곡
- `videos` - 비디오
- `albums` - 앨범
- `artists` - 아티스트
- `playlists` - 플레이리스트
- `community_playlists` - 커뮤니티 플레이리스트
- `featured_playlists` - 추천 플레이리스트
- `podcasts` - 팟캐스트
- `episodes` - 에피소드

**예제:**
```python
# 기본 검색
results = ytmusic.search("BTS Dynamite")

# 곡만 검색
songs = ytmusic.search("아이유", filter="songs", limit=10)

# 아티스트만 검색
artists = ytmusic.search("NewJeans", filter="artists")

# 앨범 검색
albums = ytmusic.search("BLACKPINK", filter="albums")
```

---

### `get_search_suggestions()`
검색 자동완성 제안 가져오기

```python
get_search_suggestions(
    query: str,                    # 검색어 (필수)
    detailed_runs: bool = False    # 상세 정보 포함 여부
) -> list[str] | list[dict]
```

**예제:**
```python
# 간단한 제안 목록
suggestions = ytmusic.get_search_suggestions("아이")
# ['아이유', '아이브', '아이들', ...]

# 상세 정보 포함
detailed = ytmusic.get_search_suggestions("아이", detailed_runs=True)
```

---

## 2. 브라우징 (Browsing)

### `get_home()`
홈페이지 피드 (추천 음악)

```python
get_home(limit: int = 3) -> list
```

**예제:**
```python
home = ytmusic.get_home(limit=5)
for section in home:
    print(section['title'])  # 섹션 제목
    for item in section['contents']:
        print(f"  - {item['title']}")
```

---

### `get_artist()`
아티스트 정보 조회

```python
get_artist(channelId: str) -> dict
```

**반환 데이터:**
- `name` - 아티스트 이름
- `description` - 설명
- `subscribers` - 구독자 수
- `songs` - 인기곡
- `albums` - 앨범
- `singles` - 싱글
- `videos` - 뮤직비디오
- `related` - 관련 아티스트

**예제:**
```python
artist = ytmusic.get_artist("UC3SyT4_WLHzN7JmHQwKQZww")  # 아이유
print(artist['name'])
print(artist['subscribers'])

# 인기곡 출력
for song in artist['songs']['results']:
    print(f"{song['title']} - {song['album']['name']}")
```

---

### `get_artist_albums()`
아티스트의 전체 앨범 목록

```python
get_artist_albums(
    channelId: str,           # 채널 ID (필수)
    params: str,              # 파라미터 (get_artist에서 획득)
    limit: int | None = 100,  # 결과 수 제한
    order: str | None = None  # 정렬 순서
) -> list
```

**order 옵션:**
- `Recency` - 최신순
- `Popularity` - 인기순
- `Alphabetical order` - 알파벳순

**예제:**
```python
artist = ytmusic.get_artist("UC3SyT4_WLHzN7JmHQwKQZww")
albums_params = artist['albums']['params']
albums = ytmusic.get_artist_albums(
    "UC3SyT4_WLHzN7JmHQwKQZww",
    albums_params,
    limit=50
)
```

---

### `get_album()`
앨범 상세 정보 및 트랙 목록

```python
get_album(browseId: str) -> dict
```

**반환 데이터:**
- `title` - 앨범 제목
- `artists` - 아티스트 정보
- `year` - 발매년도
- `trackCount` - 트랙 수
- `duration` - 총 재생시간
- `tracks` - 트랙 목록
- `other_versions` - 다른 버전

**예제:**
```python
album = ytmusic.get_album("MPREb_K5GFrLCaEIq")
print(f"{album['title']} ({album['year']})")
print(f"트랙 수: {album['trackCount']}")

for track in album['tracks']:
    print(f"{track['trackNumber']}. {track['title']} - {track['duration']}")
```

---

### `get_album_browse_id()`
오디오 플레이리스트 ID로 앨범 browseId 조회

```python
get_album_browse_id(audioPlaylistId: str) -> str | None
```

**예제:**
```python
browse_id = ytmusic.get_album_browse_id("OLAK5uy_l...")
album = ytmusic.get_album(browse_id)
```

---

### `get_song()`
곡 메타데이터 조회

```python
get_song(
    videoId: str,                        # 비디오 ID (필수)
    signatureTimestamp: int | None = None  # 서명 타임스탬프
) -> dict
```

**반환 데이터:**
- `videoDetails` - 비디오 상세 정보
  - `videoId`, `title`, `lengthSeconds`, `channelId`, `author`, `viewCount`
- `microformat` - 마이크로포맷 데이터
- `streamingData` - 스트리밍 URL (signatureTimestamp 필요)

**예제:**
```python
song = ytmusic.get_song("dQw4w9WgXcQ")
print(song['videoDetails']['title'])
print(song['videoDetails']['author'])
print(f"조회수: {song['videoDetails']['viewCount']}")
```

---

### `get_song_related()`
관련 곡 목록

```python
get_song_related(browseId: str) -> list
```

**예제:**
```python
# get_watch_playlist에서 related browseId 획득
watch = ytmusic.get_watch_playlist(videoId="dQw4w9WgXcQ")
if watch.get('related'):
    related = ytmusic.get_song_related(watch['related'])
```

---

### `get_lyrics()`
가사 조회

```python
get_lyrics(
    browseId: str,               # 가사 browseId (필수)
    timestamps: bool = False     # 타임스탬프 포함 여부
) -> dict | None
```

**반환 데이터:**
- `lyrics` - 가사 텍스트
- `source` - 출처 정보
- `hasTimestamps` - 타임스탬프 유무

**예제:**
```python
watch = ytmusic.get_watch_playlist(videoId="dQw4w9WgXcQ")
if watch.get('lyrics'):
    lyrics = ytmusic.get_lyrics(watch['lyrics'])
    if lyrics:
        print(lyrics['lyrics'])
        print(f"출처: {lyrics['source']}")
```

---

### `get_user()`
사용자 프로필 정보

```python
get_user(channelId: str) -> dict
```

**예제:**
```python
user = ytmusic.get_user("UC...")
print(user['name'])
```

---

### `get_user_playlists()`
사용자의 공개 플레이리스트

```python
get_user_playlists(channelId: str, params: str) -> list
```

---

### `get_user_videos()`
사용자의 업로드 비디오

```python
get_user_videos(channelId: str, params: str) -> list
```

---

### `get_tasteprofile()`
음악 취향 프로필 조회

```python
get_tasteprofile() -> dict
```

---

## 3. 탐색 (Explore)

### `get_explore()`
탐색 페이지 데이터

```python
get_explore() -> dict
```

**반환 데이터:**
- 신규 앨범
- 트렌딩 콘텐츠
- 무드/장르
- 팟캐스트 에피소드
- 뮤직비디오

**예제:**
```python
explore = ytmusic.get_explore()
for section in explore:
    print(section)
```

---

### `get_mood_categories()`
무드 & 장르 카테고리 목록

```python
get_mood_categories() -> dict
```

**예제:**
```python
moods = ytmusic.get_mood_categories()
for category, items in moods.items():
    print(f"\n{category}:")
    for item in items:
        print(f"  - {item['title']}")
```

---

### `get_mood_playlists()`
특정 무드의 플레이리스트 목록

```python
get_mood_playlists(params: str) -> list
```

**예제:**
```python
moods = ytmusic.get_mood_categories()
# 첫 번째 무드 카테고리의 플레이리스트 가져오기
first_mood = list(moods.values())[0][0]
playlists = ytmusic.get_mood_playlists(first_mood['params'])
```

---

### `get_charts()`
인기 차트 조회

```python
get_charts(country: str = 'ZZ') -> dict
```

**country 코드:**
- `ZZ` - 글로벌
- `KR` - 한국
- `US` - 미국
- `JP` - 일본
- 기타 ISO 3166-1 alpha-2 국가 코드

**반환 데이터:**
- `songs` - 인기곡 (Top Songs)
- `videos` - 인기 뮤직비디오 (Top Videos)
- `artists` - 인기 아티스트 (Top Artists)
- `trending` - 트렌딩 (글로벌 제외)
- `genres` - 장르별 차트 (US만)

**예제:**
```python
# 글로벌 차트
global_charts = ytmusic.get_charts()

# 한국 차트
kr_charts = ytmusic.get_charts(country='KR')
print("한국 인기곡 Top 10:")
for i, song in enumerate(kr_charts['songs']['items'][:10], 1):
    print(f"{i}. {song['title']} - {song['artists'][0]['name']}")
```

---

## 4. Watch / 재생 대기열

### `get_watch_playlist()`
다음 재생 목록 (라디오/셔플 모드)

```python
get_watch_playlist(
    videoId: str | None = None,    # 비디오 ID
    playlistId: str | None = None, # 플레이리스트 ID
    limit: int = 25,               # 결과 수 제한
    radio: bool = False,           # 라디오 모드
    shuffle: bool = False          # 셔플 모드
) -> dict
```

**반환 데이터:**
- `tracks` - 트랙 목록
- `playlistId` - 플레이리스트 ID
- `lyrics` - 가사 browseId
- `related` - 관련 콘텐츠 browseId

**예제:**
```python
# 특정 곡 기반 재생 목록
watch = ytmusic.get_watch_playlist(videoId="dQw4w9WgXcQ")
for track in watch['tracks']:
    print(f"{track['title']} - {track['artists'][0]['name']}")

# 라디오 모드 (무작위)
radio = ytmusic.get_watch_playlist(videoId="dQw4w9WgXcQ", radio=True)

# 플레이리스트 셔플
shuffled = ytmusic.get_watch_playlist(
    playlistId="RDCLAK5uy_k...",
    shuffle=True
)
```

---

## 5. 팟캐스트 (Podcasts)

### `get_channel()`
팟캐스트 채널 정보

```python
get_channel(channelId: str) -> dict
```

**반환 데이터:**
- 채널 정보
- 최근 에피소드 (최대 10개)
- 관련 팟캐스트

**예제:**
```python
channel = ytmusic.get_channel("UC...")
print(channel['title'])
for episode in channel['episodes']:
    print(f"- {episode['title']}")
```

---

### `get_channel_episodes()`
채널의 전체 에피소드 목록

```python
get_channel_episodes(channelId: str, params: str) -> list
```

**예제:**
```python
channel = ytmusic.get_channel("UC...")
episodes_params = channel['episodes']['params']
all_episodes = ytmusic.get_channel_episodes("UC...", episodes_params)
```

---

### `get_podcast()`
팟캐스트 상세 정보

```python
get_podcast(playlistId: str, limit: int | None = 100) -> dict
```

**예제:**
```python
podcast = ytmusic.get_podcast("PLID...")
print(podcast['title'])
print(podcast['description'])
for episode in podcast['episodes']:
    print(f"- {episode['title']} ({episode['duration']})")
```

---

### `get_episode()`
에피소드 상세 정보

```python
get_episode(videoId: str) -> dict
```

**예제:**
```python
episode = ytmusic.get_episode("video_id")
print(episode['title'])
print(episode['description'])
print(episode['duration'])
```

---

### `get_episodes_playlist()`
에피소드 플레이리스트

```python
get_episodes_playlist(playlist_id: str = "RDPN") -> dict
```

**예제:**
```python
# 새 에피소드 플레이리스트 (기본값)
new_episodes = ytmusic.get_episodes_playlist()
```

---

## 6. 유틸리티

### `as_mobile()`
모바일 앱 컨텍스트로 전환 (다른 결과 반환)

```python
with ytmusic.as_mobile():
    results = ytmusic.search("BTS")
```

---

## 기능 요약표

| 카테고리 | 메서드 | 설명 |
|----------|--------|------|
| **검색** | `search()` | 곡/앨범/아티스트/플레이리스트 검색 |
| | `get_search_suggestions()` | 검색 자동완성 |
| **브라우징** | `get_home()` | 홈 피드 |
| | `get_artist()` | 아티스트 정보 |
| | `get_artist_albums()` | 아티스트 앨범 목록 |
| | `get_album()` | 앨범 상세 정보 |
| | `get_album_browse_id()` | 앨범 ID 조회 |
| | `get_song()` | 곡 메타데이터 |
| | `get_song_related()` | 관련 곡 |
| | `get_lyrics()` | 가사 조회 |
| | `get_user()` | 사용자 정보 |
| | `get_user_playlists()` | 사용자 플레이리스트 |
| | `get_user_videos()` | 사용자 비디오 |
| | `get_tasteprofile()` | 취향 프로필 |
| **탐색** | `get_explore()` | 탐색 페이지 |
| | `get_mood_categories()` | 무드/장르 카테고리 |
| | `get_mood_playlists()` | 무드 플레이리스트 |
| | `get_charts()` | 인기 차트 |
| **Watch** | `get_watch_playlist()` | 재생 대기열 |
| **팟캐스트** | `get_channel()` | 채널 정보 |
| | `get_channel_episodes()` | 채널 에피소드 |
| | `get_podcast()` | 팟캐스트 정보 |
| | `get_episode()` | 에피소드 정보 |
| | `get_episodes_playlist()` | 에피소드 플레이리스트 |

---

## 참고

- **공식 문서**: https://ytmusicapi.readthedocs.io/
- **GitHub**: https://github.com/sigma67/ytmusicapi
- **PyPI**: https://pypi.org/project/ytmusicapi/
- **요구사항**: Python 3.10+

---

*문서 생성일: 2024년*
