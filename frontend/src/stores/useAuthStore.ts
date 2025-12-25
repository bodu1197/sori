import { create } from 'zustand';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,

  initializeAuth: async () => {
    // Prevent multiple initializations
    if (get().initialized) return;

    try {
      // Check active session from storage
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      }

      set({
        session,
        user: session?.user || null,
        loading: false,
        initialized: true,
      });

      // Listen for auth changes (login, logout, token refresh)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        set({
          session,
          user: session?.user || null,
          loading: false,
        });

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
      });

      // Store subscription for cleanup (not returning to match Promise<void>)
      // Subscription is kept alive for the lifetime of the app

      const _subscription = subscription;
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false, initialized: true });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
}));

export default useAuthStore;
