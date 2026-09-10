-- ------------------------------------------------------------------
-- SKLAD — oprava a kontrola
--
-- Co soubor dělá, v tomhle pořadí:
--   1. dorovná sloupce, na kterých skladová logika stojí
--   2. přeinstaluje funkce a trigger, který odečítá kusy při objednávce
--   3. dopočítá zpětně objednávky, které vznikly, když trigger chyběl
--   4. vypíše úplnou kontrolní tabulku: naskladněno / prodáno / na skladě
--
-- Dorovná i chybějící sloupce a tabulku pohybů, takže nezáleží na tom, které
-- dřívější migrace proběhly. Lze pouštět opakovaně — krok 3 se řídí knihou
-- pohybů, takže se nic neodečte dvakrát.
-- Spustit v Supabase SQL editoru.
-- ------------------------------------------------------------------

-- ==================================================================
-- 1) Sloupce
-- ==================================================================
alter table public.products
  add column if not exists stock_qty      integer,
  add column if not exists stock_variants jsonb   not null default '{}'::jsonb,
  add column if not exists is_gift_card   boolean not null default false;

-- Kniha skladových pohybů (naskladnění, prodej, vrácení, ruční úprava).
create table if not exists public.stock_movements (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  note         text,
  order_number integer,
  items        jsonb not null default '[]'::jsonb,
  created_by   text,
  created_at   timestamptz not null default now()
);
alter table public.stock_movements enable row level security;
drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements
  for select to authenticated using (true);

-- ==================================================================
-- 2) Funkce a trigger
-- ==================================================================

-- Klíč varianty — musí odpovídat variantKey() ve frontendu.
create or replace function public.variant_key(p_size text, p_color text)
returns text language sql immutable as $$
  select coalesce(nullif(btrim(p_size), ''), '-') || '__' ||
         coalesce(nullif(btrim(p_color), ''), '-')
$$;

-- Celkový stav skladu = součet variant, pokud je matice vyplněná.
create or replace function public.products_stock_total()
returns trigger language plpgsql as $$
declare total int;
begin
  if new.stock_variants is not null and new.stock_variants <> '{}'::jsonb then
    select coalesce(sum(nullif(value, '')::int), 0) into total
      from jsonb_each_text(new.stock_variants);
    new.stock_qty := total;
  end if;
  return new;
end $$;

drop trigger if exists products_stock_total_trg on public.products;
create trigger products_stock_total_trg
before insert or update on public.products
for each row execute function public.products_stock_total();

-- Odečtení (p_sign = 1) nebo vrácení (p_sign = -1) kusů podle položek.
create or replace function public.apply_order_stock(p_items jsonb, p_sign int)
returns void language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod public.products%rowtype; k text; d int;
begin
  for it in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    select * into prod from public.products where id = it->>'id';
    continue when not found;
    continue when prod.is_gift_card;          -- poukaz není skladová položka

    d := coalesce(nullif(it->>'qty', ''), '0')::int * p_sign;
    continue when d = 0;

    k := public.variant_key(it->>'size', it->>'color');

    if prod.stock_variants ? k then
      -- Sklad po variantách: odečteme z konkrétní kombinace, celkový stav
      -- pak dopočítá products_stock_total_trg.
      update public.products
         set stock_variants = jsonb_set(
               stock_variants, array[k],
               to_jsonb(greatest(0, coalesce((stock_variants->>k)::int, 0) - d)))
       where id = prod.id;

    elsif coalesce(prod.stock_variants, '{}'::jsonb) = '{}'::jsonb then
      -- Matice se nevede → odečteme z celkového množství. Odkazujeme se na
      -- sloupec, ne na proměnnou: při dvou souběžných objednávkách by se
      -- snapshot přepsal a jeden odpis by zmizel.
      update public.products
         set stock_qty = greatest(0, stock_qty - d)
       where id = prod.id and stock_qty is not null;

    else
      -- Matice se vede, ale tahle kombinace v ní není — někdo změnil
      -- velikosti nebo barvy až po objednávce. Založíme buňku s nulou a
      -- upozorníme; dopočítat správný počet musí člověk. Nikdy sem nepíšeme
      -- kladné číslo, jinak by zrušení objednávky vyrobilo kusy z ničeho.
      update public.products
         set stock_variants = jsonb_set(
               coalesce(stock_variants, '{}'::jsonb), array[k], to_jsonb(0))
       where id = prod.id;
      raise warning
        'Objednávka obsahuje neznámou variantu % u produktu % — sklad zkontrolujte ručně',
        k, prod.id;
    end if;
  end loop;
end $$;

-- Pryč s jakoukoli starší skladovou logikou, ať se neodečítá dvakrát.
do $$
declare t record;
begin
  for t in
    select tg.tgname from pg_trigger tg
      join pg_proc p on p.oid = tg.tgfoid
     where tg.tgrelid = 'public.orders'::regclass and not tg.tgisinternal
       and (p.proname ilike '%stock%' or p.prosrc ilike '%stock_qty%'
            or p.prosrc ilike '%apply_order_stock%')
  loop
    execute format('drop trigger %I on public.orders', t.tgname);
  end loop;
end $$;

create or replace function public.orders_stock_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  active constant text[] := array['new', 'paid', 'shipped', 'done'];
  was_active boolean; is_active boolean; moved jsonb;
begin
  if tg_op = 'INSERT' then
    was_active := false;
  else
    was_active := old.status = any (active);
  end if;
  is_active := new.status = any (active);

  if is_active and not was_active then
    perform public.apply_order_stock(new.items, 1);
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', value->>'id',
             'name', coalesce(value->>'name_cs', value->>'name'),
             'size', value->>'size', 'color', value->>'color',
             'qty', -1 * coalesce(nullif(value->>'qty', ''), '0')::int)), '[]'::jsonb)
      into moved from jsonb_array_elements(coalesce(new.items, '[]'::jsonb));
    insert into public.stock_movements (type, note, order_number, items, created_by)
    values ('order', null, new.order_number, moved, new.email);

  elsif was_active and not is_active then
    perform public.apply_order_stock(old.items, -1);
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', value->>'id',
             'name', coalesce(value->>'name_cs', value->>'name'),
             'size', value->>'size', 'color', value->>'color',
             'qty', coalesce(nullif(value->>'qty', ''), '0')::int)), '[]'::jsonb)
      into moved from jsonb_array_elements(coalesce(old.items, '[]'::jsonb));
    insert into public.stock_movements (type, note, order_number, items, created_by)
    values ('restock', 'Zrušená objednávka', new.order_number, moved, new.email);
  end if;

  return new;
end $$;

drop trigger if exists orders_stock_sync_trg on public.orders;
create trigger orders_stock_sync_trg
after insert or update of status on public.orders
for each row execute function public.orders_stock_sync();

-- ==================================================================
-- 3) Zpětné dorovnání
--    Objednávky, které vznikly bez triggeru, nemají v knize pohybů řádek
--    typu 'order'. Právě podle toho se poznají — a proto opakované
--    spuštění tohohle souboru už nic neodečte.
-- ==================================================================
do $$
declare
  o record;
  moved jsonb;
  n int := 0;
begin
  for o in
    select ord.order_number, ord.items, ord.email
      from public.orders ord
     where ord.status in ('new', 'paid', 'shipped', 'done')
       and ord.order_number is not null
       and not exists (
             select 1 from public.stock_movements m
              where m.order_number = ord.order_number
                and m.type = 'order')
     order by ord.order_number
  loop
    perform public.apply_order_stock(o.items, 1);
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', value->>'id',
             'name', coalesce(value->>'name_cs', value->>'name'),
             'size', value->>'size', 'color', value->>'color',
             'qty', -1 * coalesce(nullif(value->>'qty', ''), '0')::int)), '[]'::jsonb)
      into moved from jsonb_array_elements(coalesce(o.items, '[]'::jsonb));
    insert into public.stock_movements (type, note, order_number, items, created_by)
    values ('order', 'Dorovnání zpětně', o.order_number, moved, o.email);
    n := n + 1;
  end loop;
  raise notice 'Dorovnáno objednávek: %', n;
end $$;

-- ==================================================================
-- 4) KONTROLY
-- ==================================================================

-- 4a) Na objednávkách musí být právě jeden trigger: orders_stock_sync_trg
select tg.tgname as trigger_na_objednavkach, p.proname as funkce
  from pg_trigger tg
  join pg_proc p on p.oid = tg.tgfoid
 where tg.tgrelid = 'public.orders'::regclass and not tg.tgisinternal;

-- 4b) Úplná sesouhlasení skladu — všechny produkty, ne výběr.
--     sklad_ted  = co je v databázi
--     varianty   = součet matice velikost × barva (0 = matice se nevede)
--     naskladneno= naskladnění + ruční úpravy z knihy pohybů. Kusy, které
--                  byly na skladě dřív, než kniha pohybů vznikla, tu nejsou —
--                  u starých produktů proto "zkontrolovat" nemusí znamenat chybu
--     prodano    = kusy v platných objednávkách
--     ocekavano  = naskladneno − prodano (jen pro produkty vedené po matici
--                  to musí sedět; u ručně nastaveného skladu ne)
select
  p.name_cs                                              as produkt,
  p.stock_qty                                            as sklad_ted,
  coalesce(v.soucet, 0)                                  as varianty,
  coalesce(d.ks, 0)                                      as naskladneno,
  coalesce(s.ks, 0)                                      as prodano,
  coalesce(d.ks, 0) - coalesce(s.ks, 0)                  as ocekavano,
  case
    when p.stock_qty is null then 'sklad se nesleduje'
    when p.stock_qty = coalesce(d.ks, 0) - coalesce(s.ks, 0) then 'ok'
    else 'zkontrolovat'
  end                                                    as stav
  from public.products p
  left join lateral (
        select coalesce(sum(nullif(e.value, '')::int), 0) as soucet
          from jsonb_each_text(p.stock_variants) e
       ) v on true
  left join (
        select i->>'id' as pid, sum(coalesce(nullif(i->>'qty', ''), '0')::int) as ks
          from public.stock_movements m,
               jsonb_array_elements(coalesce(m.items, '[]'::jsonb)) i
         where m.type in ('delivery', 'adjustment')
         group by 1
       ) d on d.pid = p.id
  left join (
        select i->>'id' as pid, sum(coalesce(nullif(i->>'qty', ''), '0')::int) as ks
          from public.orders o,
               jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) i
         where o.status in ('new', 'paid', 'shipped', 'done')
         group by 1
       ) s on s.pid = p.id
 where p.is_gift_card = false
 order by p.name_cs;
