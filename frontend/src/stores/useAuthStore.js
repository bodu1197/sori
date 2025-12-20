// @ts-nocheck
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loading: true,

  initializeAuth: async () => {
    // Check active session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user || null, loading: false });

    // Listen for changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user || null, loading: false });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

export default useAuthStore;
