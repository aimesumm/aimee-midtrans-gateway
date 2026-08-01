-- Add QRIS cache column used by the payment flow
-- Run this in the Supabase SQL editor if your orders table doesn't have qris yet.

alter table if exists public.orders
add column if not exists qris jsonb;
