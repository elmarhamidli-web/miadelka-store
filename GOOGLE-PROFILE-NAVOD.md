# Little One Store — Google setup guide
*(Google Business Profile + Search Console + Merchant Center)*

All store details below are ready to copy-paste. Everything matches what is published on the website and in the terms & conditions, which is important — Google checks consistency.

## Store details (copy-paste)

| Field | Value |
|---|---|
| Store name | **Little One Store** |
| Website | https://www.littleonestore.cz |
| E-mail | info@littleonestore.cz |
| Phone | +420 604 364 804 |
| Legal entity | Azruk s.r.o. |
| IČO / DIČ | 14420333 / CZ14420333 |
| Address (sídlo) | Hviezdoslavova 545/41, 627 00 Brno |
| Business category (primary) | **Dětský obchod s oblečením** (Children's clothing store) |
| Category (secondary) | Internetový obchod (E-commerce service) |
| Instagram | https://www.instagram.com/_little_one_store_/ |
| Opening | Online 24/7 (e-shop) |
| Description (short) | Prémiové dětské a kojenecké oblečení z biobavlny pro děti 0–24 měsíců. Doprava po ČR 90 Kč, zdarma nad 2 000 Kč. Vrácení do 30 dnů. |

## 1. Google Business Profile

Important: Google Business Profile is designed for businesses that customers **visit in person** or that serve customers **at their location**. A pure e-shop without a customer-facing storefront is technically not eligible for a map pin.

You have two correct options:

**Option A — profile without a public address (recommended for an e-shop):**
1. Go to https://business.google.com and sign in with the store's Google account (use one the client controls long-term, e.g. the account behind info@littleonestore.cz).
2. "Add business" → name: **Little One Store**.
3. Category: **Dětský obchod s oblečením**.
4. When asked "Do you want to add a location customers can visit?" → **No**.
5. Set the service area: **Česko** (or Brno + celá ČR).
6. Contact: website https://www.littleonestore.cz, phone +420 604 364 804.
7. Verification: Google will offer verification by phone, e-mail or video. Follow the prompt.
8. After verification, fill in: description (above), opening ("online 24/7" via special hours note), photos (logo, product photos from the site), Instagram link.

**Option B — profile with the Brno address:** only if the client actually accepts customers or pick-ups at Hviezdoslavova 545/41. Then enter the address in step 4 and verify by postcard/video. Do **not** enter the address just to get a map pin — Google suspends profiles for this.

## 2. Google Search Console (do this in any case — takes 10 minutes)

This is what actually gets the e-shop into Google search results.

1. Go to https://search.google.com/search-console.
2. Add property → **Domain** → `littleonestore.cz`.
3. Google shows a DNS TXT record → add it in **GoDaddy → DNS → Add record → TXT** (same place where the Resend records were added). Wait a few minutes → Verify.
4. In Search Console → **Sitemaps** → submit `https://www.littleonestore.cz/sitemap.xml`.
5. Optionally use **URL Inspection** on the homepage and a product URL → "Request indexing" to speed up the first crawl.

## 3. Google Merchant Center (optional, later)

To show products directly in Google Shopping tab (free listings):
1. https://merchants.google.com → create account for Little One Store, country Česko, currency CZK.
2. Link the Search Console property (proves domain ownership).
3. Add products manually (26 products) or ask us to generate a product feed from the database — we can add a `/api/product-feed` endpoint when you're ready.

## SEO status of the website (verified today)

- ✅ Title + meta description (Czech) on every page, product pages included
- ✅ Open Graph title/description/image + Twitter card
- ✅ Canonical URLs on all pages
- ✅ `sitemap.xml` — homepage, 4 info pages, all 26 products; referenced from robots.txt
- ✅ `robots.txt` — allows indexing, blocks only /adminpanel and /checkout
- ✅ Structured data: ClothingStore schema (homepage), Product schema with price/availability/rating (product pages)
- ✅ Clean product URLs (`/product/nazev-produktu`)
- ✅ Indexable: no noindex, valid SSL, mobile-friendly

After Search Console verification, expect the site to start appearing in Google within a few days to ~2 weeks.
