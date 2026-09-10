-- ------------------------------------------------------------------
-- Rychlost: indexy pro dotazy, které administrace dělá nejčastěji
-- Spustit jednou v Supabase SQL editoru. Lze pouštět opakovaně.
-- ------------------------------------------------------------------

-- Seznam objednávek: "order by created_at desc limit N" bez indexu
-- prochází celou tabulku a s rostoucím počtem objednávek se zpomaluje.
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- Statistiky čtou události a objednávky za zvolené období.
create index if not exists events_created_at_idx
  on public.events (created_at desc);

create index if not exists events_type_created_idx
  on public.events (type, created_at desc);

-- Recenze na stránce produktu.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'reviews' and column_name = 'status'
  ) then
    execute 'create index if not exists reviews_product_idx on public.reviews (product_id, status)';
  else
    execute 'create index if not exists reviews_product_idx on public.reviews (product_id)';
  end if;
end
$$;

-- Faktury a poukazy dohledávané podle objednávky.
create index if not exists orders_order_number_idx
  on public.orders (order_number);

-- Kontrola: co teď na těchto tabulkách existuje
select tablename, indexname
  from pg_indexes
 where schemaname = 'public'
   and tablename in ('orders', 'events', 'reviews', 'gift_cards')
 order by tablename, indexname;
