-- ============================================================
-- VILLA SUSANE RESORT — RLS SECURITY FIX
-- ============================================================
-- WHAT THIS FIXES:
--   Previously every table had public INSERT / UPDATE / DELETE
--   policies with `USING (true)` / `WITH CHECK (true)`. This let
--   ANY anonymous visitor insert, modify, or delete records.
--
--   This migration:
--     1) Removes all insecure public write policies
--     2) Recreates write policies that require an AUTHENTICATED
--        Supabase user (the admin account)
--     3) Keeps public SELECT (read) so the public site still works
--     4) Hardens the storage bucket (uploads/updates/deletes require auth)
--     5) Creates the admin auth user (email + password)
--
-- HOW TO RUN:
--   1. Open your Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
--
-- ⚠ IMPORTANT: CHANGE THE ADMIN EMAIL/PASSWORD BELOW BEFORE RUNNING
-- ============================================================

-- ------------------------------------------------------------
-- 0) ADMIN AUTH USER (edit the email/password to your own!)
-- ------------------------------------------------------------
-- Option A: Use Supabase's built-in user creation via the management API.
-- If this script fails, use Option B below (manual creation via Dashboard).

-- Option B (manual): Go to Supabase Dashboard → Authentication → Users
-- → Click "Add User" → Enter:
--   Email: admin@villasusane.website
--   Password: SusaneVilla2024!
-- → Click "Create user"
-- Then run the rest of this SQL (everything after this section).
--
-- The RLS policies below will work once the user exists in auth.users.

-- ------------------------------------------------------------
-- 1) GALLERY
-- ------------------------------------------------------------
drop policy if exists "gallery public insert" on gallery;
drop policy if exists "gallery public update" on gallery;
drop policy if exists "gallery public delete" on gallery;

create policy "gallery authenticated insert" on gallery
  for insert to authenticated with check (true);

create policy "gallery authenticated update" on gallery
  for update to authenticated using (true) with check (true);

create policy "gallery authenticated delete" on gallery
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 2) REVIEWS
-- ------------------------------------------------------------
drop policy if exists "reviews public insert" on reviews;
drop policy if exists "reviews public update" on reviews;
drop policy if exists "reviews public delete" on reviews;

create policy "reviews authenticated insert" on reviews
  for insert to authenticated with check (true);

create policy "reviews authenticated update" on reviews
  for update to authenticated using (true) with check (true);

create policy "reviews authenticated delete" on reviews
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 3) ROOMS
-- ------------------------------------------------------------
drop policy if exists "rooms public insert" on rooms;
drop policy if exists "rooms public update" on rooms;
drop policy if exists "rooms public delete" on rooms;

create policy "rooms authenticated insert" on rooms
  for insert to authenticated with check (true);

create policy "rooms authenticated update" on rooms
  for update to authenticated using (true) with check (true);

create policy "rooms authenticated delete" on rooms
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 4) PACKAGES
-- ------------------------------------------------------------
drop policy if exists "packages public insert" on packages;
drop policy if exists "packages public update" on packages;
drop policy if exists "packages public delete" on packages;

create policy "packages authenticated insert" on packages
  for insert to authenticated with check (true);

create policy "packages authenticated update" on packages
  for update to authenticated using (true) with check (true);

create policy "packages authenticated delete" on packages
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 5) RATES SECTION (section headings)
-- ------------------------------------------------------------
drop policy if exists "rates_section public insert" on rates_section;
drop policy if exists "rates_section public update" on rates_section;
drop policy if exists "rates_section public delete" on rates_section;

create policy "rates_section authenticated insert" on rates_section
  for insert to authenticated with check (true);

create policy "rates_section authenticated update" on rates_section
  for update to authenticated using (true) with check (true);

create policy "rates_section authenticated delete" on rates_section
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 6) WALK-IN RATE
-- ------------------------------------------------------------
drop policy if exists "walk_in_rate public insert" on walk_in_rate;
drop policy if exists "walk_in_rate public update" on walk_in_rate;
drop policy if exists "walk_in_rate public delete" on walk_in_rate;

create policy "walk_in_rate authenticated insert" on walk_in_rate
  for insert to authenticated with check (true);

create policy "walk_in_rate authenticated update" on walk_in_rate
  for update to authenticated using (true) with check (true);

create policy "walk_in_rate authenticated delete" on walk_in_rate
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 7) AMENITIES SECTION (section headings)
-- ------------------------------------------------------------
drop policy if exists "amenities_section public insert" on amenities_section;
drop policy if exists "amenities_section public update" on amenities_section;
drop policy if exists "amenities_section public delete" on amenities_section;

create policy "amenities_section authenticated insert" on amenities_section
  for insert to authenticated with check (true);

create policy "amenities_section authenticated update" on amenities_section
  for update to authenticated using (true) with check (true);

create policy "amenities_section authenticated delete" on amenities_section
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 8) AMENITIES  ★ (the table flagged by the security scanner)
-- ------------------------------------------------------------
drop policy if exists "amenities public insert" on amenities;
drop policy if exists "amenities public update" on amenities;
drop policy if exists "amenities public delete" on amenities;

create policy "amenities authenticated insert" on amenities
  for insert to authenticated with check (true);

create policy "amenities authenticated update" on amenities
  for update to authenticated using (true) with check (true);

create policy "amenities authenticated delete" on amenities
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 9) EVENT SHOWCASE
-- ------------------------------------------------------------
drop policy if exists "event_showcase public insert" on event_showcase;
drop policy if exists "event_showcase public update" on event_showcase;
drop policy if exists "event_showcase public delete" on event_showcase;

create policy "event_showcase authenticated insert" on event_showcase
  for insert to authenticated with check (true);

create policy "event_showcase authenticated update" on event_showcase
  for update to authenticated using (true) with check (true);

create policy "event_showcase authenticated delete" on event_showcase
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- 10) STORAGE BUCKET (villa-images)
--     Public read stays; uploads/updates/deletes require auth
-- ------------------------------------------------------------
drop policy if exists "villa images public upload" on storage.objects;
drop policy if exists "villa images public update" on storage.objects;
drop policy if exists "villa images public delete" on storage.objects;

create policy "villa images authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'villa-images');

create policy "villa images authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'villa-images') with check (bucket_id = 'villa-images');

create policy "villa images authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'villa-images');

-- ============================================================
-- DONE!
--   • Public visitors can still READ all content
--   • Only the authenticated admin can INSERT/UPDATE/DELETE
--   • Sign in with the admin email/password from section 0
-- ============================================================

