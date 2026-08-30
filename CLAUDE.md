# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Правила работы (следовать всегда)

1. **Ветки.** Перед каждой новой задачей или фичей создавай отдельную ветку `feature/название`. Работай в ней. В `main` напрямую не коммить — пользователь мёржит через Pull Request.

2. **Язык и стиль.** Отвечай простым, ясным русским. Короткие предложения. Пользователь — новичок.

3. **Не додумывай.** Делай ровно то, что попросили. Не добавляй ничего сверх задачи.

4. **Цель проекта.** Это клон krisha.kz (только квартиры, только Алматы). Когда пользователь просит сравнить с krisha — сверяй дотошно, находи все отличия сам.

5. **Новые поля в базе.** Если для фичи нужен новый столбец — сначала проверь, есть ли он в Supabase. Если нет — дай пользователю SQL-запрос для создания столбца, и только после его подтверждения меняй интерфейс.

6. **Крупные изменения.** Перед большими правками покажи план и жди подтверждения пользователя.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test suite exists.

## Architecture

Vanilla JS SPA built with Vite, no framework.

- `index.html` — all markup and DOM structure
- `css/styles.css` — all styles
- `js/` — application logic, split into ES modules (see below). Entry point is `js/main.js`, loaded from `index.html` as `<script type="module">`.

### Backend

Supabase is the only backend. The publishable URL and anon key are hardcoded at the top of `js/config.js` — these are safe to commit (Row Level Security enforces access control on Supabase's side).

**Tables:**
- `listings` — core table; columns include `id`, `user_id`, `deal_type` (sale/rent), `city`, `district`, `complex`, `rooms`, `price`, `area`, `floor`, `floors_total`, `lat`, `lng`, `images` (JSON array), `furnished`, `kids_allowed`, `pets_allowed`, `rent_period`, `is_new`, `has_photo`, `color`, `created_at`, plus many optional attribute columns added later (ceiling_height, door_type, parking, balcony, kitchen_studio, security, house_number, cross_street, hide_house_number, phone_line, internet, balcony_glazed, floor_type, features, contact_name, phones, seller_type, pledged, ex_dormitory, exchange, kitchen_area, bathroom, house_type, year_built, condition)
- `favorites` — `listing_id` + `user_id` (+ `created_at`, used to sort "Избранное" by most-recently-added-first)
- `notes` — `listing_id` + `user_id` + `text` + `updated_at`

**Storage:** `listing-photos` bucket for multi-photo uploads.

### js/ module map (by concern)

| File | Concern |
|------|---------|
| `main.js` | Entry point — imports every module (each wires its own DOM listeners on import), defines URL routing (`routeFromUrl`) and app start |
| `config.js` | Supabase URL/key, `CITIES`, `COLORS`, `COMPLEXES`, `PAGE_SIZE` — pure constants |
| `state.js` | One shared mutable `state` object (currentUser, favMode, activeDeal, currentView, currentPage, sortBy, db client instance, etc.) — every module imports `{ state }` and reads/writes its fields directly |
| `format.js` | Price formatting, `escapeHtml`, card info line, seller badge, `showBanner` |
| `db.js` | `initDb()` — creates/reuses the Supabase client on `state.db` |
| `auth.js` | Sign in / sign up / sign out, "Личный кабинет" dropdown, auth modal |
| `favorites.js` | Like/unlike, favorites count, "Очистить избранное" |
| `notes.js` | Note modal (create/edit/delete), per-card note preview |
| `confirm-dialog.js` | Generic reusable confirm modal (used by note delete, listing delete, etc.) |
| `listings-query.js` | `rowToItem` (DB row → camelCase item), `buildQuery`/`getFilters`/`applySort` (server-side filtering), URL `serializeFilters`/`deserializeFilters` |
| `map-instance.js` | The main Leaflet list/map instance + marker rendering |
| `search-list.js` | Card list rendering, pagination, `update()` (fetch + render one page) |
| `search-view.js` | Home ↔ search view switching, Продажа/Аренда layout, city/district/ЖК select population, most filter-panel button bindings |
| `list-modes.js` | "Избранное" and "Мои объявления" (Кабинет) list modes — hides the filter panel/sort bar, shows the right empty state |
| `hot-offers.js` | "Горячие предложения" home page carousels |
| `listing-detail.js` | Single listing page, photo lightbox, "Похожие объявления" |
| `complex-page.js` | ЖК (residential complex) page — currently a placeholder, no complex data yet |
| `submit-form.js` | "Подать объявление" — category picker, full form, client-side validation, submit/delete |
| `city-modal.js` | Город/район picker modal |

Several modules import each other in both directions (e.g. `auth.js` ↔ `favorites.js` ↔ `list-modes.js` ↔ `search-view.js`). This is intentional and safe: every cross-import is only used *inside* a function body (event handler, async function), never at a module's top level, so there's no evaluation-order problem — by the time any of those functions actually runs, all modules are already fully loaded.

### Map

Leaflet 1.9.4 + LeafletMarkerCluster via CDN (not npm, loaded as global `L` in `index.html`). Two Leaflet map instances exist: the main list/map view (`map-instance.js`) and the mini-map on the detail panel (`state.detailMap`, created in `listing-detail.js`). Coordinates for each listing are generated at creation time from district center coordinates + a small random offset (the submission form instead uses a draggable marker, see `initFormMap` in `submit-form.js`).

### Adding filters

All filtering is server-side in `buildQuery()` (`js/listings-query.js`). Add new filter fields to the Supabase `.eq()` / `.gte()` / `.lte()` chain there (`getFilters()` reads the raw DOM values), and wire up the corresponding DOM element's change/input listener in `search-view.js`.
