// Order e-mails via Resend (https://resend.com). Fire-and-forget helpers —
// e-mail failures must never break order placement or payment processing.

const FROM = process.env.EMAIL_FROM || 'Little One Store <objednavky@littleonestore.cz>'
const NOTIFY = process.env.ORDER_NOTIFY_EMAIL || 'info@littleonestore.cz'
const SITE = 'https://www.littleonestore.cz'

async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('RESEND_API_KEY missing — e-mail not sent:', subject)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    if (!res.ok) console.error('Resend error:', res.status, await res.text())
  } catch (err) {
    console.error('Resend send failed:', err)
  }
}

const czk = (n) => `${Number(n).toLocaleString('cs-CZ')} Kč`

function itemsTable(order) {
  const rows = (order.items || [])
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e6ee;">
          <strong style="color:#3a2e3a;">${i.name_cs ?? i.name}</strong><br/>
          <span style="color:#8b7d8b;font-size:13px;">${i.color} · ${i.size} · ${i.qty} ks</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #f0e6ee;white-space:nowrap;color:#3a2e3a;">
          ${czk(i.price_czk * i.qty)}
        </td>
      </tr>`,
    )
    .join('')
  const discountRow =
    Number(order.discount_czk) > 0
      ? `<tr>
        <td style="padding:10px 0;color:#1f9d63;">Sleva${order.discount_code ? ` (${order.discount_code})` : ''}</td>
        <td align="right" style="padding:10px 0;color:#1f9d63;">−${czk(order.discount_czk)}</td>
      </tr>`
      : ''
  const giftRow =
    Number(order.gift_card_czk) > 0
      ? `<tr>
        <td style="padding:10px 0;color:#1f9d63;">Dárkový poukaz${order.gift_card_code ? ` (${order.gift_card_code})` : ''}</td>
        <td align="right" style="padding:10px 0;color:#1f9d63;">−${czk(order.gift_card_czk)}</td>
      </tr>`
      : ''
  // The total is VAT-inclusive, so the tax is shown as an informative split
  // of the amount already paid — never added on top.
  const vatRow =
    Number(order.vat_czk) > 0
      ? `<tr>
        <td colspan="2" style="padding:6px 0 0;color:#8b7d8b;font-size:13px;">
          Základ daně ${czk(order.vat_base_czk)} · DPH ${Number(order.vat_rate)} % ${czk(
            order.vat_czk,
          )} (v ceně)
        </td>
      </tr>`
      : ''
  const shipLabel = order.shipping_name ? `Doprava — ${order.shipping_name}` : 'Doprava'
  const pickupRow = order.pickup_point_name
    ? `<tr><td colspan="2" style="padding:2px 0 10px;color:#6b5d6b;font-size:13px;">📍 Výdejní místo: <strong>${order.pickup_point_name}</strong></td></tr>`
    : ''
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
      ${rows}
      ${discountRow}
      <tr>
        <td style="padding:10px 0;color:#8b7d8b;">${shipLabel}</td>
        <td align="right" style="padding:10px 0;color:#8b7d8b;">${order.shipping_czk > 0 ? czk(order.shipping_czk) : 'Zdarma'}</td>
      </tr>
      ${pickupRow}
      ${giftRow}
      <tr>
        <td style="padding:10px 0;font-size:17px;"><strong>Celkem</strong></td>
        <td align="right" style="padding:10px 0;font-size:17px;"><strong>${czk(order.total_czk)}</strong></td>
      </tr>
      ${vatRow}
    </table>`
}

function shell(inner) {
  return `
  <div style="background:#faf6f2;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;padding:36px;box-shadow:0 8px 30px rgba(58,46,58,0.08);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:34px;">🧸</div>
        <div style="font-size:20px;font-weight:800;color:#3a2e3a;">LittleOne<span style="color:#ef5f8d;">Store</span></div>
      </div>
      ${inner}
      <p style="color:#b3a6b3;font-size:12px;text-align:center;margin-top:28px;line-height:1.6;">
        Little One Store · Azruk s.r.o. · IČO 14420333<br/>
        Hviezdoslavova 545/41, Brno · <a href="${SITE}" style="color:#b8577f;">littleonestore.cz</a>
      </p>
    </div>
  </div>`
}

/** Confirmation to the customer after placing a COD/bank-transfer order. */
export function customerOrderEmail(order) {
  return {
    to: order.email,
    subject: `Potvrzení objednávky #${order.order_number} — Little One Store`,
    html: shell(`
      <h1 style="font-size:22px;color:#3a2e3a;margin:0 0 6px;">Děkujeme za objednávku! 💝</h1>
      <p style="color:#6b5d6b;line-height:1.6;">
        Dobrý den, ${order.customer_name},<br/>
        přijali jsme vaši objednávku <strong>#${order.order_number}</strong>.
        Brzy se vám ozveme s podklady k platbě a informacemi o odeslání.
      </p>
      ${itemsTable(order)}
      <p style="color:#6b5d6b;line-height:1.6;">
        <strong>Doručovací adresa</strong><br/>
        ${order.customer_name}<br/>${order.address}<br/>${order.zip} ${order.city}
      </p>
      <p style="color:#6b5d6b;line-height:1.6;">
        <strong>Způsob platby:</strong> dobírka / bankovní převod
      </p>
    `),
  }
}

/** Confirmation to the customer after a successful card payment. */
export function customerPaidEmail(order) {
  // Stripe invoice (PDF / hosted page) when available.
  const invoiceLink = order.invoice_pdf || order.invoice_url
  const invoiceBlock = invoiceLink
    ? `<p style="text-align:center;margin:22px 0 6px;">
         <a href="${invoiceLink}" style="display:inline-block;background:#fff;border:2px solid #ef5f8d;color:#ef5f8d;text-decoration:none;font-weight:700;padding:11px 26px;border-radius:999px;">
           📄 Stáhnout fakturu (PDF)
         </a>
       </p>`
    : ''
  return {
    to: order.email,
    subject: `Platba přijata — objednávka #${order.order_number} — Little One Store`,
    html: shell(`
      <h1 style="font-size:22px;color:#3a2e3a;margin:0 0 6px;">Platba proběhla úspěšně! 🎉</h1>
      <p style="color:#6b5d6b;line-height:1.6;">
        Dobrý den, ${order.customer_name},<br/>
        přijali jsme platbu za objednávku <strong>#${order.order_number}</strong>.
        Zboží odešleme do 2–4 pracovních dnů a dáme vám vědět.
      </p>
      ${itemsTable(order)}
      <p style="color:#6b5d6b;line-height:1.6;">
        <strong>Doručovací adresa</strong><br/>
        ${order.customer_name}<br/>${order.address}<br/>${order.zip} ${order.city}
      </p>
      <p style="color:#6b5d6b;line-height:1.6;">
        <strong>Způsob platby:</strong> kartou online ✓ zaplaceno
      </p>
      ${invoiceBlock}
    `),
  }
}

/** Alert to the shop owner about a new order. */
export function ownerOrderEmail(order, paid) {
  return {
    to: NOTIFY,
    replyTo: order.email,
    subject: `🛒 Nová objednávka #${order.order_number} — ${czk(order.total_czk)}${paid ? ' (ZAPLACENO kartou)' : ' (dobírka/převod)'}`,
    html: shell(`
      <h1 style="font-size:20px;color:#3a2e3a;margin:0 0 6px;">Nová objednávka #${order.order_number}</h1>
      <p style="color:#6b5d6b;line-height:1.7;">
        <strong>Stav platby:</strong> ${paid ? '✅ Zaplaceno kartou' : '⏳ Dobírka / bankovní převod'}<br/>
        <strong>Zákazník:</strong> ${order.customer_name}<br/>
        <strong>E-mail:</strong> <a href="mailto:${order.email}" style="color:#b8577f;">${order.email}</a><br/>
        <strong>Telefon:</strong> ${order.phone}<br/>
        <strong>Adresa:</strong> ${order.address}, ${order.zip} ${order.city}
        ${order.note ? `<br/><strong>Poznámka:</strong> ${order.note}` : ''}
      </p>
      ${itemsTable(order)}
      <p style="text-align:center;margin-top:20px;">
        <a href="${SITE}/adminpanel" style="display:inline-block;background:#ef5f8d;color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:999px;">
          Otevřít administraci
        </a>
      </p>
      ${
        order.invoice_pdf || order.invoice_url
          ? `<p style="text-align:center;margin:10px 0 0;">
               <a href="${order.invoice_pdf || order.invoice_url}" style="display:inline-block;background:#fff;border:2px solid #ef5f8d;color:#ef5f8d;text-decoration:none;font-weight:700;padding:11px 26px;border-radius:999px;">
                 📄 Faktura (PDF)
               </a>
             </p>`
          : ''
      }
    `),
  }
}

export async function sendOrderEmails(order, paid) {
  await Promise.all([
    sendEmail(paid ? customerPaidEmail(order) : customerOrderEmail(order)),
    sendEmail(ownerOrderEmail(order, paid)),
  ])
}

const CARRIER_LABELS = {
  zasilkovna: 'Zásilkovna',
  'ceska-posta': 'Česká pošta',
  ppl: 'PPL',
  dpd: 'DPD',
  gls: 'GLS',
  balikovna: 'Balíkovna',
  other: 'Přepravce',
}

/** Shipment confirmation with the tracking number + link, sent when the
 *  admin fulfills an order. Czech by default. */
export function customerShippedEmail(order) {
  const carrier = CARRIER_LABELS[order.carrier] || order.carrier || 'Přepravce'
  const trackBtn = order.tracking_url
    ? `<p style="text-align:center;margin:24px 0 8px;">
         <a href="${order.tracking_url}" style="display:inline-block;background:#ef5f8d;color:#fff;text-decoration:none;font-weight:700;padding:13px 30px;border-radius:999px;">
           Sledovat zásilku
         </a>
       </p>
       <p style="text-align:center;color:#8b7d8b;font-size:12px;margin:0 0 4px;word-break:break-all;">
         <a href="${order.tracking_url}" style="color:#b8577f;">${order.tracking_url}</a>
       </p>`
    : ''

  return {
    to: order.email,
    replyTo: NOTIFY,
    subject: `Vaše objednávka #${order.order_number} byla odeslána 📦 — Little One Store`,
    html: shell(`
      <h1 style="font-size:22px;color:#3a2e3a;margin:0 0 6px;">Vaše objednávka je na cestě! 📦</h1>
      <p style="color:#6b5d6b;line-height:1.6;">
        Dobrý den, ${order.customer_name},<br/>
        vaši objednávku <strong>#${order.order_number}</strong> jsme právě předali dopravci
        <strong>${carrier}</strong>. Zásilku můžete sledovat pomocí odkazu níže.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#faf3f7;border-radius:12px;">
        <tr>
          <td style="padding:14px 18px;color:#6b5d6b;">
            <strong style="color:#3a2e3a;">Přepravce:</strong> ${carrier}<br/>
            <strong style="color:#3a2e3a;">Sledovací číslo:</strong> ${order.tracking_number || '—'}
          </td>
        </tr>
      </table>
      ${trackBtn}
      <h3 style="font-size:15px;color:#3a2e3a;margin:26px 0 4px;">Objednané zboží</h3>
      ${itemsTable(order)}
      <p style="color:#6b5d6b;line-height:1.6;">
        <strong>Doručovací adresa</strong><br/>
        ${order.customer_name}<br/>${order.address}<br/>${order.zip} ${order.city}
      </p>
      <p style="color:#6b5d6b;line-height:1.6;margin-top:18px;">
        Máte dotaz k zásilce? Napište nám na
        <a href="mailto:${NOTIFY}" style="color:#b8577f;">${NOTIFY}</a>
        nebo zavolejte na <a href="tel:+420604364804" style="color:#b8577f;">+420 604 364 804</a>.
        Děkujeme, že nakupujete u Little One Store! 💝
      </p>
    `),
  }
}

/** Send the shipment/tracking e-mail to the customer. Fire-and-forget. */
export async function sendShippedEmail(order) {
  await sendEmail(customerShippedEmail(order))
}

/** Review request sent ~20 days after the order. Czech. */
export function reviewRequestEmail(order) {
  const itemsList = (order.items || [])
    .map(
      (i) =>
        `<li style="margin:4px 0;color:#3a2e3a;font-weight:600;">${i.name_cs ?? i.name}</li>`,
    )
    .join('')
  const url = `${SITE}/recenze/${order.review_token}`
  return {
    to: order.email,
    replyTo: NOTIFY,
    subject: `Jak se vám líbil nákup? ⭐ — Little One Store`,
    html: shell(`
      <h1 style="font-size:22px;color:#3a2e3a;margin:0 0 6px;">Jak jste byli spokojeni? ⭐</h1>
      <p style="color:#6b5d6b;line-height:1.6;">
        Dobrý den, ${order.customer_name},<br/>
        před časem jste u nás nakoupili (objednávka <strong>#${order.order_number}</strong>).
        Budeme moc rádi, když nám napíšete, jak jste byli s oblečením spokojeni —
        pomůžete tím ostatním rodičům při výběru.
      </p>
      <ul style="margin:14px 0;padding-left:20px;">${itemsList}</ul>
      <p style="text-align:center;margin:26px 0 8px;">
        <a href="${url}" style="display:inline-block;background:#ef5f8d;color:#fff;text-decoration:none;font-weight:700;padding:13px 30px;border-radius:999px;">
          ⭐ Napsat recenzi
        </a>
      </p>
      <p style="text-align:center;color:#8b7d8b;font-size:12px;margin:0;">
        Zabere to jen minutku. Děkujeme! 💝
      </p>
    `),
  }
}

export async function sendReviewRequestEmail(order) {
  await sendEmail(reviewRequestEmail(order))
}

/** Welcome e-mail with the personal 10% newsletter code. Czech. */
export async function sendWelcomeEmail(email, code) {
  await sendEmail({
    to: email,
    replyTo: NOTIFY,
    subject: 'Vítejte v rodině Little One Store! 💝 Váš kód na 10% slevu',
    html: shell(`
      <h1 style="font-size:22px;color:#3a2e3a;margin:0 0 6px;">Vítejte! 💌</h1>
      <p style="color:#6b5d6b;line-height:1.6;">
        Děkujeme za přihlášení k odběru novinek Little One Store.
        Jako poděkování posíláme slíbenou <strong>10% slevu na první objednávku</strong>.
      </p>
      <p style="text-align:center;margin:24px 0 6px;">
        <span style="display:inline-block;background:#fdeee6;border:2px dashed #ef5f8d;color:#3a2e3a;font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:20px;letter-spacing:1px;padding:14px 28px;border-radius:14px;">
          ${code}
        </span>
      </p>
      <p style="text-align:center;color:#8b7d8b;font-size:12px;margin:0 0 18px;">
        Kód zadejte v pokladně do pole „Slevový kód". Platí na jeden nákup.
      </p>
      <p style="text-align:center;margin:22px 0 8px;">
        <a href="${SITE}" style="display:inline-block;background:#ef5f8d;color:#fff;text-decoration:none;font-weight:700;padding:13px 30px;border-radius:999px;">
          Nakupovat
        </a>
      </p>
      <p style="color:#6b5d6b;line-height:1.6;margin-top:18px;">
        Budeme vám posílat novinky, tipy pro rodiče a přednostní přístup k akcím.
        Odhlásit se můžete kdykoli odpovědí na tento e-mail.
      </p>
    `),
  })
}

/* ------------------------------------------------------------------ */
/* Gift vouchers bought in the shop                                    */
/* ------------------------------------------------------------------ */

/**
 * Delivers the purchased voucher codes. `cards` is [{ code, valueCzk }].
 * Sent only after the payment really went through.
 */
/**
 * The voucher itself, drawn as an e-mail-safe "card": tables and inline
 * styles only, no flexbox and no background-image — Outlook and Gmail both
 * strip those. Returns the full HTML so it can also be previewed offline.
 */
export function giftCardEmailHtml(order, cards) {
  const list = cards || []
  const total = list.reduce((sum, c) => sum + Number(c.valueCzk || 0), 0)
  const many = list.length > 1

  const voucher = (c) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:separate;">
      <tr>
        <td style="background:#ef5f8d;border-radius:20px 20px 0 0;padding:18px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">
                Dárkový poukaz
              </td>
              <td align="right" style="color:#ffffff;font-size:20px;line-height:1;">🎁</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff6f9;border:1px solid #ffd6e4;border-top:0;border-radius:0 0 20px 20px;padding:26px 24px 24px;text-align:center;">
          <div style="color:#9b8a97;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px;">
            Hodnota
          </div>
          <div style="color:#3a2e3a;font-size:40px;line-height:1.1;font-weight:800;margin-bottom:18px;">
            ${Number(c.valueCzk).toLocaleString('cs-CZ')}&nbsp;Kč
          </div>

          <div style="color:#9b8a97;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px;">
            Kód poukazu
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
            <tr>
              <td style="background:#ffffff;border:2px dashed #ef5f8d;border-radius:14px;padding:14px 26px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:23px;font-weight:700;letter-spacing:3px;color:#3a2e3a;white-space:nowrap;">
                ${c.code}
              </td>
            </tr>
          </table>

          <div style="color:#9b8a97;font-size:12px;margin-top:16px;line-height:1.5;">
            Platí na celý sortiment · Nevyčerpaný zůstatek zůstává na poukazu
          </div>
        </td>
      </tr>
    </table>`

  const step = (n, text) => `
    <tr>
      <td width="30" valign="top" style="padding:0 0 10px;">
        <div style="width:22px;height:22px;border-radius:11px;background:#ffe3ec;color:#c9315e;font-size:12px;font-weight:800;text-align:center;line-height:22px;">${n}</div>
      </td>
      <td valign="top" style="padding:1px 0 10px;color:#6b5d6b;font-size:14px;line-height:1.55;">${text}</td>
    </tr>`

  return shell(`
    <h1 style="font-size:23px;color:#3a2e3a;margin:0 0 8px;text-align:center;">
      ${many ? 'Vaše dárkové poukazy jsou tu' : 'Váš dárkový poukaz je tu'} 🎁
    </h1>
    <p style="color:#6b5d6b;line-height:1.65;text-align:center;margin:0 0 24px;">
      Děkujeme za nákup${
        order.customer_name ? `, ${String(order.customer_name).split(' ')[0]}` : ''
      }.<br/>
      ${many ? 'Poukazy z objednávky' : 'Poukaz z objednávky'}
      <strong>#${order.order_number}</strong> ${many ? 'najdete' : 'najdete'} níže.
    </p>

    ${list.map(voucher).join('')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">
      <tr>
        <td style="padding:0 0 12px;color:#3a2e3a;font-size:15px;font-weight:700;">
          Jak poukaz uplatnit
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step(1, 'Vyberte si na <a href="' + SITE + '" style="color:#c9315e;">littleonestore.cz</a> cokoli, co se vám líbí.')}
      ${step(2, 'V pokladně zadejte kód do pole <strong>„Slevový kód / dárkový poukaz"</strong> a klikněte na <strong>Použít</strong>.')}
      ${step(3, 'Hodnota se odečte z objednávky. Zbytek zůstává na poukazu na příště.')}
    </table>

    <p style="text-align:center;margin:26px 0 10px;">
      <a href="${SITE}" style="display:inline-block;background:#ef5f8d;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 34px;border-radius:999px;">
        Vybrat dárek
      </a>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr>
        <td style="background:#faf6f2;border-radius:14px;padding:16px 18px;color:#8b7d8b;font-size:13px;line-height:1.6;">
          ${
            many
              ? `Celková hodnota poukazů: <strong style="color:#3a2e3a;">${total.toLocaleString(
                  'cs-CZ',
                )} Kč</strong> (částka je konečná, včetně DPH).<br/>`
              : ''
          }
          Poukaz můžete darovat dál — stačí předat kód.
          Kdyby cokoli, napište nám na
          <a href="mailto:${NOTIFY}" style="color:#c9315e;">${NOTIFY}</a>.
        </td>
      </tr>
    </table>
  `)
}

/**
 * Delivers the purchased voucher codes. `cards` is [{ code, valueCzk }].
 * Sent only after the payment really went through.
 */
export async function sendGiftCardEmail(order, cards) {
  if (!cards || cards.length === 0) return
  await sendEmail({
    to: order.email,
    replyTo: NOTIFY,
    subject:
      cards.length === 1
        ? `Váš dárkový poukaz na ${Number(cards[0].valueCzk).toLocaleString('cs-CZ')} Kč 🎁`
        : `Vaše dárkové poukazy (${cards.length}×) 🎁`,
    html: giftCardEmailHtml(order, cards),
  })
}
