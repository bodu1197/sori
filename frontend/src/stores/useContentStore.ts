import { create } from 'zustand';

interface HomeContentItem {
  videoId?: string;
  title?: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  playlistId?: string;
}

interface HomeSection {
  title: string;
  contents: HomeContentItem[];
}

interface HomeData {
  sections: HomeSection[];
}

interface ContentStore {
  homeData: HomeData | null;
  setHomeData: (data: HomeData) => void;
  homeDataLoadedAt: number | null; // To prevent stale data (optional TTL)
}

const useContentStore = create<ContentStore>((set) => ({
  homeData: null,
  setHomeData: (data) => set({ homeData: data, homeDataLoadedAt: Date.now() }),
  homeDataLoadedAt: null,
}));

export default useContentStore;
