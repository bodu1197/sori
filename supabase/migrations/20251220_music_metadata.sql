-- ============================================================================
-- Music Metadata Tables for SORI (MusicGram)
-- Purpose: Store YouTube Music data locally for fast search and new music detection
-- ============================================================================

-- 1. Artists Table
-- Stores artist information from YouTube Music
create table music_artists (
  id uuid default gen_random_uuid() primary key,
  browse_id text unique not null,  -- YouTube Music artist ID (e.g., UCxxxx)
  name text not null,
  name_normalized text,  -- Lowercase for search
  thumbnails jsonb default '[]'::jsonb,
  description text,
  subscribers text,
  song_count integer default 0,
  album_count integer default 0,
  last_updated timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Albums Table
-- Stores album/single/EP information
create table music_albums (
  id uuid default gen_random_uuid() primary key,
  browse_id text unique not null,  -- YouTube Music album ID
  artist_id uuid references music_artists(id) on delete cascade,
  artist_browse_id text,  -- Denormalized for faster queries
  title text not null,
  title_normalized text,  -- Lowercase for search
  album_type text default 'Album',  -- Album, Single, EP
  year text,
  thumbnails jsonb default '[]'::jsonb,
  track_count integer default 0,
  last_updated timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tracks Table
-- Stores individual song/track information
create table music_tracks (
  id uuid default gen_random_uuid() primary key,
  video_id text unique not null,  -- YouTube video ID
  album_id uuid references music_albums(id) on delete set null,
  artist_id uuid references music_artists(id) on delete set null,
  artist_browse_id text,  -- Denormalized
  album_browse_id text,   -- Denormalized
  title text not null,
  title_normalized text,  -- Lowercase for search
  artist_name text,  -- Denormalized artist name
  album_title text,  -- Denormalized album title
  duration text,
  duration_seconds integer,
  thumbnails jsonb default '[]'::jsonb,
  is_explicit boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Search Cache Table
-- Maps search keywords to artists for fast lookup
create table music_search_cache (
  id uuid default gen_random_uuid() primary key,
  keyword text not null,
  keyword_normalized text not null,  -- Lowercase
  country text default 'US',
  artist_ids uuid[] default '{}',
  result_count integer default 0,
  search_count integer default 1,  -- Track popularity
  last_searched timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(keyword_normalized, country)
);

-- ============================================================================
-- INDEXES for Fast Search (Critical for Large Data)
-- ============================================================================

-- Artists indexes
create index idx_music_artists_browse_id on music_artists(browse_id);
create index idx_music_artists_name_normalized on music_artists(name_normalized);
create index idx_music_artists_last_updated on music_artists(last_updated);

-- Albums indexes
create index idx_music_albums_browse_id on music_albums(browse_id);
create index idx_music_albums_artist_id on music_albums(artist_id);
create index idx_music_albums_artist_browse_id on music_albums(artist_browse_id);
create index idx_music_albums_title_normalized on music_albums(title_normalized);
create index idx_music_albums_year on music_albums(year desc);

-- Tracks indexes
create index idx_music_tracks_video_id on music_tracks(video_id);
create index idx_music_tracks_album_id on music_tracks(album_id);
create index idx_music_tracks_artist_id on music_tracks(artist_id);
create index idx_music_tracks_artist_browse_id on music_tracks(artist_browse_id);
create index idx_music_tracks_title_normalized on music_tracks(title_normalized);

-- Search cache indexes
create index idx_music_search_cache_keyword on music_search_cache(keyword_normalized);
create index idx_music_search_cache_country on music_search_cache(country);
create index idx_music_search_cache_search_count on music_search_cache(search_count desc);

-- ============================================================================
-- Full-Text Search (Korean + English)
-- Using pg_trgm for trigram similarity search
-- ============================================================================

-- Enable trigram extension for fuzzy search
create extension if not exists pg_trgm;

-- GIN indexes for trigram search (supports Korean)
create index idx_music_artists_name_trgm on music_artists using gin (name_normalized gin_trgm_ops);
create index idx_music_albums_title_trgm on music_albums using gin (title_normalized gin_trgm_ops);
create index idx_music_tracks_title_trgm on music_tracks using gin (title_normalized gin_trgm_ops);
create index idx_music_search_cache_keyword_trgm on music_search_cache using gin (keyword_normalized gin_trgm_ops);

-- ============================================================================
-- Trigger Functions
-- ============================================================================

-- Auto-normalize text fields on insert/update
create or replace function normalize_music_text()
returns trigger as $$
begin
  -- Normalize name/title to lowercase for consistent search
  if TG_TABLE_NAME = 'music_artists' then
    new.name_normalized := lower(new.name);
  elsif TG_TABLE_NAME = 'music_albums' then
    new.title_normalized := lower(new.title);
  elsif TG_TABLE_NAME = 'music_tracks' then
    new.title_normalized := lower(new.title);
  elsif TG_TABLE_NAME = 'music_search_cache' then
    new.keyword_normalized := lower(new.keyword);
  end if;
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger trg_music_artists_normalize
  before insert or update on music_artists
  for each row execute function normalize_music_text();

create trigger trg_music_albums_normalize
  before insert or update on music_albums
  for each row execute function normalize_music_text();

create trigger trg_music_tracks_normalize
  before insert or update on music_tracks
  for each row execute function normalize_music_text();

create trigger trg_music_search_cache_normalize
  before insert or update on music_search_cache
  for each row execute function normalize_music_text();

-- ============================================================================
-- Row Level Security (RLS)
-- Music data is public read, admin write only
-- ============================================================================

alter table music_artists enable row level security;
alter table music_albums enable row level security;
alter table music_tracks enable row level security;
alter table music_search_cache enable row level security;

-- Public read access
create policy "Music artists are viewable by everyone"
  on music_artists for select using (true);

create policy "Music albums are viewable by everyone"
  on music_albums for select using (true);

create policy "Music tracks are viewable by everyone"
  on music_tracks for select using (true);

create policy "Search cache is viewable by everyone"
  on music_search_cache for select using (true);

-- Service role can insert/update (for backend API)
create policy "Service role can manage music_artists"
  on music_artists for all using (auth.role() = 'service_role');

create policy "Service role can manage music_albums"
  on music_albums for all using (auth.role() = 'service_role');

create policy "Service role can manage music_tracks"
  on music_tracks for all using (auth.role() = 'service_role');

create policy "Service role can manage music_search_cache"
  on music_search_cache for all using (auth.role() = 'service_role');

-- ============================================================================
-- Helper Functions for Search
-- ============================================================================

-- Function to search artists with fuzzy matching
create or replace function search_music_artists(search_term text, limit_count integer default 10)
returns table (
  id uuid,
  browse_id text,
  name text,
  thumbnails jsonb,
  subscribers text,
  similarity real
) as $$
begin
  return query
  select
    a.id,
    a.browse_id,
    a.name,
    a.thumbnails,
    a.subscribers,
    similarity(a.name_normalized, lower(search_term)) as similarity
  from music_artists a
  where a.name_normalized % lower(search_term)
     or a.name_normalized ilike '%' || search_term || '%'
  order by similarity(a.name_normalized, lower(search_term)) desc
  limit limit_count;
end;
$$ language plpgsql;

-- Function to get artist with all tracks
create or replace function get_artist_full_data(artist_browse_id text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'artist', (
      select row_to_json(a.*)
      from music_artists a
      where a.browse_id = artist_browse_id
    ),
    'albums', (
      select coalesce(json_agg(row_to_json(al.*) order by al.year desc), '[]')
      from music_albums al
      where al.artist_browse_id = artist_browse_id
    ),
    'tracks', (
      select coalesce(json_agg(row_to_json(t.*)), '[]')
      from music_tracks t
      where t.artist_browse_id = artist_browse_id
    )
  ) into result;

  return result;
end;
$$ language plpgsql;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

comment on table music_artists is 'YouTube Music artist metadata cache';
comment on table music_albums is 'YouTube Music album/single/EP metadata cache';
comment on table music_tracks is 'YouTube Music track/song metadata cache';
comment on table music_search_cache is 'Search keyword to artist mapping for fast lookup';

comment on column music_artists.browse_id is 'YouTube Music channel/artist ID';
comment on column music_tracks.video_id is 'YouTube video ID for playback';
comment on column music_search_cache.search_count is 'Number of times this keyword was searched (for trending)';
