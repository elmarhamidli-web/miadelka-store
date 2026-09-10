-- ------------------------------------------------------------------
-- Osobní odběr + způsob doručení dárkového poukazu
-- Spustit jednou v Supabase SQL editoru. Lze pouštět opakovaně.
-- ------------------------------------------------------------------

-- 1) Nový druh dopravy: 'personal' = zákazník si zboží vyzvedne osobně.
--    Starý CHECK povoloval jen address/pickup, proto ho vyměníme.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.shipping_methods'::regclass
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.shipping_methods drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.shipping_methods
  add constraint shipping_methods_kind_check
  check (kind in ('address', 'pickup', 'personal'));

-- 2) Dárkový poukaz: e-mailem, poštou, nebo obojí (zákazník si vybere).
alter table public.products
  add column if not exists gift_delivery text not null default 'online';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.products'::regclass
       and conname = 'products_gift_delivery_check'
  ) then
    alter table public.products
      add constraint products_gift_delivery_check
      check (gift_delivery in ('online', 'physical', 'both'));
  end if;
end
$$;

-- 3) Osobní odběr rovnou přidáme, ať ho nemusí nikdo zakládat ručně.
--    Cena 0 Kč, bez přepravce. Vypnout nebo přejmenovat jde v administraci.
insert into public.shipping_methods
  (code, name_cs, name_en, name_uk, note_cs, price_czk, free_over_czk,
   kind, carrier, cod_allowed, active, sort)
select
  'osobni-odber',
  'Osobní odběr',
  'Personal collection',
  'Самовивіз',
  'Vyzvednete si u nás — zdarma',
  0, 0, 'personal', null, true, true,
  coalesce((select max(sort) from public.shipping_methods), 0) + 10
where not exists (
  select 1 from public.shipping_methods where kind = 'personal'
);

-- 4) Kontrola
select code, name_cs, kind, price_czk, active
  from public.shipping_methods
 order by sort;
