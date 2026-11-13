# Map-First Demo Mode Build Report (Issue #56)

- **Branch:** `codex/issue-56-align-playwright-specs` (branched from `codex/issue-55-accessibility-pass` at `29f18d7`)
- **Related Issues:** Epic `#46`; prerequisites `#51`, `#52`, `#53`, `#54`, `#55` (confirmed closed and implemented prior to editing)
- **Implementation Status:** Complete (Playwright UI spec alignment and build report written)
- **Verification Status:** **Automated checks NOT RUN; Manual acceptance PASSED (2026-11-13)** — Per Issue `#56` instructions, zero specs, tests, builds, typechecks, linters, scripts, or browser checks were executed by the coding agent, and every automated check below remains **NOT RUN**. On `2026-11-13`, the project owner reported completing the manual checks, confirmed all pass, and authorized commit, merge to `main`, push, and closing `#56` and `#46`.

---

## 1. Completed Implementation vs. Unverified Behavior

- **Completed implementation:**
  - Verified prerequisites `#51`–`#55` on branch `codex/issue-55-accessibility-pass` (`29f18d7`) with no blocking gaps.
  - Updated all 9 Playwright UI specs that referenced the pre-redesign page layout, counts, or inline workspace controls so selectors and assertions match the implemented map-first Demo Mode UI (`src/DemoExperience.tsx`, `src/DiscoveryMap.tsx`, `src/DiscoveryPanels.tsx`, `src/DemoControls.tsx`, `src/ListingPanel.tsx`, `src/demo-data.ts`, `src/discovery.ts`).
  - Left `tests/discovery-state.spec.ts` and `tests/checkout-state.spec.ts` (as well as `tests/auth-dashboard.spec.ts`, `tests/handover-state.spec.ts`, `tests/safety-state.spec.ts`, `tests/trust-state.spec.ts`, all `src/` files, and `docs/submission/`) untouched.
- **Unverified behavior:**
  - All 9 edited Playwright UI spec files, TypeScript compilation, Vite production build, and live phone/desktop browser rendering remain unexecuted and unverified. Selector typos, MapLibre network tile timing under Playwright, or focus/layout edge cases may surface during manual or Playwright execution.

---

## 2. Changed Files

| File | Purpose (One Line) |
| --- | --- |
| `tests/jualokal.spec.ts` | Align Demo Mode entry assertions, `Demo controls` fictional notice check, list drill-down after reload, and `Seller discovery map` viewport overflow check (replacing the absent `<main>` check on `/?demo=1`). |
| `tests/map-discovery.spec.ts` | Update markers (`5 Listings`), MapLibre zoom/keyboard pan and legend checks, non-modal `complementary` panel/sheet focus & geometry checks, result pill entry, `Books` filter (`3` listings), separable group announcement, location error/stale/empty states, and `Map Fallback` flow. |
| `tests/demo-mode.spec.ts` | Route session totals, workspaces, account switching, snapshot/location controls, and privacy checks through `Demo controls`, move trust assertions to `Trust overview`, and update nearby List counts (`25`), initial top item, and `Books` ordering (`3` items). |
| `tests/checkout.spec.ts` | Open List via the result pill, update Checkout panel `Back` / `View order` / `Back to map` transitions and header `Orders` checks, update `5 Listings` on Dimas's marker, and update post-purchase `Accessories` marker/group assertions. |
| `tests/listing.spec.ts` | Navigate via `Demo controls` for `Seller workspace`, `Demo inventory`, and `Simulated Browsing Location`, verify deactivation/cross-listed exclusion via inventory & 24-item List, and update 10 km legend/privacy assertions. |
| `tests/handover.spec.ts` | Update `openDemo`, `switchAccount` (plus header `Orders`), `Reset Demo`, and multi-order seller selection (`Open transaction for ...`) for the Orders screen while keeping every handover, mismatch, strike, and expiry assertion. |
| `tests/safety.spec.ts` | Update `openDemo`, `switchAccount`, `purchaseBasket`, `Reset Demo`, and restricted-account appeal verification around the `Demo controls` drawer and `Orders` screen. |
| `tests/transaction-experience.spec.ts` | Update `openDemo`, `switchAccount`, and `purchaseNearbyListing` (`View order` / `Back to map`) for multi-order keyboard selection and disabled-action checks. |
| `tests/trust.spec.ts` | Update `openTrustDemo` to open the `Trust overview` workspace through `Demo controls`. |
| `docs/specs/demo-map-first-build-report.md` | Document Issue `#56` changed specs, required configuration, known limits, `NOT RUN` verification status, rollback instructions, and manual owner checklist. |

**Explicitly unchanged per acceptance criteria:**
- `tests/discovery-state.spec.ts` (imports unchanged `src/discovery` contracts; no type forced a change)
- `tests/checkout-state.spec.ts` (imports unchanged `src/checkout` contracts; no type forced a change)

**Pre-existing uncommitted working-tree items preserved untouched:**
- Modified before Issue `#56`: `AGENTS.md`, `CONTEXT.md`, `docs/submission/CODEX_BUILD_LOG.md`, `docs/submission/VIDEO_SCRIPT.md`
- Untracked before Issue `#56`: `.vscode/`, `docs/adr/0020-draw-bounded-discovery-areas.md`, `docs/specs/demo-map-first-prd.md`, `docs/specs/demo-map-first.md`, and 7 PNG files in `docs/submission/`

---

## 3. Configuration and Environment Requirements

- **Map style environment variable (`VITE_MAP_STYLE_URL`):**
  - Optional Vite client environment variable read by `resolveStyleUrl()` in `src/DiscoveryMap.tsx`.
  - **Default:** `https://tiles.openfreemap.org/styles/liberty` (`DEFAULT_MAP_STYLE_URL`).
  - No `.env*` file is present in the repository root; when unset, the default OpenFreeMap style URL is used.
- **Browser & network dependencies:**
  - MapLibre GL (`maplibre-gl` `6.18.0`) requires WebGL support and network access to OpenFreeMap (or a custom `VITE_MAP_STYLE_URL` style/tile server) to enter the `"ready"` state within timeouts (`STYLE_TIMEOUT_MS = 8_000`, `MAP_LOAD_TIMEOUT_MS = 15_000`).
  - Tile host outage, blocked network requests, or missing WebGL triggers the map error card (`"The street map did not load."`) with `"Retry map"` and `"Use List view"` fallback rather than faking a map.
- **Test & dev server configuration (`playwright.config.ts`, `package.json`):**
  - Playwright (`@playwright/test` `1.61.1`) starts `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` with `baseURL: "http://localhost:5173"` (`reuseExistingServer: false`).
  - Configured projects: `"phone"` (`Pixel 5`) and `"desktop"` (`Desktop Chrome`), both launched with `--force-prefers-reduced-motion=reduce`.

---

## 4. Known Limits and Observed Behavioral Notes

1. **All tests, builds, and typechecks are unexecuted (`NOT RUN`):** Selector accuracy and live MapLibre timing in the 9 updated Playwright specs have not been verified in a browser.
2. **Deferred Seller Convenience Zone & geometry:** Per `docs/specs/demo-map-first.md` §13, seller convenience zones and server-provided zone polygons remain deferred; `DiscoveryMap.tsx` renders only the 10 km Maximum Browsing Boundary circle, buyer dot, and seller/group markers without exposing private Home Anchors.
3. **Forced evaluation scenario geometry:** Choosing forced edge/empty/error `Simulated Browsing Location` scenarios (`inside-edge`, `at-edge`, `outside-edge`, `at-maximum`, `outside-maximum`) preserves simulation distance bands and eligibility rules without regenerating street marker coordinates.
4. **Source UI limitations observed during static inspection (left untouched per `#56` scope):**
   - **Deactivated / cross-listed-unavailable notice in `Demo Listing`:** `DemoExperience.tsx` defines `listingPanelNotice` (`"The seller deactivated this listing before checkout."` / `"This cross-listed item is unavailable before checkout."`) for non-active items, **but** switching to `Seller workspace` or returning via `"Back to map"` clears `panelStages` to `[]` and `discoverListings` filters out non-active items, so no discovery path opens `Item detail` for a deactivated/unavailable listing. `tests/listing.spec.ts` instead verifies the `Seller workspace` status notices, `Demo inventory` badges (`"Deactivated · simulated"`, `"Cross-listed unavailable · simulated"`), and exclusion from the nearby List (`24` listings).
   - **Structured question update banner across panel re-entry:** Publishing a shared listing update in `Seller workspace` sets `questionUpdateNotice`, clears `pendingQuestion`, and updates the shared listing (`DemoExperience.tsx:2080`), **but** clicking `"View item"` in the List panel calls `openListingDetail` -> `loadListingForEditing`, which clears `questionUpdateNotice` (`DemoExperience.tsx:1825`). `tests/listing.spec.ts` asserts the updated specification text and cleared `"Request sent:"` notice rather than expecting the transient inline banner after panel re-entry.

---

## 5. Verification Matrix (Every Check NOT RUN)

| Check / Command | Scope | Status |
| --- | --- | --- |
| `npm run typecheck` | TypeScript compilation (`tsc --noEmit`) | **NOT RUN** (Owner verifies) |
| `npm run build` | Production build + typecheck (`vite build && tsc --noEmit`) | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/jualokal.spec.ts` | Public entry, Demo reload, viewport overflow | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/map-discovery.spec.ts` | Map, markers, panels, groups, states, Map Fallback | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/demo-mode.spec.ts` | Totals, controls drawer, accounts, reset, isolation, ordering | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/checkout.spec.ts` | Holds, expiry, competing buyers, tier caps, Escrow freeze | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/listing.spec.ts` | Validation, deactivation, structured questions, 2 km / 10 km boundaries | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/handover.spec.ts` | Handover windows, presence, mismatch, strikes, resets | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/safety.spec.ts` | Safety Hold, account isolation, appeals, restriction | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/transaction-experience.spec.ts` | Multi-order keyboard switching and disabled confirmation rules | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/trust.spec.ts` | Buyer Tier thresholds, custom Seller listbox, strikes, expiry | **NOT RUN** (Owner verifies) |
| `npx playwright test tests/discovery-state.spec.ts tests/checkout-state.spec.ts` | Unchanged state unit/contract suites | **NOT RUN** (Owner verifies) |

---

## 6. Manual Verification Checklist

All items below are **NOT RUN — Owner verifies**:

1. **Automated suite verification:**
   - Run `npm run typecheck` and `npx playwright test` (or per-spec runs across both `"phone"` and `"desktop"` projects) with outbound access to `https://tiles.openfreemap.org` (or a configured `VITE_MAP_STYLE_URL`). **Status: NOT RUN. Owner verifies.**
2. **Map-first entry & viewport fit (`/?demo=1`):**
   - Start `npm run dev`, open `http://localhost:5173`, and click `"Explore Demo Mode"`. Confirm full-screen map entry, no login gate, no page scrollbar, visible buyer location dot, `Maximum boundary 10 km` circle/legend, result pill (`3 seller areas, 25 listings`), and compact header (`Demo - simulation`, `Category Filter`, `Orders`, `Demo controls`). **Status: NOT RUN. Owner verifies.**
3. **Map panels, focus return, and responsive layout (`phone` & `desktop`):**
   - Check phone (`390 px`), split-screen (`900 px`), and desktop (`1024 px`, `1280 px`, `1440 px`) viewports. Open a Seller marker -> `"View item"` -> `"Back"` -> `"Close panel"`, confirming scroll preservation inside panels, focus returning to the triggering marker, non-modal behavior, and bottom-sheet drag handle on phones without fighting map pan/zoom. **Status: NOT RUN. Owner verifies.**
4. **Controls drawer, filters, privacy, and error/fallback states:**
   - Open `"Demo controls"`: verify `3 Demo Buyers`, `5 Demo Sellers`, `25 active Demo Listings`, privacy copy, `Trust overview`, `Demo inventory`, `Seller workspace`, stale resume (`"Browsing Location needs refresh"`), `outside-edge` empty state, `denied`/`unavailable` states, `"Simulate map failure"` -> `"Refresh nearby listings"` -> `"Use List view"` (`Map Fallback`) -> `"Retry map"`, and `"Reset Demo"` restoring Snapshot `1`, `All`, `current`, and `25` listings. Confirm no exact distances, raw coordinates, or Home Anchors ever appear. **Status: NOT RUN. Owner verifies.**
5. **Transaction journey continuity:**
   - Open an item from the List panel, start a 5-minute Checkout Hold, `"Simulate successful payment"`, click `"View order"`, switch between buyer and Seller via `Demo controls` -> `"Orders"`, schedule/confirm a handover, and confirm existing transaction/safety/trust flows behave intact. **Status: NOT RUN. Owner verifies.**

---

## 7. Rollback Steps

> **Note:** The sibling backup directory referenced in `docs/specs/demo-map-first.md` §15 (`../jualokal-baseline-2026-11-12`) does not exist in the parent folder; this repository uses local Git ticket commits (`4ae9d79`, `d55f839`, `6debec6`, `9a54cc2`, `f87d367`, `29f18d7`) per `AGENTS.md`. Because uncommitted owner work exists in `AGENTS.md`, `CONTEXT.md`, `docs/submission/`, `docs/specs/`, `docs/adr/`, and `.vscode/`, do **not** run `git reset --hard`, `git clean`, or a repo-wide `git checkout`.

To undo Issue `#56` safely without disturbing pre-existing uncommitted work:

1. Restore only the 9 edited spec files to the `codex/issue-55-accessibility-pass` baseline:
   ```powershell
   git checkout HEAD -- tests/checkout.spec.ts tests/demo-mode.spec.ts tests/handover.spec.ts tests/jualokal.spec.ts tests/listing.spec.ts tests/map-discovery.spec.ts tests/safety.spec.ts tests/transaction-experience.spec.ts tests/trust.spec.ts
   ```
2. Remove the Issue `#56` build report file:
   ```powershell
   Remove-Item docs/specs/demo-map-first-build-report.md
   ```
3. Verify `git status --short` shows all pre-existing uncommitted files intact and zero leftover `tests/` changes, then switch back to the Issue `#55` branch if desired:
   ```powershell
   git switch codex/issue-55-accessibility-pass
   ```
