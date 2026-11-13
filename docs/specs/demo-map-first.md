# Demo Mode map-first redesign

Status: ready for implementation. Scope agreed 2026-11-12. Implementation has not started.

Owner: project owner. Executor: implementation agent.

This document is the handoff. Read it with `AGENTS.md`, `CONTEXT.md`, `docs/adr/0019-use-stable-seller-discovery-markers.md`, and `docs/adr/0020-draw-bounded-discovery-areas.md`.

## 1. Hard rules

1. Do not run tests, builds, browser checks, the dev server, or verification scripts. The project owner verifies manually.
2. Do not commit, push, reset, checkout, stash, or clean. Preserve the uncommitted work listed below.
3. Do not touch the landing page, authentication, Supabase, routes, `src/routeTree.gen.ts`, or `docs/submission/`.
4. Do not request device geolocation. Do not add an exact distance string. Do not draw the 2 km circle. Do not draw a seller zone.
5. Do not add a paid service, API key, account, or billing. The map uses a free, keyless tile host.
6. Do not rewrite transaction logic in `checkout.ts`, `handover.ts`, `trust.ts`, or `safety.ts`.
7. Keep port 5173 unchanged.

## 2. Repository state

- Root: `C:\Users\Satrio Faiz\Downloads\github-repos\jualokal`
- Remote: `beb3k/jualokal`
- Branch: `codex/submission-materials`
- HEAD: `cf8de22`
- Uncommitted: modified `docs/submission/CODEX_BUILD_LOG.md`, `docs/submission/VIDEO_SCRIPT.md`, `src/routeTree.gen.ts`; untracked `.vscode/` and seven PNG files in `docs/submission/`.
- New handoff docs: `docs/adr/0020-draw-bounded-discovery-areas.md`, `docs/specs/demo-map-first.md`, and the `Maximum Browsing Boundary` term in `CONTEXT.md`. Keep them. They are part of this task.
- Stack: React 19, TypeScript, Vite, TanStack Start/Router, Tailwind 4, Supabase.
- Demo entry: `src/App.tsx` opens `src/DemoExperience.tsx` when the URL has `?demo=1`.
- Current map: a CSS-positioned diagram in `DemoExperience.tsx` (`.discovery-map`), not a map library. It has four pan and zoom buttons and kilometre-based marker projection.
- Current item view: a section below the map (`.demo-layout`), focused through `listingDetailRef`.
- Current tests: 16 Playwright specs. Several assert the old layout.

## 3. Objective

When the member enters Demo Mode, show a full-viewport street map. The map is the main surface. Seller browsing, item inspection, and checkout entry happen in panels over that map. The underlying page does not scroll.

## 4. Non-goals

- Seller Convenience Zone map or seller handover map. Deferred. See ADR 0020.
- Fixed real-world geometry, routing, geocoding, search, or directions.
- Checkout, handover, trust, safety, and orders logic changes.
- Browser Back integration for panels.
- Real authentication or backend work.
- Landing page redesign.

## 5. Settled decisions

| Area | Decision |
| --- | --- |
| Map engine | MapLibre GL JS |
| Tiles | OpenFreeMap public vector tiles. No key, no account, no cost. Internet required. No SLA. |
| Fallback | A real error state plus the List panel. Never a blank fake map. |
| Distance | One fictional seller-level distance. All five listings of a seller share one Distance Band. |
| Markers | Fixed fictional discovery anchors. Not Home Anchors. Stable across snapshots. |
| Groups | Sari and Bima share a coarse point and separate at high zoom. Rani and Wawan share one exact point and always use a chooser. |
| Buyer boundary | 10 km circle centered on the snapshot. Thin outline, low-opacity fill, non-interactive, label states the active 2 km search. |
| Active radius | 2 km. Not drawn. Text only. |
| Seller zone | Deferred. Not drawn. |
| Panels | One non-modal panel with stages. Back pops one stage. Close clears all stages. |
| Desktop | Right floating panel, 400 px wide, 440 px at 1440 px and wider. |
| Mobile | Bottom sheet with three snap points. Map stays interactive above it. |
| Demo controls | One drawer. All existing simulation controls move there. |
| Verification | Manual by the owner. |

## 6. Interaction model

### 6.1 Entry

1. Demo Mode opens on the map at the first simulated snapshot.
2. Show the buyer dot, visible seller markers, the header, the category filter, the boundary legend, and the map controls.
3. Show no panel. Do not autofocus the map.
4. The summary of results is a small floating pill: "3 seller areas · 25 listings". It opens the List panel.
5. The page behind the map must not scroll. Use `height: 100dvh`, `overflow: hidden`, and safe-area insets.

### 6.2 Panel stages

Use one panel with a stage stack: `list`, `seller`, `item`, `checkout`.

1. A seller marker pushes `seller`. If the List panel is open, keep `list` below it.
2. "View item" pushes `item`.
3. "Start 5-minute Checkout Hold" pushes `checkout`.
4. Back pops one stage. Close clears the stack.
5. Escape does the same as Back.
6. Store one scroll offset per stage. Restore it when the stage returns.
7. Store the map camera before any automatic fly. Restore it on Close.
8. Focus the panel close button or heading on open. Focus the triggering marker or card on Close.
9. Do not trap focus. The panel is not modal. The map stays keyboard-reachable.
10. Do not add panel state to the URL. Keep the current `view`, `category`, `account`, `workspace`, and `seller` parameters.

### 6.3 Seller panel

Keep the current content and accessible name `Seller Preview: {publicName}`.

- Public Identity, Trust Summary, Distance Band, visible listings, listing availability.
- Each listing card has "View item".
- Close returns to the previous stage, or to the map.

### 6.4 Item panel

Keep the current accessible name `Demo Listing`.

- Photos, condition grade, defect disclosure, measurements, included parts, photo count and privacy note, price, availability, seller name, Distance Band.
- Structured question controls.
- Sticky footer: price and "Start 5-minute Checkout Hold".
- Keep the existing `loadListingForEditing` call when opening an item. Checkout and seller-workspace selection depend on it. Do not refactor it in this task.
- Keep the unavailable and outside-radius states.

### 6.5 Checkout stage

Keep the current accessible name `Checkout` and the hold view name `Checkout Hold`.

- Countdown, expiry time, price, simulation note.
- Advance to one second before expiry, advance to exact expiry, abandon, failed payment, successful payment.
- Keep the current notices and state transitions.
- Successful payment shows "View order" and "Back to map". "View order" opens Orders.
- Closing the panel does not release the hold.

### 6.6 List panel

Keep the current accessible name `Demo marketplace listings` and the card name `Nearby simulated listing: {title}`.

- One card per filtered listing, sorted by the existing rule.
- Seller name opens the seller panel.
- "View item" opens the item panel.
- Map Fallback opens this panel with the retry notice.

### 6.7 Demo controls

Use one drawer with sections:

- Session: selected account, Buyer Tier, role, reset, exit.
- Location: simulated snapshot select, Refresh nearby listings, Simulate stale resumed session, active snapshot number.
- Simulation: Simulate map failure, discovery failure (snapshot option).
- Workspaces: Seller workspace, Demo inventory, Orders.
- Privacy note.

Keep the labels `Simulated Browsing Location`, `Refresh nearby listings`, `Simulate stale resumed session`, `Reset Demo`, and `Exit demo`. Keep the reset confirmation dialog. Time controls stay in the transaction panels.

### 6.8 Workspaces

Seller workspace, Demo inventory, Orders, and trust/safety screens keep their current content. Wrap them in a full-height scroll screen with a "Back to map" button. The map is not shown while a workspace is active. Keep the map state in memory.

## 7. Map specification

### 7.1 Engine and data

- `maplibre-gl` only. No `react-map-gl`, no `turf`, no `pmtiles`.
- Style URL: optional `VITE_MAP_STYLE_URL`. Default to the OpenFreeMap Liberty style at `https://tiles.openfreemap.org/styles/liberty`. Confirm the URL at implementation time. If it is unavailable, report the problem; do not switch to an unlicensed endpoint.
- Attribution is required. Keep the MapLibre attribution control visible. Do not hide it behind the panel. On mobile, offset it above the current sheet height.
- The public tile host is donation-funded. It states no request limit and no registration. It has no SLA. Record this in the final report. Cost is zero.

### 7.2 Style

1. Fetch the style JSON before creating the map.
2. Apply a small tint pass: cream land, muted water, desaturated parks, warm white roads, dark green labels.
3. Keep the style's glyph and sprite URLs.
4. Pass the object to MapLibre. Do not mutate paint after load unless the tint pass is impossible.
5. Style fetch failure is a map error. Show the recovery card.

Use hex colours sampled from the existing tokens. Do not rely on `oklch()` in MapLibre paint values.

### 7.3 Maximum Browsing Boundary

- Centre: the current buyer snapshot point.
- Radius: 10,000 m.
- Geometry: a closed ring of 128 points, computed with a spherical destination formula.
- Layers: fill opacity about 0.05, line width about 1.5 px, line opacity about 0.55, colour from the green token.
- Insert the fill and line layers below the first symbol layer so labels stay above.
- Do not register click, hover, or drag handlers on these layers.
- Do not draw a centre dot.
- Do not draw the 2 km circle, a Seller Convenience Zone, a Pilot Area, or a 100 m handover circle.
- Show a floating legend: "Maximum boundary 10 km · Active search 2 km" and a "Fit" action.
- Hide the circle when the snapshot is invalid or stale.

### 7.4 Markers

- Buyer marker: `aria-label="Your location"`, a distinct style, no seller initials, and no coordinate text.
- Draw seller markers as MapLibre `Marker` instances with a DOM `<button>` element.
- `aria-label` formats:
  - Individual: `Seller marker, {initials}, {n} Listings`.
  - Group: `Seller marker group, {n} Sellers, {zoom to separate|choose Seller}`.
  - Append the checkout-hold summary as today.
- Add `aria-haspopup="dialog"` and keep a stable element reference for focus return.
- Individual marker content: initials and listing count. Group: "Sellers" and seller count.
- Keep the synthetic presentation and hold labels.
- Markers always sit above the boundary layers.

### 7.5 Positions and groups

Positions come from `src/demo-data.ts` discovery anchors, not from kilometre offsets.

1. Add `discoveryAnchor: { lat, lng }` and `distanceKm` to each Demo Seller.
2. Add a fictional `demoMapOrigin` in `demo-data.ts`. Do not document its coordinates. Choose a neutral point in the Bandung area, not an address or landmark.
3. Derive anchors with the distances and bearings below. Bearings are clockwise from north.
   - Dimas: 0.85 km, 30 degrees.
   - Sari: 0.65 km, 110 degrees.
   - Bima: 0.65 km, 121 degrees.
   - Rani: 1.30 km, 250 degrees.
   - Wawan: 1.30 km, 250 degrees.
4. Store the resolved anchors in `demo-data.ts`. Do not compute them at render time.
5. Reuse `createSellerDiscoveryMarker` for `listingCount` and `stableMarkerKey`. Ignore its legacy kilometre offsets.
6. Pass absolute east/north offsets from `demoMapOrigin` to `createSellerMapMarkers` so it can group at the centroid. Do not change `src/discovery.ts`.
7. Convert the returned individual or group offset back to a latitude and longitude.
8. Set each group's `separation` from its member anchors: `separable` when the anchors differ, `inseparable` when they are identical. The existing group definitions already match the anchors above.
9. Recenter resets the expanded group.
10. Keep `getSellerMarkerInitials`.

### 7.6 Camera

- Minimum zoom: 10. Maximum zoom: 17.
- First fit: buyer plus all visible markers, `maxZoom: 15`, padding top 120, bottom sheet height + 24, left 24, right panel width + 24.
- Recenter repeats the first fit. It does not refresh.
- "Fit maximum area" fits the circle bounds with `maxZoom: 11`, after moving the sheet to its smallest snap.
- Panning and zooming never change discovery. Show a static line: "Moving the map does not change nearby results."
- Announce only fit, recenter, and group expansion in the live region. Do not announce every pan.
- If a seller is selected while off screen, fly to its marker with panel padding. Store the previous camera and restore it on Close.
- Opening a panel does not refit the map. Pan only when the selected marker is covered by the panel.
- Respect `prefers-reduced-motion`: use duration 0 for all camera moves.

### 7.7 Loading and errors

- Check WebGL support and `navigator.onLine` before creating the map.
- Loading state: cream panel, "Loading the street map...", reduced-motion-safe indicator.
- Style fetch timeout: 8 seconds.
- Error state: "The street map did not load." Buttons: "Retry map" and "Use List view".
- A mid-session tile error shows a non-blocking notice; markers stay usable.
- The `map-failure` snapshot forces this error state.
- Map Fallback: open the List panel, keep the same results, categories, and distance bands, and keep the saved Map/List preference. Retry restores the map.
- Never show a decorative or fake map in place of the real one.

### 7.8 Keyboard and motion

- Map container: focusable, `role="region"`, `aria-label="Seller discovery map"`.
- Add a visually hidden "Skip map to listings" link that opens the List panel.
- MapLibre handles arrow-key pan and plus/minus zoom. Add a visible focus ring.
- Sheet drag pointer events are on the handle only. Sheet content scrolls with `overflow-y: auto` and `touch-action: pan-y`. The map keeps its own gestures.
- No animated sheet transitions under reduced motion.

## 8. Data changes

1. Add `distanceKm` and `discoveryAnchor` to each object in `demoSellers`.
2. Remove `distanceKm` from `DemoListingSeed` and from all 25 seed listings.
3. Remove the unused `demoListing.distance` string. It shows an exact distance.
4. In `DemoExperience.tsx`, replace every listing-level distance read with the seller distance:
   - discovery input
   - selected listing band
   - radius checks
   - remove the distance read from marker placement; markers use anchors
5. Keep `DiscoveryListing.distanceKm` and `discoverListings` unchanged. Pass the seller distance for every listing.
6. Keep `browsingLocations[].distanceKm` as the forced evaluation override. Use the same value as the buyer snapshot offset in kilometres.
7. Buyer snapshot point: `offsetPoint(demoMapOrigin, 0, distanceKm ?? 0)`.
8. When the override is active, show a small "Simulated evaluation scenario" note. The map markers keep their fixed positions.
9. Expected first view: 25 visible listings, 3 Books, three marker elements, and five listings in each seller panel. Bands: Dimas, Sari, and Bima under 1 km; Rani and Wawan 1-2 km.

## 9. Layout

### 9.1 Desktop (1024 px and wider)

- Map fills the viewport.
- Floating header at the top.
- Right panel: 400 px wide, 440 px at 1440 px and wider, 16 px inset, rounded corners, cream surface, shadow.
- Camera padding accounts for the panel.
- Panel has no drag handle. Internal scroll only.

### 9.2 Mobile (below 1024 px)

- Map fills the viewport.
- Header is two compact rows.
- Bottom sheet snap points: 22 percent, 55 percent, 90 percent.
- Seller opens at 55 percent. Item and checkout open at 90 percent. List opens at 90 percent.
- Drag on the handle only. Internal scroll.
- The map stays interactive above the sheet.
- Keep the attribution visible above the sheet.

### 9.3 Header and map chrome

- Brand, "Demo - simulation" label, category filter, Orders, account chip, Demo controls.
- Category filter stays a labelled select (`aria-label="Category Filter"`).
- Map controls: Zoom in, Zoom out, Recenter, Fit maximum. Use accessible names and icons with text alternatives.
- Boundary legend: top-left under the header.
- Result pill: bottom-centre above the sheet.
- Do not add a search box, directions, or ride-hailing controls.

## 10. Files

New:

- `src/DiscoveryMap.tsx` - MapLibre lifecycle, style tint, boundary, markers, camera, errors, attribution.
- `src/DiscoveryPanels.tsx` - non-modal panel shell, sheet drag and snap, stage header, focus, scroll restoration. The stage JSX stays in `DemoExperience.tsx` and passes into the shell as slot content.
- `src/DemoControls.tsx` - controls drawer.
- `src/map-points.ts` - `offsetPoint`, `circleRing`, `kmOffset`, `offsetFromKm`, bounds helpers.

Changed:

- `src/DemoExperience.tsx` - map frame, stage stack, extract the existing seller, item, checkout, and list JSX into render functions that fill the panel slots, workspace screens.
- `src/demo-data.ts` - seller distance and anchors, remove listing distance.
- `src/styles.css` - map frame, panels, sheet, drawer, legend, breakpoints, reduced motion.
- `package.json` and `package-lock.json` - `maplibre-gl`.
- Test specs listed in task T8.

### Dependencies

- `maplibre-gl` from npm.
- OpenFreeMap public style and tiles. Internet required. No key.
- No other package, account, or service.

Unchanged:

- `src/discovery.ts`, `src/checkout.ts`, `src/handover.ts`, `src/trust.ts`, `src/safety.ts`, `src/HandoverPanel.tsx`, `src/SafetyPanel.tsx`, `src/App.tsx`, routes, Supabase files.

## 11. Tasks

Execute in order. Stop and report after each task.

### T1 - Backup and dependency

1. Create `C:\Users\Satrio Faiz\Downloads\github-repos\jualokal-baseline-2026-11-12`.
2. Copy the working tree, excluding `node_modules`, `.git`, `.gitnexus`, `dist`, and `.tanstack`.
3. Write `BASELINE-NOTES.txt` with the branch, HEAD, and `git status --porcelain=v1` output.
4. Run `npm install maplibre-gl` from the repo root.

```powershell
$repo = "C:\Users\Satrio Faiz\Downloads\github-repos\jualokal"
$backup = "C:\Users\Satrio Faiz\Downloads\github-repos\jualokal-baseline-2026-11-12"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$skip = @("node_modules", ".git", ".gitnexus", "dist", ".tanstack")
Get-ChildItem -LiteralPath $repo -Force |
  Where-Object { $skip -notcontains $_.Name } |
  Copy-Item -Destination $backup -Recurse -Force
"branch: $(git -C $repo branch --show-current)" | Set-Content "$backup\BASELINE-NOTES.txt"
"head: $(git -C $repo rev-parse HEAD)" | Add-Content "$backup\BASELINE-NOTES.txt"
git -C $repo status --porcelain=v1 | Add-Content "$backup\BASELINE-NOTES.txt"
Set-Location $repo
npm install maplibre-gl
```

Done when: the backup contains `src`, `docs`, `tests`, `public`, and the config files; the notes file exists; `package.json` lists `maplibre-gl`; the lockfile is updated.

### T2 - Data model

1. Apply section 8.
2. Keep 25 listings and all listing content.
3. Do not change `discoverListings` or its input type.

Done when: each seller has one distance and one anchor; no listing-level distance read remains; the unused exact distance string is gone; `src/discovery.ts` is unchanged.

### T3 - Map component

1. Add `src/map-points.ts`.
2. Add `src/DiscoveryMap.tsx`.
3. Implement the style fetch, tint, boundary, markers, groups, camera, loading, error, attribution, and keyboard access.
4. Accept a `map-failure` signal and report load errors to the parent.

Done when: the map renders from the style JSON; the boundary exists below labels; markers are buttons; fit and recenter work; error and loading states exist; attribution is visible.

### T4 - Panel shell and content

1. Add `src/DiscoveryPanels.tsx`: stage header, back, close, snap, drag handle, scroll restore, focus.
2. Extract the existing seller, item, checkout, and list JSX into render functions in `DemoExperience.tsx`, and pass them to the shell as slot children. Do not rewrite the JSX.
3. Keep the accessible names in section 6.
4. Keep the existing checkout handlers and notices.

Done when: the stage stack works; Back and Close behave as specified; scroll resumes; focus returns; the panel is non-modal; existing transaction controls are unchanged.

### T5 - Demo controls

1. Add `src/DemoControls.tsx`.
2. Move every simulation control from the top of the old page into sections.
3. Keep the reset confirmation and exit behavior.
4. Keep the privacy note.

Done when: no control is deleted; the drawer opens and closes by button and Escape; focus returns; the header stays compact.

### T6 - Demo shell

1. Replace the old top-of-page controls and the below-map item section.
2. Render the map frame, header, legend, result pill, panel, and workspaces.
3. Keep `activeWorkspace` behavior and the Orders content. Add an Orders screen state if needed; do not rewrite the Orders JSX.
4. Keep URL sync and the saved Map/List preference.
5. If the saved view is List, open the List stage on entry. Reset forces Map.

Done when: Demo Mode lands on the map; the page does not scroll; the old item section is gone; landing page and routes are untouched.

### T7 - Styles

1. Add the map frame, header, panels, sheet, drawer, legend, pill, controls, and workspace screens.
2. Use the green and cream identity.
3. Add the 1024 px breakpoint and the 1440 px panel cap.
4. Add reduced-motion rules.
5. Check contrast for labels, badges, and buttons.

Done when: 360 px, 390 px, 900 px, 1024 px, 1280 px, and 1440 px layouts are defined; no body scroll; attribution and controls do not overlap the sheet.

### T8 - Test updates and report

1. Update only the UI specs that assert the old layout. Scan for `Seller discovery map`, `Pan map east`, `Buyer-centered`, `Demo Listing`, `4 Listings`, `20` articles, and `Books`.
2. Expected spec changes: `tests/map-discovery.spec.ts`, `tests/demo-mode.spec.ts`, `tests/checkout.spec.ts`, `tests/listing.spec.ts`, `tests/jualokal.spec.ts`.
3. Do not run the specs. Mark them as unexecuted in the report.
4. Do not change `tests/discovery-state.spec.ts` or `tests/checkout-state.spec.ts` unless a type forces it. Section 8 keeps those contracts stable.
5. Write the final report in section 14.

Done when: the report exists; every changed file has a one-line reason; limitations are explicit.

## 12. Manual verification checklist

The owner runs this. Do not mark any item as passed.

1. Open `http://localhost:5173`, then "Explore Demo Mode". The map fills the screen. No account wall. No page scroll. Buyer dot and three seller areas show.
2. Open a seller. Open an item. Back returns to the seller at the same scroll position. Close returns to the map. Map centre and zoom did not change.
3. Check 390 px phone, 1024 px desktop, 1280 px desktop, and a 900 px split-screen. Check sheet snap, internal scroll, drag on the handle only, and no gesture conflict with the map.
4. Check privacy and rules. No 2 km circle. No exact distance. No location permission prompt. The 10 km circle shows with its label. The outside-edge state shows no nearby listings. The stale state asks for a refresh. Switching accounts closes the open panel and resets group expansion.
5. Simulate map failure. The List panel and Retry show. Retry restores the map. Reset Demo restores Map, snapshot 1, All categories, and 25 listings.
6. Run the transaction journey. Start a hold, complete simulated payment, open Orders, schedule a handover, confirm on both sides. The flow behaves as before.

## 13. Risks and follow-ups

1. Tile host outage, blocked network, or missing WebGL shows the List fallback. The map will not be faked.
2. Forced edge scenarios keep the eligibility result but can show marker geometry that does not match it. The simulation note covers this.
3. The seller zone and the server-provided zone polygon are deferred. Do not ship a client-side Home Anchor to draw it later.
4. Test updates are unexecuted. The owner must expect selector mistakes.
5. `DemoExperience.tsx` is 3,836 lines. Extract only the map, panel shell, and controls. Keep the transaction JSX and handlers intact.
6. Follow-up: remove the legacy kilometre projection helpers if the real app adopts anchor-based discovery.

## 14. Final report format

Provide:

1. Changed files, with one line each.
2. Required configuration. Name `VITE_MAP_STYLE_URL` and its default.
3. Limitations. Name the deferred seller zone, the forced-scenario geometry, and the unexecuted tests.
4. Rollback. Restore the baseline folder. Do not use Git reset or checkout.
5. Manual checklist results as "Not run. Owner verifies." Never write "passed".

## 15. Rollback

Copy the backup folder back over the working tree. Keep the backup until the owner accepts the result. Do not run `git reset`, `git checkout`, or `git clean`; they would discard the owner's uncommitted work.
