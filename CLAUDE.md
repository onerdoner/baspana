# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test suite exists.

## Architecture

Vanilla JS SPA built with Vite. Three files contain everything:

- `index.html` — all markup and DOM structure (218 lines)
- `css/styles.css` — all styles (no framework)
- `js/app.js` — all application logic (~700 lines)

### Backend

Supabase is the only backend. The publishable URL and anon key are hardcoded at the top of `app.js` — these are safe to commit (Row Level Security enforces access control on Supabase's side).

**Tables:**
- `listings` — core table; columns include `id`, `user_id`, `deal_type` (sale/rent), `city`, `district`, `complex`, `rooms`, `price`, `area`, `floor`, `floors_total`, `lat`, `lng`, `images` (JSON array), `furnished`, `kids_allowed`, `pets_allowed`, `rent_period`, `is_new`, `has_photo`, `color`, `created_at`
- `favorites` — `listing_id` + `user_id` join table

**Storage:** `listing-photos` bucket for multi-photo uploads.

### app.js structure (by concern)

| Lines | Concern |
|-------|---------|
| 1–48 | Supabase init, constants (`CITIES`, `COMPLEXES`, `PAGE_SIZE=24`, `COLORS`) |
| 49–134 | Auth (sign in / sign up / sign out, current user state) |
| 135–202 | Favorites toggle + favorites rendering |
| 203–330 | `fetchListings()` — query builder with all active filters applied server-side; pagination |
| 330–474 | Card rendering, map marker rendering, price formatting |
| 474–555 | Detail view (photo gallery, mini-map, phone reveal) |
| 555–703 | Filter controls, sort, view switching (list ↔ map), event bindings |

### Key global state

- `currentUser` — Supabase auth user or null
- `favoriteIds` — `Set` of liked listing IDs
- `activeDeal` — `"sale"` or `"rent"`
- `activeRooms` — array of selected room counts
- `currentPage` — current pagination page
- `sortBy` — `"new"` | `"cheap"` | `"exp"`
- `favMode` — boolean, favorites-only view

### Map

Leaflet 1.9.4 + LeafletMarkerCluster via CDN (not npm). Two Leaflet map instances exist: the main list/map view and the mini-map on the detail panel. Coordinates for each listing are generated at creation time from district center coordinates + a small random offset.

### Adding filters

All filtering is server-side in `fetchListings()`. Add new filter fields to the Supabase `.eq()` / `.gte()` / `.lte()` chain there, and wire up the corresponding DOM element in the filter event handlers at the bottom of `app.js`.
