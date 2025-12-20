-- ============================================================================
-- Artist Relations Table for SORI (MusicGram)
-- Purpose: Store relationships between artists (similar artists, members, etc.)
-- ============================================================================

-- Artist Relations Table
create table if not exists artist_relations (
  id uuid default gen_random_uuid() primary key,
  main_artist_browse_id text not null,
  related_artist_browse_id text not null,
  relation_type text default 'similar',  -- similar, member, collaboration
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(main_artist_browse_id, related_artist_browse_id)
);

-- Indexes
create index if not exists idx_artist_relations_main on artist_relations(main_artist_browse_id);
create index if not exists idx_artist_relations_related on artist_relations(related_artist_browse_id);

-- RLS
alter table artist_relations enable row level security;

-- Public read access
create policy "Artist relations are viewable by everyone"
  on artist_relations for select using (true);

-- Service role can manage
create policy "Service role can manage artist_relations"
  on artist_relations for all using (auth.role() = 'service_role');

-- Comment
comment on table artist_relations is 'Relationships between artists (similar, members, etc.)';
