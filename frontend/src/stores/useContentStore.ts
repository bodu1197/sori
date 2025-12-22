import { create } from 'zustand';

interface HomeSection {
  title: string;
  contents: any[];
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
