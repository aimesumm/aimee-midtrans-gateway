-- Adds `image_path` to menu_items so the app can track the exact Supabase
-- Storage object path (e.g. "makanan/dimsum-original-1723456789.jpg") next
-- to the public `image_url`. This lets the app delete the old file when an
-- image is replaced, and remove the file when a menu item is deleted, so
-- no orphaned files are left behind in the `menu-images` bucket.

alter table public.menu_items
  add column if not exists image_path text;

-- Make sure the public storage bucket exists (safe to re-run).
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;
