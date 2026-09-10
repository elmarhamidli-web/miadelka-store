-- ------------------------------------------------------------------
-- Zálohová faktura → daňový doklad
--
-- Objednávka placená kartou je zaplacená hned, takže dostane rovnou
-- fakturu. Dobírka / převod dostane nejdřív ZÁLOHOVOU fakturu (proforma)
-- s odkazem „Zaplatit online"; jakmile peníze dorazí, obchodnice ji
-- v administraci označí jako zaplacenou a fakturu odešle.
--
-- Spustit jednou v Supabase SQL editoru. Lze pouštět opakovaně.
-- ------------------------------------------------------------------

alter table public.orders
  -- 'proforma' = vystavená, čeká na úhradu · 'paid' = uhrazená faktura
  add column if not exists invoice_status  text,
  add column if not exists invoice_sent_at timestamptz;

-- Objednávky, které už fakturu mají, jsou z karetního toku → zaplacené.
update public.orders
   set invoice_status = 'paid'
 where invoice_status is null
   and (invoice_pdf is not null or invoice_url is not null)
   and status in ('paid', 'shipped', 'done');

-- Kontrola
select order_number, status, payment_method, invoice_status, invoice_sent_at
  from public.orders
 where invoice_url is not null or invoice_pdf is not null
 order by order_number desc
 limit 20;
