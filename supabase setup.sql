-- ============================================================
-- MyTube Supabase Setup
-- Run this whole file in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. PROFILES ---------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- 2. VIDEOS -------------------------------------------------------
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete cascade not null,
  channel_name text not null,
  title text not null,
  description text default '',
  category text default 'General',
  visibility text default 'public' check (visibility in ('public','private')),
  is_clip boolean default false,
  duration text default '0:00',
  video_path text not null,      -- path inside 'videos' storage bucket
  thumb_path text,                -- path inside 'thumbnails' storage bucket
  views int default 0,
  likes int default 0,
  created_at timestamptz default now()
);

alter table videos enable row level security;

create policy "Public videos are viewable by everyone"
  on videos for select using (visibility = 'public' or owner = auth.uid());

create policy "Users can insert their own videos"
  on videos for insert with check (auth.uid() = owner);

create policy "Users can update their own videos"
  on videos for update using (auth.uid() = owner);

create policy "Users can delete their own videos"
  on videos for delete using (auth.uid() = owner);

-- 3. LIKES ----------------------------------------------------------
create table if not exists likes (
  user_id uuid references auth.users(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, video_id)
);

alter table likes enable row level security;

create policy "Likes are viewable by everyone"
  on likes for select using (true);

create policy "Users can like as themselves"
  on likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike as themselves"
  on likes for delete using (auth.uid() = user_id);

-- 4. COMMENTS -----------------------------------------------------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  text text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;

create policy "Comments are viewable by everyone"
  on comments for select using (true);

create policy "Users can post comments as themselves"
  on comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on comments for delete using (auth.uid() = user_id);

-- 5. SUBSCRIPTIONS --------------------------------------------------
create table if not exists subscriptions (
  subscriber_id uuid references auth.users(id) on delete cascade,
  channel_name text not null,
  created_at timestamptz default now(),
  primary key (subscriber_id, channel_name)
);

alter table subscriptions enable row level security;

create policy "Subs viewable by everyone"
  on subscriptions for select using (true);

create policy "Users can subscribe as themselves"
  on subscriptions for insert with check (auth.uid() = subscriber_id);

create policy "Users can unsubscribe as themselves"
  on subscriptions for delete using (auth.uid() = subscriber_id);

-- 6. WATCH HISTORY ----------------------------------------------------
create table if not exists watch_history (
  user_id uuid references auth.users(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  watched_at timestamptz default now(),
  primary key (user_id, video_id)
);

alter table watch_history enable row level security;

create policy "Users see their own history"
  on watch_history for select using (auth.uid() = user_id);

create policy "Users can add to their own history"
  on watch_history for insert with check (auth.uid() = user_id);

create policy "Users can upsert their own history"
  on watch_history for update using (auth.uid() = user_id);

create policy "Users can clear their own history"
  on watch_history for delete using (auth.uid() = user_id);

-- 7. VIEW/LIKE COUNT HELPERS (avoid read-then-write races) -----------
create or replace function increment_views(v_id uuid)
returns void as $$
  update videos set views = views + 1 where id = v_id;
$$ language sql security definer;

create or replace function increment_likes(v_id uuid, delta int)
returns void as $$
  update videos set likes = greatest(0, likes + delta) where id = v_id;
$$ language sql security definer;

-- ============================================================
-- STORAGE BUCKETS
-- Do this part in Dashboard > Storage (not SQL), OR run below:
-- ============================================================

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies: anyone can read (public buckets), only owners can write/delete.
-- Files are stored under a path prefixed with the user's auth.uid(), e.g. "{uid}/filename.mp4"

create policy "Public read videos"
  on storage.objects for select using (bucket_id = 'videos');

create policy "Users upload their own videos"
  on storage.objects for insert with check (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own videos"
  on storage.objects for delete using (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public read thumbnails"
  on storage.objects for select using (bucket_id = 'thumbnails');

create policy "Users upload their own thumbnails"
  on storage.objects for insert with check (
    bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own thumbnails"
  on storage.objects for delete using (
    bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public read avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- DONE. After running this:
-- 1. Go to Project Settings > API, copy "Project URL" and "anon public" key
-- 2. Paste them into index.html at the top of the <script> (SUPABASE_URL / SUPABASE_ANON)
-- 3. Go to Authentication > Providers > Email: make sure "Confirm email" is
--    OFF if you want instant signup/login without email verification,
--    or ON if you want users to click a confirmation link first.
-- ============================================================
