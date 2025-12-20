-- 1. Profiles Table (Public User Info)
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- 2. Playlists Table
create table playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  title text not null,
  cover_url text,
  is_public boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Row Level Security (RLS) Enable
alter table profiles enable row level security;
alter table playlists enable row level security;

-- 4. Policies (누구나 조회 가능, 본인만 수정 가능)
-- Profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Playlists
create policy "Public playlists are viewable by everyone."
  on playlists for select
  using ( true );

create policy "Users can insert their own playlists."
  on playlists for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own playlists."
  on playlists for update
  using ( auth.uid() = user_id );

-- 5. Trigger for New User (자동으로 Profile 생성)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
