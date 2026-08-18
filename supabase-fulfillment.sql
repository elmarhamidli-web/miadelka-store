-- ------------------------------------------------------------------
-- Order fulfillment / shipping columns
-- Run this once in the Supabase SQL editor (safe to re-run).
-- ------------------------------------------------------------------

alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists carrier        text,
  add column if not exists tracking_url    text,
  add column if not exists fulfilled_at    timestamptz,
  -- JSON list of the item ids/keys that were marked as fulfilled/shipped
  add column if not exists fulfilled_items jsonb;

-- Optional: index for looking up shipped orders quickly.
create index if not exists orders_status_idx on public.orders (status);
