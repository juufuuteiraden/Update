-- ============================================================
-- VILLA SUSANE RESORT — SUPABASE DATABASE SETUP
-- ============================================================
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard
--   2. Open your project (the one with URL ending in ...vvyzem.supabase.co)
--   3. Click "SQL Editor" in the left sidebar
--   4. Click "New query"
--   5. Paste this ENTIRE script
--   6. Click "Run" (or press Ctrl/Cmd + Enter)
--   7. Confirm green "Success" message
-- ============================================================
-- SECURITY NOTE:
--   Public visitors can READ all content (SELECT).
--   Only AUTHENTICATED users (admin) can INSERT / UPDATE / DELETE.
--   Use the companion `rls-fix.sql` to create the admin auth user,
--   or create one manually in Dashboard → Authentication → Users.
-- ============================================================

-- 1) STORAGE BUCKET (for image uploads)
insert into storage.buckets (id, name, public)
values ('villa-images', 'villa-images', true)
on conflict (id) do update set public = true;

-- 2) GALLERY (Posts / photo uploads)
create table if not exists gallery (
  id uuid default gen_random_uuid() primary key,
  image_url text default '',
  "order" int default 0,
  title text default '',
  subtitle text default '',
  category text default ''
);

alter table gallery enable row level security;

drop policy if exists "gallery public read" on gallery;
create policy "gallery public read" on gallery for select using (true);

drop policy if exists "gallery authenticated insert" on gallery;
create policy "gallery authenticated insert" on gallery for insert to authenticated with check (true);

drop policy if exists "gallery authenticated update" on gallery;
create policy "gallery authenticated update" on gallery for update to authenticated using (true) with check (true);

drop policy if exists "gallery authenticated delete" on gallery;
create policy "gallery authenticated delete" on gallery for delete to authenticated using (true);

-- 3) REVIEWS
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  guest_name text default '',
  event_type text default '',
  rating int default 5,
  quote text default '',
  proof_image_url text default ''
);

alter table reviews enable row level security;

drop policy if exists "reviews public read" on reviews;
create policy "reviews public read" on reviews for select using (true);

drop policy if exists "reviews authenticated insert" on reviews;
create policy "reviews authenticated insert" on reviews for insert to authenticated with check (true);

drop policy if exists "reviews authenticated update" on reviews;
create policy "reviews authenticated update" on reviews for update to authenticated using (true) with check (true);

drop policy if exists "reviews authenticated delete" on reviews;
create policy "reviews authenticated delete" on reviews for delete to authenticated using (true);

-- 4) ROOMS
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  name text default '',
  description text default '',
  image_url text default '',
  price int default 0,
  guests int default 0,
  features text[] default '{}'
);

alter table rooms enable row level security;

drop policy if exists "rooms public read" on rooms;
create policy "rooms public read" on rooms for select using (true);

drop policy if exists "rooms authenticated insert" on rooms;
create policy "rooms authenticated insert" on rooms for insert to authenticated with check (true);

drop policy if exists "rooms authenticated update" on rooms;
create policy "rooms authenticated update" on rooms for update to authenticated using (true) with check (true);

drop policy if exists "rooms authenticated delete" on rooms;
create policy "rooms authenticated delete" on rooms for delete to authenticated using (true);

-- 5) PACKAGES
create table if not exists packages (
  id uuid default gen_random_uuid() primary key,
  name text default '',
  description text default '',
  price text default '',
  pax text default '',
  badge text default '',
  image_url text default '',
  inclusions text[] default '{}',
  highlighted boolean default false
);

alter table packages enable row level security;

drop policy if exists "packages public read" on packages;
create policy "packages public read" on packages for select using (true);

drop policy if exists "packages authenticated insert" on packages;
create policy "packages authenticated insert" on packages for insert to authenticated with check (true);

drop policy if exists "packages authenticated update" on packages;
create policy "packages authenticated update" on packages for update to authenticated using (true) with check (true);

drop policy if exists "packages authenticated delete" on packages;
create policy "packages authenticated delete" on packages for delete to authenticated using (true);

-- 6) RATES SECTION (section headings)
create table if not exists rates_section (
  id uuid default gen_random_uuid() primary key,
  eyebrow text default '',
  title text default '',
  subtitle text default ''
);

alter table rates_section enable row level security;

drop policy if exists "rates_section public read" on rates_section;
create policy "rates_section public read" on rates_section for select using (true);

drop policy if exists "rates_section authenticated insert" on rates_section;
create policy "rates_section authenticated insert" on rates_section for insert to authenticated with check (true);

drop policy if exists "rates_section authenticated update" on rates_section;
create policy "rates_section authenticated update" on rates_section for update to authenticated using (true) with check (true);

drop policy if exists "rates_section authenticated delete" on rates_section;
create policy "rates_section authenticated delete" on rates_section for delete to authenticated using (true);

-- 7) WALK-IN RATE
create table if not exists walk_in_rate (
  id uuid default gen_random_uuid() primary key,
  name text default '',
  description text default '',
  guests text default '',
  badge text default '',
  price_rows jsonb default '[]'
);

alter table walk_in_rate enable row level security;

drop policy if exists "walk_in_rate public read" on walk_in_rate;
create policy "walk_in_rate public read" on walk_in_rate for select using (true);

drop policy if exists "walk_in_rate authenticated insert" on walk_in_rate;
create policy "walk_in_rate authenticated insert" on walk_in_rate for insert to authenticated with check (true);

drop policy if exists "walk_in_rate authenticated update" on walk_in_rate;
create policy "walk_in_rate authenticated update" on walk_in_rate for update to authenticated using (true) with check (true);

drop policy if exists "walk_in_rate authenticated delete" on walk_in_rate;
create policy "walk_in_rate authenticated delete" on walk_in_rate for delete to authenticated using (true);

-- 8) AMENITIES SECTION (section headings)
create table if not exists amenities_section (
  id uuid default gen_random_uuid() primary key,
  eyebrow text default '',
  title text default '',
  subtitle text default ''
);

alter table amenities_section enable row level security;

drop policy if exists "amenities_section public read" on amenities_section;
create policy "amenities_section public read" on amenities_section for select using (true);

drop policy if exists "amenities_section authenticated insert" on amenities_section;
create policy "amenities_section authenticated insert" on amenities_section for insert to authenticated with check (true);

drop policy if exists "amenities_section authenticated update" on amenities_section;
create policy "amenities_section authenticated update" on amenities_section for update to authenticated using (true) with check (true);

drop policy if exists "amenities_section authenticated delete" on amenities_section;
create policy "amenities_section authenticated delete" on amenities_section for delete to authenticated using (true);

-- 9) AMENITIES
create table if not exists amenities (
  id uuid default gen_random_uuid() primary key,
  name text default '',
  description text default '',
  image_url text default ''
);

alter table amenities enable row level security;

drop policy if exists "amenities public read" on amenities;
create policy "amenities public read" on amenities for select using (true);

drop policy if exists "amenities authenticated insert" on amenities;
create policy "amenities authenticated insert" on amenities for insert to authenticated with check (true);

drop policy if exists "amenities authenticated update" on amenities;
create policy "amenities authenticated update" on amenities for update to authenticated using (true) with check (true);

drop policy if exists "amenities authenticated delete" on amenities;
create policy "amenities authenticated delete" on amenities for delete to authenticated using (true);

-- 10) EVENT SHOWCASE
create table if not exists event_showcase (
  id uuid default gen_random_uuid() primary key,
  title text not null default '',
  subtitle text not null default '',
  description text not null default '',
  price text not null default '',
  image_url text not null default '',
  category text not null default '',
  "order" int not null default 0
);

alter table event_showcase enable row level security;

drop policy if exists "event_showcase public read" on event_showcase;
create policy "event_showcase public read" on event_showcase for select using (true);

drop policy if exists "event_showcase authenticated insert" on event_showcase;
create policy "event_showcase authenticated insert" on event_showcase for insert to authenticated with check (true);

drop policy if exists "event_showcase authenticated update" on event_showcase;
create policy "event_showcase authenticated update" on event_showcase for update to authenticated using (true) with check (true);

drop policy if exists "event_showcase authenticated delete" on event_showcase;
create policy "event_showcase authenticated delete" on event_showcase for delete to authenticated using (true);

-- 11) STORAGE POLICIES (public read, authenticated writes)
drop policy if exists "villa images public read" on storage.objects;
create policy "villa images public read"
  on storage.objects for select
  using (bucket_id = 'villa-images');

drop policy if exists "villa images authenticated upload" on storage.objects;
create policy "villa images authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'villa-images');

drop policy if exists "villa images authenticated update" on storage.objects;
create policy "villa images authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'villa-images')
  with check (bucket_id = 'villa-images');

drop policy if exists "villa images authenticated delete" on storage.objects;
create policy "villa images authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'villa-images');

-- ============================================================
-- DONE! After running, check "Table Editor" in the sidebar —
-- you should see: gallery, reviews, rooms, packages,
-- rates_section, walk_in_rate, amenities_section, amenities,
-- event_showcase
--
-- NEXT STEP: create the admin auth user so the admin panel can
-- write. Either:
--   • Run `rls-fix.sql` (creates the admin user automatically), or
--   • Dashboard → Authentication → Users → Add user
-- ============================================================

