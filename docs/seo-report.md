# SEO check — Little One Store

Audit date: 8 July 2026. Overall the store's SEO foundation is **strong**. One
bug was found and fixed; the rest is verified working, with a few optional
enhancements listed at the end.

## Summary

| Area | Status | Notes |
|---|---|---|
| Title tags | ✅ Good | Home + per-page + per-product titles set dynamically |
| Meta descriptions | ✅ Good | Home static + dynamic per page/product (trimmed to ~160) |
| Product SEO titles/descriptions | ✅ Good | `applyProductSeo()` sets title + description per product |
| Open Graph (title/description/image) | ✅ Good | OG + Twitter card on home, pages and products |
| sitemap.xml | ✅ Good | 5 pages + all 26 products, correct absolute URLs |
| robots.txt | ✅ Good | Allows site, blocks /adminpanel and /checkout, links sitemap |
| Canonical URLs | ✅ Good | Set on home, pages and products |
| Product structured data (schema) | ✅ Good | Product + Offer + AggregateRating JSON-LD |
| Store structured data | ✅ Good | ClothingStore + PostalAddress + Organization on home |
| Clean URLs (products) | ✅ Good | `/product/<id>` |
| Clean URLs (collections) | ⚠️ Query params | `/?category=girls` — works and indexable, see below |
| Indexability | ✅ Good | No `noindex`; SPA rewrite serves all routes |
| `<html lang>` | ✅ **Fixed** | Was `en`, corrected to `cs` (Czech is the default) |

## The bug that was fixed

`index.html` declared `<html lang="en">` while the site's default language is
Czech. Search engines use this attribute to determine page language, so an
English declaration on a Czech store can hurt relevance in Czech results and
confuse hreflang signals. **Changed to `<html lang="cs">`.** The React SEO
helpers already update `document.documentElement.lang` per locale at runtime, so
language switching stays correct.

## What was verified in detail

**Titles & descriptions** — `src/lib/seo.ts` sets the document title, meta
description, OG tags, Twitter card, canonical and JSON-LD for three cases:
`applyHomeSeo`, `applyPageSeo`, `applyProductSeo`. Descriptions are sliced to
~160 chars for SERP, OG to ~200.

**Structured data** — the home page emits `ClothingStore` schema with postal
address (Brno, CZ) and parent `Organization` (Azruk s.r.o., IČO 14420333). Each
product emits `Product` schema with image, brand, `AggregateRating`, and an
`Offer` (CZK price + `InStock`/`OutOfStock` availability). This is what makes
rich results (price, rating, availability) eligible in Google.

**Sitemap** — `public/sitemap.xml` lists the homepage, `velikosti`,
`doprava-a-vraceni`, `kontakt`, `obchodni-podminky` and all 26 product URLs with
`lastmod`, `changefreq` and `priority`. All product folders in `public/products`
have a matching sitemap entry.

**robots.txt** — allows crawling, disallows `/adminpanel` and `/checkout`
(correct — these shouldn't be indexed), and references the sitemap.

**OG image** — the referenced default image
(`/products/bunny-3piece-set/beige-1.jpg`) exists and is a real product photo.

## Optional enhancements (not required, safe to skip)

1. **Collection URLs** — categories currently use query strings
   (`/?category=girls`). Google indexes these fine, but pretty paths like
   `/kolekce/holky` read better and are marginally stronger. This would require
   a routing change, so it was left out of this pass to keep changes minimal.
2. **Product `priceValidUntil` / return & shipping policy in schema** — adding
   `priceValidUntil`, `hasMerchantReturnPolicy` and `shippingDetails` to the
   `Offer` improves Google Merchant eligibility. Optional.
3. **`AggregateRating` guard** — if a product ever has 0 reviews, omit
   `aggregateRating` from its JSON-LD (Google warns on empty ratings). Current
   catalogue products all have reviews, so no action needed now.
4. **Submit sitemap** — after deploy, submit
   `https://www.littleonestore.cz/sitemap.xml` in Google Search Console and
   request indexing of the homepage to speed up discovery.

## Post-deploy checklist

- [ ] Deploy so `index.html` ships with `lang="cs"`
- [ ] Verify the site in Google Search Console
- [ ] Submit sitemap.xml in Search Console
- [ ] Use the URL Inspection tool on the homepage → Request indexing
- [ ] Confirm rich results with Google's Rich Results Test on a product page
