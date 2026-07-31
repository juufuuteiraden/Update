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

drop policy if exists "gallery public insert" on gallery;
create policy "gallery public insert"
  on gallery for insert
  with check (true);

drop policy if exists "gallery public update" on gallery;
create policy "gallery public update"
  on gallery for update
  using (true)
  with check (true);

drop policy if exists "gallery public delete" on gallery;
create policy "gallery public delete"
  on gallery for delete
  using (true);

insert into storage.buckets (id, name, public)
values ('villa-images', 'villa-images', true)
on conflict (id) do update set public = true;

drop policy if exists "villa images public read" on storage.objects;
create policy "villa images public read"
  on storage.objects for select
  using (bucket_id = 'villa-images');

drop policy if exists "villa images public upload" on storage.objects;
create policy "villa images public upload"
  on storage.objects for insert
  with check (bucket_id = 'villa-images');

drop policy if exists "villa images public update" on storage.objects;
create policy "villa images public update"
  on storage.objects for update
  using (bucket_id = 'villa-images')
  with check (bucket_id = 'villa-images');

drop policy if exists "villa images public delete" on storage.objects;
create policy "villa images public delete"
  on storage.objects for delete
  using (bucket_id = 'villa-images');

create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  guest_name text,
  event_type text,
  rating int,
  quote text
);

create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  image_url text,
  price int,
  guests int,
  features text[]
);

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

-- ============================================================
-- New: Pricing & Access (walk-in rates)
-- ============================================================
create table if not exists rates_section (
  id uuid default gen_random_uuid() primary key,
  eyebrow text,
  title text,
  subtitle text
);

create table if not exists walk_in_rate (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  guests text,
  badge text,
  price_rows jsonb
);

-- ============================================================
-- New: Amenities
-- ============================================================
create table if not exists amenities_section (
  id uuid default gen_random_uuid() primary key,
  eyebrow text,
  title text,
  subtitle text
);

create table if not exists amenities (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  image_url text
);

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
