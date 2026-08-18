# Google Business Profile — Little One Store

Prepared setup guide and the exact public details to use. A Google Business
Profile (GBP) can't be created purely from code — it requires ownership
verification of the business by Google (postcard, phone, e-mail or video). This
document gives you everything to create it correctly in a few minutes.

## Important eligibility note (online-only stores)

Google Business Profile is designed for businesses that have **either** a
physical storefront customers can visit **or** that deliver to customers in
person (a "service-area business"). Little One Store is an online shop shipping
from Brno, so use one of these two options during setup:

- **Recommended — Service-area business:** enter the company's registered
  address for verification, then set it to *hidden* and define a service area
  (e.g. "Czech Republic" or "Brno + celá ČR"). Customers see the service area,
  not the address.
- **Storefront:** only if you genuinely have a location where customers can
  come. Do not choose this for a pure e-shop.

If Google doesn't approve the profile because there's no physical shopfront,
the online presence is still fully covered by the on-site SEO / structured data
(see `docs/seo-report.md`) and by a **Google Merchant Center** account for
product listings, which is the more relevant tool for an online store.

## Public details to enter (copy/paste)

| Field | Value |
|---|---|
| **Business name** | Little One Store |
| **Website** | https://www.littleonestore.cz |
| **Primary category** | Children's clothing store (Obchod s dětským oblečením) |
| **Secondary categories** | Baby store · Clothing store · Online shop |
| **Business type** | Online retail / Service-area business |
| **Contact e-mail** | info@littleonestore.cz |
| **Phone** | +420 604 364 804 |
| **Registered address** | Hviezdoslavova 545/41, 627 00 Brno, Czech Republic |
| **Company** | Azruk s.r.o. |
| **Company ID (IČO)** | 14420333 |
| **VAT ID (DIČ)** | CZ14420333 |
| **Opening hours** | Online 24/7 (or your customer-support hours, e.g. Po–Pá 9:00–17:00) |
| **Service area** | Česká republika (celostátní doručení) |

### Short description (Czech, ≤ 750 characters)

> Little One Store nabízí prémiové dětské oblečení z biobavlny pro miminka a
> děti od 0 do 24 měsíců. Najdete u nás pohodlné soupravy, body, dupačky a
> doplňky v jemných barvách, které jsou šetrné k citlivé dětské pokožce.
> Doručujeme po celé České republice — doprava 90 Kč, nad 2 000 Kč zdarma,
> vrácení do 30 dnů. Kontakt: info@littleonestore.cz, +420 604 364 804.

### Short description (English)

> Little One Store offers premium organic-cotton clothing for babies and
> children aged 0–24 months — comfortable sets, bodysuits and accessories in
> gentle colours, kind to sensitive skin. Delivery across the Czech Republic,
> free over CZK 2,000, 30-day returns.

## Step-by-step setup

1. Go to https://business.google.com and sign in with the Google account that
   should own the profile (use a shared company account, not a personal one).
2. Click **Add your business → Add a single business**.
3. **Business name:** `Little One Store`.
4. **Category:** start typing "Children's clothing store" and pick it.
5. **Location:** choose **"No, I deliver goods and services to my customers"**
   (service-area business) → set the area to *Česká republika*.
6. **Registered address** (for verification only): Hviezdoslavova 545/41, 627 00
   Brno. Tick "hide address from customers" afterwards.
7. **Contact:** phone `+420 604 364 804`, website
   `https://www.littleonestore.cz`.
8. **Verify:** Google will offer postcard, phone, e-mail or video verification.
   Video verification is usually fastest — have the products, packaging and a
   device showing the website ready.
9. After verification, in the dashboard fill in:
   - **Description** (paste the Czech text above)
   - **Opening hours** (support hours or 24/7 online)
   - **Photos:** logo, 3–5 product photos, packaging shots
   - **Products/Services:** add a few flagship products with prices
   - **Attributes:** "Online appointments / Online estimates" as applicable
10. Add the website link and, if you run one, link your **Google Merchant
    Center** and **Google Ads** accounts.

## Strongly recommended next step: Google Merchant Center

For an online store, Merchant Center is more impactful than GBP — it powers the
free product listings and Shopping tab in Google.

1. Create an account at https://merchants.google.com.
2. Verify and claim the website `https://www.littleonestore.cz` (the store
   already exposes product structured data, which helps).
3. Add products via a feed. The store already has clean product URLs
   (`/product/<id>`) and Product schema (name, image, price CZK, availability,
   rating) — this can seed a feed or be crawled.
4. Enable **free listings** so products can appear in the Google Shopping tab at
   no cost.

## Checklist

- [ ] Business name exactly "Little One Store"
- [ ] Website https://www.littleonestore.cz added
- [ ] Category: Children's clothing store
- [ ] Service area = Czech Republic, address hidden
- [ ] Phone +420 604 364 804 and e-mail info@littleonestore.cz
- [ ] Czech description added
- [ ] Logo + product photos uploaded
- [ ] Profile verified
- [ ] Google Merchant Center created and website claimed
