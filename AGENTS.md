# TinyMode Kids

A modern, frontend-only e-commerce prototype for a children's clothing brand
("TinyMode Kids"). Built with **Vite + React + TypeScript**. All data is mocked —
there is no backend, no payments, and no persistence.

## Project layout

- `src/data/` — mock products, categories and reviews (the single source of "API" data).
- `src/context/StoreContext.tsx` — global cart + wishlist + toast state (React context).
- `src/components/` — UI components (Header, Hero, Categories, ProductSection, Shop,
  ProductCard, ProductDetail modal, CartDrawer, Benefits, Reviews, Newsletter, Footer, Toasts).
- `src/lib/` — animation variants (`motion.ts`) and the confetti helper (`confetti.ts`).
- `src/App.tsx` — page composition + section navigation/scroll wiring.

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
