-- ============================================================================
-- Cleanup: Clear corrupted cache and remove unused tables
-- Date: 2025-12-21
-- ============================================================================

-- 1. Clear corrupted search cache
TRUNCATE TABLE music_search_cache;

-- 2. Drop unused empty tables
DROP TABLE IF EXISTS music_tracks CASCADE;
DROP TABLE IF EXISTS music_albums CASCADE;
DROP TABLE IF EXISTS music_artists CASCADE;
DROP TABLE IF EXISTS artist_relations CASCADE;

-- 3. Drop related functions that reference deleted tables
DROP FUNCTION IF EXISTS search_music_artists(text, integer);
DROP FUNCTION IF EXISTS get_artist_full_data(text);
DROP FUNCTION IF EXISTS normalize_music_text();
