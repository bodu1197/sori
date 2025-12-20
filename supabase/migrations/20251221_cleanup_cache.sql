-- ============================================================================
-- Cleanup: Fix ALL Supabase Advisor warnings
-- Date: 2025-12-21
-- ============================================================================

-- ==========================================================================
-- 1. DROP UNUSED TABLES (removes multiple_permissive_policies warnings)
-- ==========================================================================
DROP TABLE IF EXISTS music_tracks CASCADE;
DROP TABLE IF EXISTS music_albums CASCADE;
DROP TABLE IF EXISTS music_artists CASCADE;
DROP TABLE IF EXISTS artist_relations CASCADE;

-- ==========================================================================
-- 2. DROP UNUSED FUNCTIONS (removes function_search_path_mutable warnings)
-- ==========================================================================
DROP FUNCTION IF EXISTS search_music_artists(text, integer);
DROP FUNCTION IF EXISTS get_artist_full_data(text);
DROP FUNCTION IF EXISTS normalize_music_text() CASCADE;

-- ==========================================================================
-- 3. FIX RLS POLICIES - Use (select auth.uid()) for performance
-- ==========================================================================

-- profiles table
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- playlists table
DROP POLICY IF EXISTS "Users can insert their own playlists." ON playlists;
DROP POLICY IF EXISTS "Users can update their own playlists." ON playlists;

CREATE POLICY "Users can insert their own playlists."
  ON playlists FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own playlists."
  ON playlists FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ==========================================================================
-- 4. FIX music_search_cache RLS - Remove duplicate policies
-- ==========================================================================
DROP POLICY IF EXISTS "Search cache is viewable by everyone" ON music_search_cache;
DROP POLICY IF EXISTS "Service role can manage music_search_cache" ON music_search_cache;

-- Single policy for public read
CREATE POLICY "Public read access"
  ON music_search_cache FOR SELECT
  USING (true);

-- Service role uses bypass, no policy needed for writes

-- ==========================================================================
-- 5. MOVE pg_trgm EXTENSION to extensions schema
-- ==========================================================================
-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop and recreate extension in extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ==========================================================================
-- 6. FIX handle_new_user function with search_path
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;
