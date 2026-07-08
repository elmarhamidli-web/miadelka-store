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
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
      ${rows}
      <tr>
        <td style="padding:10px 0;color:#8b7d8b;">Doprava</td>
        <td align="right" style="padding:10px 0;color:#8b7d8b;">${order.shipping_czk > 0 ? czk(order.shipping_czk) : 'Zdarma'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:17px;"><strong>Celkem</strong></td>
        <td align="right" style="padding:10px 0;font-size:17px;"><strong>${czk(order.total_czk)}</strong></td>
      </tr>
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
    `),
  }
}

export async function sendOrderEmails(order, paid) {
  await Promise.all([
    sendEmail(paid ? customerPaidEmail(order) : customerOrderEmail(order)),
    sendEmail(ownerOrderEmail(order, paid)),
  ])
}
