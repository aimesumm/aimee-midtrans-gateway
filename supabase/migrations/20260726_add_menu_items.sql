-- Menu management for the Admin Dashboard.
-- Run this in the Supabase SQL editor. It only adds a new table, it does not
-- touch the existing `orders` table or any other data already in use.
-- The table starts empty: menu items are added only through Admin -> Tambah
-- Menu (no dummy/demo data is auto-seeded).

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Makanan',
  price numeric not null default 0,
  image_url text,
  badge text,
  description text,
  has_variant boolean not null default false,
  variants jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_items_sort_order_idx on public.menu_items (sort_order, created_at);

-- Optional: a public storage bucket for menu photos. Supabase Storage buckets
-- can't always be created from SQL depending on your project, so if this
-- statement errors, create a public bucket named "menu-images" from the
-- Storage tab in the Supabase dashboard instead.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;
