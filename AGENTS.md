# TinyMode Kids

A modern, frontend-only e-commerce prototype for a children's clothing brand
("TinyMode Kids"). Built with **Vite + React + TypeScript**. All data is mocked —
there is no backend, no payments, and no persistence.

## Project layout

- `src/data/` — mock products, categories and reviews (the single source of "API" data).
  These hold language-neutral fields (id, price, gradient, sizes…) plus English fallback text.
- `src/i18n/` — internationalisation. `cs.ts` (Czech, the default) and `en.ts` (English) are the
  translation dictionaries; `types.ts` is their shared shape; `registry.ts` holds the locale list /
  storage helpers; `index.tsx` is the `I18nProvider` + `useI18n()` hook (price/plural formatting and
  translated product/category/colour/review lookups). **Czech is the default locale.**
- `src/context/StoreContext.tsx` — global cart + wishlist + toast state (React context).
- `src/components/` — UI components. `HomePage` composes the landing sections; `ProductPage` is the
  full-page product view; `LanguageSwitcher` toggles locale; plus Header, Hero, Categories,
  ProductSection, Shop, ProductCard, CartDrawer, Benefits, Reviews, Newsletter, Footer, Toasts.
- `src/lib/` — animation variants (`motion.ts`) and the confetti helper (`confetti.ts`).
- `src/App.tsx` — React Router routes (`/` → HomePage, `/product/:id` → ProductPage) + global chrome.

## Common commands

Standard scripts live in `package.json`:

- `npm run dev` — start the Vite dev server (hot reload).
- `npm run build` — type-check (`tsc -b`) then production build.
- `npm run lint` — ESLint over the repo.
- `npm run preview` — serve the production `dist/` build.

## Cursor Cloud specific instructions

- **Stack/runtime:** Node 18+ (developed on Node 22). Dependencies install with `npm install`.
- **Dev server:** `npm run dev` serves on port **5173** and is configured with `host: true`
  (see `vite.config.ts`), so it is reachable from outside the VM without extra flags.
- **Connecting a real backend later:** swap the mock arrays in `src/data/*` for API calls;
  cart/wishlist logic is already isolated in `src/context/StoreContext.tsx`, so the UI does
  not need to change to wire up Shopify/WooCommerce/a custom API.
- **No env vars / secrets** are required to run, build, lint, or test this prototype.
- **Mock-only behaviour to expect:** "Checkout" and "Subscribe" only fire a toast — nothing is
  charged or sent. This is intentional for the prototype.
- **Routing:** client-side via `react-router-dom`. Clicking a product navigates to `/product/:id`
  (a full page, not a modal). Category/search nav uses query params (`/?category=girls`, `/?q=…`)
  which `HomePage` reads and applies to the shop grid. `vercel.json` rewrites all paths to
  `index.html` so SPA deep links work on Vercel — keep it if deploying there.
- **Adding a language:** create `src/i18n/<locale>.ts` matching the `Dictionary` type, then register
  it in `src/i18n/registry.ts` (`dictionaries` + `locales`). Each locale sets its own currency
  `symbol`/`rate` (prices are stored as base numbers and formatted via `formatPrice`), so a locale's
  prices follow its currency. Adding a key to `Dictionary` requires updating every locale file.
