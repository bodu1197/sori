# Instagram UI/UX 100% Clone Guide

## 1. Project Goal (목표)

- **Objective**: Create a **Music Playlist Sharing Platform** wrapping the core experience of Instagram.
- **Concept**: "Instagram for Music" - Users create and share playlists instead of single photos/videos.
- **Key Focus**:
  - **Visuals**: Indistinguishable from Instagram (Pixel-perfect UI).
  - **Content**: The "Image" area represents the **Playlist Cover Art**.
  - **Interaction**: Users can play previews or full tracks directly from the feed.

## 2. Tech Stack Setup (기술 스택)

- **Framework**: React (Vite)
- **Styling**: Tailwind CSS (v4)
- **Icons**: Lucide React (or custom SVGs)
- **Fonts**: System Fonts (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, sans-serif) to mimic native OS feel.
- **Router**: React Router DOM
- **State Management**: Zustand (Required for Global Music Player state)
- **Music Data**: (Mock Data initially / Potential Spotify or Apple Music API integration later)
- **Audio**: HTML5 Audio or dedicated library (e.g., `react-h5-audio-player`).

## 3. Core Design Principles (핵심 디자인 원칙)

### A. Layout & Container

- **Mobile-First**: The primary interface is designed for mobile screens.
- **Max-Width Wrapper**: On desktop, the content should be contained within a phone-sized wrapper (e.g., `max-w-[470px]`) centered on screen, or a responsive layout that matches Instagram Web (Sidebar on left, feed center, suggestions right) depending on specific "Head Project" needs. _If purely mobile app emulation is the goal, restrict max-width._

### B. Typography

- **Font Weight**: Heavy usage of `font-medium` (500) and `font-semibold` (600) for usernames and interactive elements.
- **Size**:
  - Usernames: `text-sm` (14px)
  - Captions: `text-sm` (14px)
  - Timestamps: `text-xs` (12px), text-gray-400
  - Headers: `text-lg` or `text-xl` font-bold

### C. Color Palette (Dark/Light Mode)

- **Background**: White (`bg-white`) / Black (`dark:bg-black`)
- **Surface**: Off-white/Gray for borders (`border-gray-200` / `dark:border-gray-800`)
- **Accent**: Instagram Blue (`#0095F6`) for primary buttons/links.
- **Text**: `text-black` (primary), `text-gray-500` (secondary).

## 4. UI Components Specification (상세 컴포넌트 명세)

### 1. Bottom Navigation Bar (하단 탭 바)

- **Height**: Fixed, approx `h-[48px]` to `h-[52px]`.
- **Icons**: Home, Search, Add (Plus), Reels (Video), Profile.
- **State**: Active icon is filled, inactive is outlined.
- **Position**: `fixed bottom-0 w-full z-50 bg-white border-t border-gray-100`.

### 2. Top Navigation (상단 헤더)

- **Home**: "Instagram" logo (text image) on left. Creating/Message icons on right.
- **Detail Pages**: Back arrow (left), Title (center), Action (right).
- **Height**: `h-[44px]` (Standard iOS navbar height).

### 3. Stories Rail (스토리)

- **Layout**: Horizontal scroll (`overflow-x-auto`).
- **Item**:
  - Avatar circle with Gradient Ring (Instagram colors: yellow -> red -> purple).
  - Use `p-[2px]` gap between ring and image.
  - Text truncated below avatar.

### 4. Feed Post (피드 게시물 - Playlist Card)

- **Header**: Avatar (small), Username (bold), Time, "More" options (...)
- **Media Area (The Playlist)**:
  - **Visual**: Large Square (1:1) Playlist Cover Art.
  - **Overlay**: Subtle "Play" icon in the bottom right or center to initiate playback.
  - **Interaction**: Clicking the cover could toggle play/pause or open the playlist detail view (Tracklist).
- **Actions Bar**: Like, Comment, Share, **Add to Library** (Replace Save).
- **Likes Count**: "Liked by **user** and **others**"
- **Caption**: Playlist Title (Bold) + Description.
- **Track Preview**: (Optional) A scrolling ticker showing "Now Playing: Song Name - Artist" if active.

### 5. Global Music Player (New Component)

- **Position**: Fixed above the Bottom Navigation Bar.
- **Layout**: Mini-player style (ala Spotify/Apple Music).
- **Content**: Current Album Art (Tiny), Track Title (Marquee), Play/Pause Btn.
- **Z-Index**: Below Bottom Sheet, Above Feed.

### 6. Functionality: Creation Flow (Upload -> Create Playlist)

- **Step 1**: "Select Music" instead of "Select Photo".
  - Search Interface to find songs from library.
- **Step 2**: "Edit List". Reorder songs, add/remove.
- **Step 3**: "Cover & Caption". Upload custom cover art or auto-generate from song covers. Write caption.
- **Step 4**: Share.

### 7. Profile Page (프로필)

- **Header**: Avatar (Left large), Stats (Playlists, Followers, Following) on right.
- **Bio**: Name (Bold), Preferred Genres, Bio text, Link.
- **Action Buttons**: "Edit Profile", "Share Profile" (Gray background, full width or half width).
- **Highlights**: Horizontal scroll circles below bio.
- **Tab Bar**: Playlists (Grid), Saved Tracks, Tagged.

## 5. Implementation Roadmap (구현 가이드)

1.  **Global Styles**: Set `body { background: #fafafa; }` for desktop, white for mobile container.
2.  **App Shell**: Create `Layout.tsx` with `Outlet` for pages + `BottomNav` (conditionally rendered).
3.  **Assets**: Gather SVGs for all icons to ensure exact match (do not rely on generic icon sets if possible, or style them carefully).
4.  **Mock Data**: create a `data.ts` with dummy users, posts, and stories to populate the UI immediately.

## 6. Infrastructure & Tech Stack Decision (인프라 및 기술 스택 결정)

이 프로젝트("Head Project")의 목표인 **빠른 UI/UX 구현 및 모바일 앱 경험**을 위해 다음 조합을 강력히 추천합니다.

### ✅ 추천 조합: Git + Vercel + Supabase

이 조합은 "Instagram Clone"과 같은 소셜 미디어 서비스에 가장 최적화되어 있습니다.

| 구분                | 추천 기술        | 선택 이유                                                                                                                                                                                                                                                                                                                                                                  |
| :------------------ | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hosting**         | **Vercel**       | - React/Vite 프로젝트 배포에 가장 최적화되어 있습니다.<br>- Git 푸시만으로 자동 배포(CI/CD)가 구축됩니다.<br>- 전 세계 엣지 네트워크를 통해 모바일 앱처럼 빠른 로딩 속도를 제공합니다.                                                                                                                                                                                     |
| **Backend / DB**    | **Supabase**     | - **이미지/영상 저장소 (Storage)**: 인스타그램 핵심 기능인 미디어 업로드를 쉽게 구현할 수 있습니다.<br>- **인증 (Auth)**: 소셜 로그인 및 이메일 가입이 내장되어 있습니다.<br>- **실시간 (Realtime)**: DM(채팅), 좋아요 알림 기능을 별도 서버 구축 없이 구현 가능합니다.<br>- **Database**: 강력한 PostgreSQL을 사용하여 팔로우/팔로잉 관계 데이터를 효율적으로 관리합니다. |
| **Version Control** | **Git (GitHub)** | - Vercel과 완벽하게 연동됩니다.<br>- 코드 변경 사항을 체계적으로 관리할 수 있습니다.                                                                                                                                                                                                                                                                                       |

### ❌ Google Cloud 비추천 사유

- **Google Cloud**는 강력하지만 초기 설정과 유지보수 비용(시간/노력)이 큽니다.
- 단순한 웹 애플리케이션 호스팅과 DB 연결을 위해 Cloud Run, SQL 등을 각각 설정하는 것은 이 프로젝트의 핵심 목표(UI/UX 완성)에 집중하는 것을 방해할 수 있습니다.

### 결론

**"Git + Vercel + Supabase"** 스택으로 진행하여 인프라 구축 시간을 최소화하고, **UI/UX 디테일과 기능 구현에 100% 집중**하는 것이 좋습니다.

---

**Note**: This document serves as the "Sourse of Truth" for UI/UX. Any deviation from the Instagram look-and-feel should be corrected to match this guide.
