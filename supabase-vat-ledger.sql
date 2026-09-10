-- ------------------------------------------------------------------
-- DPH na fakturách + evidence uplatněných kódů
-- Spustit jednou v Supabase SQL editoru. Lze pouštět opakovaně.
-- ------------------------------------------------------------------

-- 1) Daňový rozpad objednávky se ukládá k objednávce (kvůli účetnictví).
--    Ceny na webu jsou konečné, takže DPH je v částce obsažena:
--      dph      = celkem - celkem / (1 + sazba/100)
--      základ   = celkem - dph
alter table public.orders
  add column if not exists vat_rate      numeric,
  add column if not exists vat_czk       numeric(12,2),
  add column if not exists vat_base_czk  numeric(12,2);

-- Kdyby sloupce vznikly dřív jako integer, převedeme je na haléře.
alter table public.orders
  alter column vat_czk      type numeric(12,2),
  alter column vat_base_czk type numeric(12,2);

-- 2) Kniha uplatnění slevových kódů a dárkových poukazů.
--    Každé použití je samostatný řádek — jde dohledat, kdo, kdy, na kterou
--    objednávku a kolik z poukazu ubylo.
create table if not exists public.code_redemptions (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('discount', 'gift')),
  code           text not null,
  order_number   integer,
  amount_czk     integer not null default 0,
  balance_before integer,
  balance_after  integer,
  created_at     timestamptz not null default now()
);

create index if not exists code_redemptions_code_idx  on public.code_redemptions (code);
create index if not exists code_redemptions_order_idx on public.code_redemptions (order_number);

alter table public.code_redemptions enable row level security;

-- Zapisuje jen server (service-role klíč obchází RLS).
-- Čte jen přihlášená administrace.
drop policy if exists code_redemptions_read on public.code_redemptions;
create policy code_redemptions_read on public.code_redemptions
  for select to authenticated using (true);

-- 3) Kontrola
select kind, code, order_number, amount_czk, balance_after, created_at
  from public.code_redemptions
 order by created_at desc
 limit 20;
