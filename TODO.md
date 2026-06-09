# TODO - Admin overlays on public homepage

- [ ] Add admin session utility + toolbar (thin fixed bar) rendered only when `localStorage['villa_susane_admin_session']==='true'`.
- [ ] Add dark modal component used by admin overlays.
- [ ] Posts / Gallery: floating “+ Add Photo” button inside `#posts`, upload modal, delete on hover.
- [ ] Rooms: `Rates.tsx` room grid gets “Add Room” card; edit/delete icons on hover for each room; modal with fields + features list.
- [ ] Packages: `Packages.tsx` packages grid gets “Add Package” card; edit/delete icons on hover; modal with name/price/inclusions + highlighted toggle.
- [ ] Reviews: `ReviewsSection.tsx` gets “+ Add Review” button; modal with guest name/event type/stars/quote; edit/delete icons on hover.
- [ ] Ensure no UI changes for non-admin visitors.
- [ ] Smoke test: run build/lint and verify admin CRUD updates Supabase + reflects instantly.

