import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';
import useContentStore from '../stores/useContentStore';
import useContextRecommendation from '../hooks/useContextRecommendation';
import useCountry from '../hooks/useCountry';

// Types
export interface Artist {
  name: string;
  id?: string;
}

export interface RecommendationTrack {
  videoId: string;
  title: string;
  artist?: string;
  artists?: Artist[];
  thumbnail?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
  location?: string;
}

export interface FeedPost {
  id: string;
  title: string;
  artist?: string;
  caption?: string;
  cover_url?: string;
  video_id?: string;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  repost_count?: number;
  user_id?: string;
  is_public?: boolean;
  profile?: Profile;
  isRepost?: boolean;
  reposter?: Profile;
  repostQuote?: string;
}

export interface SuggestedUser {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  followers_count?: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

// Helper Function: getHighResThumbnail
export const getHighResThumbnail = (videoId?: string, coverUrl?: string): string => {
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }
  if (coverUrl) {
    const ytMatch = coverUrl.match(/https?:\/\/i\.ytimg\.com\/vi\/([^/]+)\//);
    if (ytMatch) {
      return `https://i.ytimg.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    }
    return coverUrl;
  }
  return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1280&h=720&fit=crop';
};

// Hook: useHomeRecommendations (For ForYouSection)
export function useHomeRecommendations() {
  const context = useContextRecommendation();
  const country = useCountry();
  const [recommendations, setRecommendations] = useState<RecommendationTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [countryName, setCountryName] = useState<string>('');

  useEffect(() => {
    async function fetchHomeRecommendations() {
      if (!country.code) return;

      try {
        setLoadingRecs(true);
        const response = await fetch(`${API_BASE_URL}/api/home?country=${country.code}`);

        if (response.ok) {
          const data = await response.json();
          const sections = data.sections || [];
          const allSongs: any[] = [];

          for (const section of sections) {
            const contents = section.contents || [];
            for (const item of contents) {
              if (item.videoId) {
                allSongs.push({
                  videoId: item.videoId,
                  title: item.title,
                  artists: item.artists,
                  thumbnails: item.thumbnails,
                });
              }
            }
          }

          if (allSongs.length > 0) {
            const now = new Date();
            const seed = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
            const maxOffset = Math.max(0, allSongs.length - 5);
            const offset = seed % (maxOffset + 1);
            const selected = allSongs.slice(offset, offset + 5);
            const finalSelection =
              selected.length < 5
                ? [...selected, ...allSongs.slice(0, 5 - selected.length)]
                : selected;

            setRecommendations(
              finalSelection.map((item) => ({
                videoId: item.videoId,
                title: item.title,
                artists: item.artists,
                thumbnail: item.thumbnails?.[0]?.url,
              }))
            );
          }
          setCountryName(country.name);
        }
      } catch {
        if (context.recommendation?.searchQuery) {
          try {
            const fallbackResponse = await fetch(
              `${API_BASE_URL}/api/search?q=${encodeURIComponent(
                context.recommendation.searchQuery
              )}&filter=songs&limit=5`
            );
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setRecommendations(fallbackData.results || fallbackData || []);
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setLoadingRecs(false);
      }
    }

    fetchHomeRecommendations();
  }, [country.code, country.name, context.recommendation?.searchQuery]);

  // Prefetch Profile Data (Home Data) for instant loading
  useEffect(() => {
    const prefetchData = async () => {
      const { homeData, homeDataLoadedAt, setHomeData } = useContentStore.getState();
      const now = Date.now();
      if (homeData && homeDataLoadedAt && now - homeDataLoadedAt < 5 * 60 * 1000) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/home?country=${country.code}&limit=6`);
        if (response.ok) {
          const data = await response.json();
          setHomeData(data);
        }
      } catch (err) {
        // Silent fail
      }
    };

    const timer = setTimeout(prefetchData, 2000);
    return () => clearTimeout(timer);
  }, [country.code]);

  return { recommendations, loadingRecs, countryName, context };
}

// Helper: Add profiles to suggestions list
function addProfilesToSuggestions(
  profiles: SuggestedUser[],
  suggestions: SuggestedUser[],
  addedIds: Set<string>,
  followingIds: Set<string>,
  maxCount: number,
  shuffle = false
): void {
  const source = shuffle ? [...profiles].sort(() => Math.random() - 0.5) : profiles;
  for (const profile of source) {
    if (addedIds.has(profile.id) || followingIds.has(profile.id)) continue;
    suggestions.push(profile);
    addedIds.add(profile.id);
    if (suggestions.length >= maxCount) break;
  }
}

// Helper: Fetch artist profiles
async function fetchArtistProfiles(options: {
  orderBy?: string;
  filterIds?: string[];
  excludeIds?: Set<string>;
  limit?: number;
}): Promise<SuggestedUser[]> {
  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, followers_count')
    .eq('member_type', 'artist');

  if (options.filterIds) {
    query = query.in('id', options.filterIds);
  }
  if (options.excludeIds && options.excludeIds.size > 0) {
    query = query.not('id', 'in', `(${Array.from(options.excludeIds).join(',')})`);
  }
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: false });
  }
  query = query.limit(options.limit || 20);

  const { data } = await query;
  return data || [];
}

// Hook: useSuggestedUsers (For SuggestedUsersSection)
export function useSuggestedUsers() {
  const { user } = useAuthStore();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestedUsers() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = new Set(followingData?.map((f) => f.following_id) || []);
        followingIds.add(user.id);

        const suggestions: SuggestedUser[] = [];
        const addedIds = new Set<string>();

        // Tier 1: Related artists from followed artists
        if (followingData && followingData.length > 0) {
          const relatedProfiles = await fetchArtistProfiles({
            excludeIds: followingIds,
            orderBy: 'followers_count',
            limit: 20,
          });
          addProfilesToSuggestions(relatedProfiles, suggestions, addedIds, followingIds, 4);
        }

        // Tier 2: Popular artists
        if (suggestions.length < 7) {
          const popularArtists = await fetchArtistProfiles({
            orderBy: 'followers_count',
            limit: 20,
          });
          addProfilesToSuggestions(popularArtists, suggestions, addedIds, followingIds, 7);
        }

        // Tier 3: Recently active artists
        if (suggestions.length < 10) {
          const { data: recentPosts } = await supabase
            .from('posts')
            .select('user_id')
            .order('created_at', { ascending: false })
            .limit(50);

          if (recentPosts) {
            const recentUserIds = [...new Set(recentPosts.map((p) => p.user_id))] as string[];
            const activeArtists = await fetchArtistProfiles({ filterIds: recentUserIds });
            addProfilesToSuggestions(activeArtists, suggestions, addedIds, followingIds, 10, true);
          }
        }

        // Tier 4: Random fill
        if (suggestions.length < 10) {
          const randomArtists = await fetchArtistProfiles({ limit: 30 });
          addProfilesToSuggestions(randomArtists, suggestions, addedIds, followingIds, 10, true);
        }

        setSuggestedUsers(suggestions);
      } catch (err) {
        console.error('Error fetching suggested users:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestedUsers();
  }, [user]);

  return { suggestedUsers, loading };
}
