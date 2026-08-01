-- ============================================================
-- VILLA SUSANE RESORT — SUPABASE SCHEMA (concise reference)
-- ============================================================
-- SECURITY NOTE:
--   Public visitors can READ all content (SELECT).
--   Only AUTHENTICATED users (admin) can INSERT / UPDATE / DELETE.
-- ============================================================

create table if not exists gallery (
  id uuid default gen_random_uuid() primary key,
  image_url text,
  "order" int,
  title text,
  subtitle text,
  category text
);

alter table gallery add column if not exists title text;
alter table gallery add column if not exists subtitle text;
alter table gallery add column if not exists category text;

alter table gallery enable row level security;

drop policy if exists "gallery public read" on gallery;
create policy "gallery public read"
  on gallery for select
  using (true);

drop policy if exists "gallery authenticated insert" on gallery;
create policy "gallery authenticated insert"
  on gallery for insert to authenticated
  with check (true);

drop policy if exists "gallery authenticated update" on gallery;
create policy "gallery authenticated update"
  on gallery for update to authenticated
  using (true)
  with check (true);

drop policy if exists "gallery authenticated delete" on gallery;
create policy "gallery authenticated delete"
  on gallery for delete to authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('villa-images', 'villa-images', true)
on conflict (id) do update set public = true;

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

create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  guest_name text,
  event_type text,
  rating int,
  quote text
);

alter table reviews enable row level security;

drop policy if exists "reviews public read" on reviews;
create policy "reviews public read"
  on reviews for select
  using (true);

drop policy if exists "reviews authenticated insert" on reviews;
create policy "reviews authenticated insert"
  on reviews for insert to authenticated
  with check (true);

drop policy if exists "reviews authenticated update" on reviews;
create policy "reviews authenticated update"
  on reviews for update to authenticated
  using (true)
  with check (true);

drop policy if exists "reviews authenticated delete" on reviews;
create policy "reviews authenticated delete"
  on reviews for delete to authenticated
  using (true);

create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  image_url text,
  price int,
  guests int,
  features text[]
);

alter table rooms enable row level security;

drop policy if exists "rooms public read" on rooms;
create policy "rooms public read"
  on rooms for select
  using (true);

drop policy if exists "rooms authenticated insert" on rooms;
create policy "rooms authenticated insert"
  on rooms for insert to authenticated
  with check (true);

drop policy if exists "rooms authenticated update" on rooms;
create policy "rooms authenticated update"
  on rooms for update to authenticated
  using (true)
  with check (true);

drop policy if exists "rooms authenticated delete" on rooms;
create policy "rooms authenticated delete"
  on rooms for delete to authenticated
  using (true);

create table if not exists packages (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text default '',
  price text,
  pax text default '',
  badge text default '',
  image_url text default '',
  inclusions text[],
  highlighted boolean default false
);

alter table packages enable row level security;

drop policy if exists "packages public read" on packages;
create policy "packages public read"
  on packages for select
  using (true);

drop policy if exists "packages authenticated insert" on packages;
create policy "packages authenticated insert"
  on packages for insert to authenticated
  with check (true);

drop policy if exists "packages authenticated update" on packages;
create policy "packages authenticated update"
  on packages for update to authenticated
  using (true)
  with check (true);

drop policy if exists "packages authenticated delete" on packages;
create policy "packages authenticated delete"
  on packages for delete to authenticated
  using (true);

-- ============================================================
-- New: Pricing & Access (walk-in rates)
-- ============================================================
create table if not exists rates_section (
  id uuid default gen_random_uuid() primary key,
  eyebrow text,
  title text,
  subtitle text
);

alter table rates_section enable row level security;

drop policy if exists "rates_section public read" on rates_section;
create policy "rates_section public read"
  on rates_section for select
  using (true);

drop policy if exists "rates_section authenticated insert" on rates_section;
create policy "rates_section authenticated insert"
  on rates_section for insert to authenticated
  with check (true);

drop policy if exists "rates_section authenticated update" on rates_section;
create policy "rates_section authenticated update"
  on rates_section for update to authenticated
  using (true)
  with check (true);

drop policy if exists "rates_section authenticated delete" on rates_section;
create policy "rates_section authenticated delete"
  on rates_section for delete to authenticated
  using (true);

create table if not exists walk_in_rate (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  guests text,
  badge text,
  price_rows jsonb
);

alter table walk_in_rate enable row level security;

drop policy if exists "walk_in_rate public read" on walk_in_rate;
create policy "walk_in_rate public read"
  on walk_in_rate for select
  using (true);

drop policy if exists "walk_in_rate authenticated insert" on walk_in_rate;
create policy "walk_in_rate authenticated insert"
  on walk_in_rate for insert to authenticated
  with check (true);

drop policy if exists "walk_in_rate authenticated update" on walk_in_rate;
create policy "walk_in_rate authenticated update"
  on walk_in_rate for update to authenticated
  using (true)
  with check (true);

drop policy if exists "walk_in_rate authenticated delete" on walk_in_rate;
create policy "walk_in_rate authenticated delete"
  on walk_in_rate for delete to authenticated
  using (true);

-- ============================================================
-- New: Amenities
-- ============================================================
create table if not exists amenities_section (
  id uuid default gen_random_uuid() primary key,
  eyebrow text,
  title text,
  subtitle text
);

alter table amenities_section enable row level security;

drop policy if exists "amenities_section public read" on amenities_section;
create policy "amenities_section public read"
  on amenities_section for select
  using (true);

drop policy if exists "amenities_section authenticated insert" on amenities_section;
create policy "amenities_section authenticated insert"
  on amenities_section for insert to authenticated
  with check (true);

drop policy if exists "amenities_section authenticated update" on amenities_section;
create policy "amenities_section authenticated update"
  on amenities_section for update to authenticated
  using (true)
  with check (true);

drop policy if exists "amenities_section authenticated delete" on amenities_section;
create policy "amenities_section authenticated delete"
  on amenities_section for delete to authenticated
  using (true);

create table if not exists amenities (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  image_url text
);

alter table amenities enable row level security;

drop policy if exists "amenities public read" on amenities;
create policy "amenities public read"
  on amenities for select
  using (true);

drop policy if exists "amenities authenticated insert" on amenities;
create policy "amenities authenticated insert"
  on amenities for insert to authenticated
  with check (true);

drop policy if exists "amenities authenticated update" on amenities;
create policy "amenities authenticated update"
  on amenities for update to authenticated
  using (true)
  with check (true);

drop policy if exists "amenities authenticated delete" on amenities;
create policy "amenities authenticated delete"
  on amenities for delete to authenticated
  using (true);

-- ============================================================
-- New: Event Showcase
-- ============================================================
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
create policy "event_showcase public read"
  on event_showcase for select
  using (true);

drop policy if exists "event_showcase authenticated insert" on event_showcase;
create policy "event_showcase authenticated insert"
  on event_showcase for insert to authenticated
  with check (true);

drop policy if exists "event_showcase authenticated update" on event_showcase;
create policy "event_showcase authenticated update"
  on event_showcase for update to authenticated
  using (true)
  with check (true);

drop policy if exists "event_showcase authenticated delete" on event_showcase;
create policy "event_showcase authenticated delete"
  on event_showcase for delete to authenticated
  using (true);

