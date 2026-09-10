-- ------------------------------------------------------------------
-- Prodej dárkových poukazů jako běžného produktu
-- Spustit jednou v Supabase SQL editoru. Lze pouštět opakovaně.
-- ------------------------------------------------------------------

-- 1) Produkt může být dárkový poukaz. Cena produktu = hodnota poukazu
--    (částka je vždy včetně DPH).
alter table public.products
  add column if not exists is_gift_card boolean not null default false;

-- 2) U prodaných poukazů si pamatujeme, ze které objednávky vznikly.
alter table public.gift_cards
  add column if not exists order_number    integer,
  add column if not exists recipient_email text,
  add column if not exists sold_at         timestamptz;

create index if not exists gift_cards_order_idx on public.gift_cards (order_number);

-- 3) ZASTARALÉ — neplatná verze, ponechána jen kvůli historii.
--    Skladovou logiku dnes instaluje supabase-stock-fix.sql. Tenhle blok
--    NESPOUŠTĚJTE: obsahuje chybu, kvůli které se u produktu se skladem po
--    variantách ztratil kus, když se kombinace v matici nenašla.
/*
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
    continue when prod.is_gift_card;

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
  end loop;
end
$$;
*/

-- 4) Kontrola
select id, name_cs, price_czk, is_gift_card
  from public.products
 where is_gift_card
 order by price_czk;
