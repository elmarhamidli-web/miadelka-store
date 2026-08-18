-- ------------------------------------------------------------------
-- Skladové zásoby po variantách (velikost + barva)
-- Spustit jednou v Supabase SQL editoru. Lze pouštět opakovaně.
-- ------------------------------------------------------------------

-- 1) Nový sloupec: mapa "velikost__barva" -> počet kusů
alter table public.products
  add column if not exists stock_variants jsonb not null default '{}'::jsonb;

-- 2) Klíč varianty (musí odpovídat funkci variantKey() ve frontendu)
create or replace function public.variant_key(p_size text, p_color text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(btrim(p_size), ''), '-') || '__' ||
         coalesce(nullif(btrim(p_color), ''), '-')
$$;

-- 3) Celkový stav skladu = součet variant (pokud je matice vyplněná)
create or replace function public.products_stock_total()
returns trigger
language plpgsql
as $$
declare
  total int;
begin
  if new.stock_variants is not null and new.stock_variants <> '{}'::jsonb then
    select coalesce(sum(nullif(value, '')::int), 0)
      into total
      from jsonb_each_text(new.stock_variants);
    new.stock_qty := total;
  end if;
  return new;
end
$$;

drop trigger if exists products_stock_total_trg on public.products;
create trigger products_stock_total_trg
before insert or update on public.products
for each row execute function public.products_stock_total();

-- 4) Odečtení / vrácení kusů podle položek objednávky
--    p_sign =  1 → objednávka odebírá ze skladu
--    p_sign = -1 → zrušená objednávka vrací zpět
create or replace function public.apply_order_stock(p_items jsonb, p_sign int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it   jsonb;
  prod public.products%rowtype;
  k    text;
  d    int;
begin
  for it in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    select * into prod from public.products where id = it->>'id';
    continue when not found;

    d := coalesce(nullif(it->>'qty', ''), '0')::int * p_sign;
    continue when d = 0;

    k := public.variant_key(it->>'size', it->>'color');

    update public.products
       set stock_variants =
             case
               when stock_variants ? k
                 then jsonb_set(
                        stock_variants, array[k],
                        to_jsonb(greatest(0, coalesce((stock_variants->>k)::int, 0) - d)))
               else stock_variants
             end,
           stock_qty =
             case when stock_qty is null then null
                  else greatest(0, stock_qty - d) end
     where id = prod.id;
     -- products_stock_total_trg přepočítá stock_qty ze součtu variant,
     -- pokud je matice variant vyplněná.
  end loop;
end
$$;

-- 5) Trigger na objednávkách: odečti při vzniku, vrať při zrušení.
--    Nejdřív odstraníme jakoukoli starší skladovou logiku, aby se kusy
--    neodečítaly dvakrát.
do $$
declare
  t record;
begin
  for t in
    select tg.tgname
      from pg_trigger tg
      join pg_proc p on p.oid = tg.tgfoid
     where tg.tgrelid = 'public.orders'::regclass
       and not tg.tgisinternal
       and (p.proname ilike '%stock%' or p.prosrc ilike '%stock_qty%')
  loop
    execute format('drop trigger %I on public.orders', t.tgname);
  end loop;
end
$$;

create or replace function public.orders_stock_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active constant text[] := array['new', 'paid', 'shipped', 'done'];
  was_active boolean;
  is_active  boolean;
  moved      jsonb;
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
             'size', value->>'size',
             'color', value->>'color',
             'qty', -1 * coalesce(nullif(value->>'qty', ''), '0')::int)), '[]'::jsonb)
      into moved
      from jsonb_array_elements(coalesce(new.items, '[]'::jsonb));
    insert into public.stock_movements (type, note, order_number, items, created_by)
    values ('order', null, new.order_number, moved, new.email);

  elsif was_active and not is_active then
    perform public.apply_order_stock(old.items, -1);
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', value->>'id',
             'name', coalesce(value->>'name_cs', value->>'name'),
             'size', value->>'size',
             'color', value->>'color',
             'qty', coalesce(nullif(value->>'qty', ''), '0')::int)), '[]'::jsonb)
      into moved
      from jsonb_array_elements(coalesce(old.items, '[]'::jsonb));
    insert into public.stock_movements (type, note, order_number, items, created_by)
    values ('restock', 'Zrušená objednávka', new.order_number, moved, new.email);
  end if;

  return new;
end
$$;

drop trigger if exists orders_stock_sync_trg on public.orders;
create trigger orders_stock_sync_trg
after insert or update of status on public.orders
for each row execute function public.orders_stock_sync();

-- 6) Kontrola: nesmí zůstat žádná jiná funkce, která sama mění stock_qty.
select p.proname as funkce_menici_sklad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.prosrc ilike '%stock_qty%'
   and p.proname not in ('products_stock_total', 'apply_order_stock', 'orders_stock_sync');
