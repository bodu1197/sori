-- ============================================================================
-- Add result_json column to music_search_cache for fast lookup
-- This stores the entire search result as JSON for instant retrieval
-- ============================================================================

-- Add result_json column to store full search results
alter table music_search_cache
add column if not exists result_json jsonb;

-- Add index for faster lookups
create index if not exists idx_music_search_cache_result_json
on music_search_cache using gin (result_json);

-- Add ttl column for cache expiration tracking
alter table music_search_cache
add column if not exists expires_at timestamp with time zone;

-- Index for expiration queries
create index if not exists idx_music_search_cache_expires_at
on music_search_cache(expires_at);

-- Comment
comment on column music_search_cache.result_json is 'Full search result as JSON for instant retrieval without joins';
comment on column music_search_cache.expires_at is 'Cache expiration timestamp';
