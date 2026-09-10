// Zálohová faktura (proforma) rendered by us, not by Stripe.
//
// A Stripe invoice that is still "open" always offers "Zaplatit online" on its
// hosted page, and that link cannot be turned off. For a cash-on-delivery
// order that is wrong: the carrier has already been told the parcel is paid on
// delivery, so the customer must not be invited to pay a second time. So the
// proforma is a plain document of ours — no payment link anywhere — and the
// real Stripe faktura is issued only once the money has actually arrived.
import { createHmac } from 'node:crypto'
import { czk2, round2 } from './money.js'

const SITE = 'https://www.littleonestore.cz'

/** Unguessable token so an order number alone does not expose the document. */
export function proformaToken(orderNumber) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'los-proforma'
  return createHmac('sha256', secret).update(`proforma:${orderNumber}`).digest('hex').slice(0, 20)
}

export function proformaUrl(orderNumber) {
  return `${SITE}/api/proforma?order=${encodeURIComponent(orderNumber)}&t=${proformaToken(
    orderNumber,
  )}`
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** Print-friendly HTML — the customer can save it as PDF from the browser. */
export function proformaHtml(order, { vatRate = 21 } = {}) {
  const issued = new Date(order.created_at || Date.now())
  const items = Array.isArray(order.items) ? order.items : []
  const div = 1 + (Number(vatRate) || 0) / 100

  /** Every money row is shown three ways: without VAT, the VAT itself, and
   *  the gross amount the customer actually pays. Prices in the shop already
   *  contain VAT, so the net figure is derived by dividing, never by adding. */
  const line = (label, sub, qty, grossCzk, negative = false) => {
    const gross = round2(grossCzk)
    const net = round2(gross / div)
    const vat = round2(gross - net)
    const sign = negative ? '−' : ''
    return {
      net: negative ? -net : net,
      vat: negative ? -vat : vat,
      gross: negative ? -gross : gross,
      html: `<tr${negative ? ' class="minus"' : ''}>
        <td>${label}${sub ? `<div class="sub">${sub}</div>` : ''}</td>
        <td class="num">${qty ?? ''}</td>
        <td class="num">${sign}${czk2(net)}</td>
        <td class="num">${sign}${czk2(vat)}</td>
        <td class="num">${sign}${czk2(gross)}</td>
      </tr>`,
    }
  }

  const parts = []

  for (const it of items) {
    const label =
      it.is_gift_card === true
        ? `${esc(it.name_cs || it.name)} — dárkový poukaz${
            it.size === 'physical' ? ' (poštou)' : ' (e-mailem)'
          }`
        : [it.name_cs || it.name, it.color, it.size].filter(Boolean).map(esc).join(' — ')
    const qty = Math.max(1, Number(it.qty) || 1)
    const unit = Number(it.price_czk) || 0
    parts.push(line(label, `${czk2(unit)} / ks včetně DPH`, qty, unit * qty))
  }

  if (Number(order.discount_czk) > 0) {
    parts.push(line(`Sleva ${esc(order.discount_code || '')}`, '', '', order.discount_czk, true))
  }
  if (Number(order.shipping_czk) > 0) {
    parts.push(line(`Doprava — ${esc(order.shipping_name || 'přeprava')}`, '', 1, order.shipping_czk))
  }
  if (Number(order.gift_card_czk) > 0) {
    parts.push(
      line(`Dárkový poukaz ${esc(order.gift_card_code || '')}`, '', '', order.gift_card_czk, true),
    )
  }

  const rows = parts.map((p) => p.html).join('')

  // The totals are the sum of the rows above, so the document always adds up
  // exactly — no line where the columns and the footer disagree by a haléř.
  const total = round2(parts.reduce((sum, p) => sum + p.gross, 0))
  const baseCzk = round2(parts.reduce((sum, p) => sum + p.net, 0))
  const vatCzk = round2(total - baseCzk)

  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Zálohová faktura — objednávka #${esc(order.order_number)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#eceae8;font:14px/1.55 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2c2530;}
  .sheet{max-width:760px;margin:24px auto;background:#fff;padding:44px 48px;border-radius:6px;box-shadow:0 2px 18px rgba(0,0,0,.08);}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:30px;}
  h1{font-size:24px;margin:0 0 4px;letter-spacing:-.01em;}
  .kind{font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#b06;font-weight:700;}
  .brand{font-size:19px;font-weight:700;color:#8b8391;text-align:right;}
  .meta{display:flex;gap:40px;flex-wrap:wrap;margin-bottom:28px;}
  .meta dl{margin:0;font-size:13px;}
  .meta dt{color:#8b8391;margin-top:5px;}
  .meta dd{margin:0;font-weight:600;}
  .parties{display:flex;gap:40px;flex-wrap:wrap;margin-bottom:32px;}
  .parties section{flex:1 1 240px;}
  .parties h2{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#8b8391;margin:0 0 8px;}
  .parties p{margin:0;line-height:1.6;}
  table{width:100%;border-collapse:collapse;margin-bottom:8px;}
  th{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b8391;text-align:left;border-bottom:1px solid #e2dfe4;padding:0 0 8px;font-weight:600;}
  td{padding:11px 0;border-bottom:1px solid #f2f0f3;vertical-align:top;}
  .num{text-align:right;white-space:nowrap;}
  .minus td{color:#15803d;}
  .sub{color:#8b8391;font-size:12px;margin-top:2px;}
  .totals{margin-left:auto;width:min(100%,320px);}
  .totals tr td{border:0;padding:5px 0;}
  .totals .grand td{border-top:2px solid #2c2530;font-size:17px;font-weight:800;padding-top:10px;}
  .note{margin-top:30px;padding:16px 18px;background:#fdf3f7;border-radius:10px;font-size:13px;line-height:1.65;color:#5d5266;}
  .foot{margin-top:22px;font-size:12px;line-height:1.7;color:#8b8391;}
  @media print{body{background:#fff}.sheet{box-shadow:none;margin:0;padding:0;max-width:none}}
</style></head><body>
<div class="sheet">
  <div class="top">
    <div>
      <div class="kind">Zálohová faktura · proforma</div>
      <h1>Objednávka #${esc(order.order_number)}</h1>
    </div>
    <div class="brand">Little One Store</div>
  </div>

  <div class="meta">
    <dl>
      <dt>Datum vystavení</dt>
      <dd>${issued.toLocaleDateString('cs-CZ')}</dd>
    </dl>
    <dl>
      <dt>Způsob úhrady</dt>
      <dd>${
        order.payment_method === 'cod' ? 'Dobírka / bankovní převod' : 'Dobírka'
      }</dd>
    </dl>
    <dl>
      <dt>Doprava</dt>
      <dd>${esc(order.shipping_name || '—')}</dd>
    </dl>
  </div>

  <div class="parties">
    <section>
      <h2>Dodavatel</h2>
      <p>
        <strong>Azruk s.r.o.</strong><br/>
        Hviezdoslavova 545/41<br/>
        627 00 Brno, Česká republika<br/>
        IČO: 14420333 · DIČ: CZ14420333<br/>
        Bankovní účet: 7441532004/5500
      </p>
    </section>
    <section>
      <h2>Odběratel</h2>
      <p>
        <strong>${esc(order.customer_name)}</strong><br/>
        ${esc(order.address)}<br/>
        ${esc(order.zip)} ${esc(order.city)}<br/>
        ${esc(order.email)}${order.phone ? `<br/>${esc(order.phone)}` : ''}
      </p>
    </section>
  </div>

  <table>
    <thead>
      <tr>
        <th>Popis</th>
        <th class="num">Množství</th>
        <th class="num">Bez DPH</th>
        <th class="num">DPH ${vatRate} %</th>
        <th class="num">Celkem</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    ${
      vatCzk > 0
        ? `<tr><td>Základ daně</td><td class="num">${czk2(baseCzk)}</td></tr>
           <tr><td>DPH ${vatRate} %</td><td class="num">${czk2(vatCzk)}</td></tr>`
        : ''
    }
    <tr class="grand"><td>Celkem k úhradě</td><td class="num">${czk2(total)}</td></tr>
  </table>

  <div class="note">
    <strong>Toto je zálohová faktura, není daňovým dokladem.</strong>
    Částku uhradíte při převzetí zásilky — kurýrovi, hotově nebo kartou.
    Nic neplaťte předem. Daňový doklad vám pošleme e-mailem, jakmile platbu přijmeme.
    ${
      vatCzk > 0
        ? `<br/>Ceny jsou uvedeny včetně DPH ${vatRate} %. Sleva i dárkový poukaz snižují základ daně.`
        : ''
    }
  </div>

  <div class="foot">
    Azruk s.r.o. · Hviezdoslavova 545/41, 627 00 Brno · IČO 14420333 · DIČ CZ14420333<br/>
    info@littleonestore.cz · www.littleonestore.cz
  </div>
</div>
</body></html>`
}
