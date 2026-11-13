## Problem Statement

A first-time visitor enters Jualokal Demo Mode and does not see a marketplace. They see a page of role, account, and location controls. Below that, they see a diagram shaped like a map. The seller view opens as a modal, but selecting an item closes it and moves the visitor to a separate section below the map, where checkout and handover also live.

The result is a document with a map on it, not a map-first product. A judge cannot tell within seconds that Jualokal is a hyperlocal, map-first marketplace. The map does not render real streets, so it cannot support realistic panning, zooming, or marker grouping. The visitor must scroll to inspect an item. The map context is lost.

## Solution

Demo Mode opens directly on a full-viewport street map. The buyer sees their simulated Browsing Location and coarse Seller Discovery Markers. A marker opens a Seller Preview panel over the map. Selecting a listing opens the item detail in the same panel stack. Back returns to the seller listings. Close returns to the unobstructed map. The map centre, zoom, selected context, and panel scroll position survive these moves.

On a phone, the panel is a bottom sheet. On a desktop or tablet, it is a side panel. The map stays visible and usable. Demo actor switching, simulated location changes, stale-session simulation, map-failure simulation, seller workspace, inventory, reset, and exit move into a Demo controls drawer. A compact simulation label stays visible.

The buyer sees a 10 km **Maximum Browsing Boundary** centred on the current snapshot. The active 2 km Discovery Radius is stated in text and is not drawn. The seller-side Seller Convenience Zone boundary is deferred. No real geolocation is requested. No Home Anchor is exposed.

## User Stories

1. As a first-time judge, I want Demo Mode to open on a street map, so that I understand the product is map-first within seconds.
2. As a first-time judge, I want the map to fill the screen, so that no controls push it below the fold.
3. As a Demo Buyer, I want a buyer-location marker, so that I know the centre of the current simulated search.
4. As a Demo Buyer, I want coarse Seller Discovery Markers near me, so that I can start discovery from the map.
5. As a Demo Buyer, I want a seller marker to open a Seller Preview over the map, so that I do not lose the map context.
6. As a Demo Buyer, I want the Seller Preview to show the seller's Public Identity, Trust Summary, Distance Band, and visible listings, so that I can judge the seller before opening an item.
7. As a Demo Buyer, I want "View item" to open the item detail over the seller listings, so that I can inspect the item without scrolling away.
8. As a Demo Buyer, I want Back to return to the seller listings at the same scroll position, so that I can compare items.
9. As a Demo Buyer, I want Close to return to the unobstructed map, so that I can continue exploring.
10. As a Demo Buyer, I want the map centre and zoom to stay the same while panels open and close, so that I do not lose my place.
11. As a Demo Buyer, I want the item detail to show photos, condition, defects, measurements, included parts, availability, and price, so that I can inspect the item fully.
12. As a Demo Buyer, I want the item detail to keep the checkout entry, so that I can act without leaving the map.
13. As a Demo Buyer, I want a 5-minute Checkout Hold to start from the item detail, so that the existing purchase flow still works.
14. As a Demo Buyer, I want a checkout stage with the countdown, expiry, failed payment, and simulated payment controls, so that I can complete the demo purchase.
15. As a Demo Buyer, I want "View order" after payment, so that I can continue to the existing Orders screen.
16. As a Demo Buyer, I want the Category Filter on the map, so that I can narrow results without leaving the map.
17. As a Demo Buyer, I want a List view, so that I can browse the same results in a listing-first layout.
18. As a Demo Buyer, I want Map Fallback to open List with a retry, so that a map failure does not block the demo.
19. As a Demo Buyer, I want a Recenter control, so that I can return to the buyer-centred view.
20. As a Demo Buyer, I want a "Fit maximum area" control, so that I can see the full 10 km Maximum Browsing Boundary.
21. As a Demo Buyer, I want a labelled Maximum Browsing Boundary, so that I understand the maximum area without confusing it with the active 2 km search.
22. As a Demo Buyer, I want the active 2 km Discovery Radius stated in text, so that I know what is actually searchable.
23. As a Demo Buyer, I want no 2 km boundary circle, so that the map does not imply a precise Discovery Radius boundary.
24. As a Demo Buyer, I want no exact distance and no seller-zone boundary, so that seller privacy is protected.
25. As a Demo Buyer, I want markers to stay in place when I pan or zoom, so that the map behaves like a real map.
26. As a Demo Buyer, I want markers to stay in place when the simulated location changes, so that sellers do not appear to move.
27. As a Demo Buyer, I want overlapping sellers to group, so that I can choose a seller without invented positions.
28. As a mobile visitor, I want a bottom sheet with snap points, so that the map stays usable with one hand.
29. As a desktop visitor, I want a side panel, so that the map stays visible and usable.
30. As a keyboard user, I want to reach markers, controls, and panels, so that I can complete discovery without a pointer.
31. As a screen-reader user, I want clear labels and focus return, so that I know where I am after a panel closes.
32. As a reduced-motion user, I want no map or sheet animation, so that motion does not cause discomfort.
33. As a privacy-conscious visitor, I want no device location request, so that the demo reveals nothing real.
34. As a judge, I want Demo controls in a drawer, so that actor, location, failure, reset, and exit stay available without cluttering the map.
35. As a judge, I want to switch demo accounts, so that I can show the buyer and seller stories.
36. As a judge, I want to refresh the simulated Browsing Location, so that I can show the radius and stale-session rules.
37. As a judge, I want to simulate a map failure, so that I can show the List fallback and the retry.
38. As a judge, I want Reset Demo to return to the map with snapshot 1 and 25 Demo Listings, so that every run starts clean.
39. As a Demo Seller, I want my existing workspace and inventory screens, so that I can manage listings as before.
40. As a Demo Buyer, I want Orders to keep the existing transaction journey, so that checkout, handover, safety, and trust still work.

## Implementation Decisions

### Map surface

- Use MapLibre GL JS with the OpenFreeMap public vector-tile instance. No key, no account, no paid service. Internet is required; the host has no SLA.
- Fetch the style JSON, apply a restrained cream and green tint, and pass the style object to MapLibre. Keep the provider's glyph and sprite URLs.
- Keep the MapLibre attribution control visible at all times, including above the mobile sheet.
- Minimum zoom 10 and maximum zoom 17. The first view fits the buyer and visible markers at about zoom 14. "Fit maximum area" fits the 10 km circle and must not be blocked by the minimum zoom.
- The real map is the only map. A loading state, an error state, and the List fallback replace it. No decorative map is allowed.

### Maximum Browsing Boundary

- Draw one fill and one outline layer for the 10 km circle, centred on the current snapshot.
- Use a closed 128-point ring, low fill opacity, a thin outline, and no centre dot.
- Insert both layers below the first symbol layer so labels stay above.
- Do not attach pointer handlers. The boundary is not selectable.
- Do not draw the 2 km Discovery Radius, the Seller Convenience Zone, the Pilot Area, or a 100 m handover circle.
- Show a legend that reads "Maximum boundary 10 km · Active search 2 km" and offers "Fit".
- Hide the boundary when the Browsing Location is invalid or stale.

### Seller Discovery Markers

- Each Demo Seller receives one fixed fictional **discovery anchor** for display. It is not a Home Anchor and does not drive eligibility.
- Markers are DOM buttons inside MapLibre markers, not a symbol layer. This keeps keyboard access and focus return simple.
- Individual label: "Seller marker, {initials}, {n} Listings". Group label: "Seller marker group, {n} Sellers, {zoom to separate|choose Seller}".
- Keep the existing checkout-hold suffix in the label.
- Buyer marker: "Your location". It has a distinct style and no coordinate text.
- Groups keep the current semantic rules. Sari and Bima share a coarse point and separate at high zoom. Rani and Wawan share one exact point and always use a chooser. Do not scatter markers. Do not add distance-based clustering.

### Data model

- Add one `distanceKm` and one `discoveryAnchor` to each Demo Seller. The type shape is:

  `{ id, publicName, initials, identityStatus, activationStatus, handovers, distanceKm, discoveryAnchor: { lat, lng } }`

- Remove `distanceKm` from the Demo Listing seed. All five listings of a seller inherit the seller's Distance Band.
- Keep `discoverListings` and its input contract unchanged. Pass the seller distance for every listing. This preserves the existing pure discovery tests.
- Set seller distances to: Dimas 0.85 km, Sari 0.65 km, Bima 0.65 km, Rani 1.30 km, Wawan 1.30 km.
- Derive anchors from one undocumented fictional origin at bearings 30, 110, 121, 250, and 250 degrees. Sari and Bima are about 125 m apart. Rani and Wawan share one point.
- The first view shows 25 Discoverable Listings, 3 Books, and three seller marker elements. Dimas, Sari, and Bima are "Under 1 km"; Rani and Wawan are "1-2 km".
- Keep `browsingLocations[].distanceKm` as the forced evaluation override and as the buyer snapshot offset.
- When the override is active, show a small "Simulated evaluation scenario" note. Markers keep their fixed positions.

### Panels

- One panel with a stage stack: List, Seller Preview, item detail, checkout.
- The panel is non-modal. Do not trap focus. The map stays keyboard-reachable.
- Back pops one stage. Close clears the stack. Escape acts as Back.
- Store one scroll offset per stage and restore it.
- Store the map camera before an automatic fly and restore it on Close.
- Focus the stage close button or heading on open. Return focus to the triggering marker or card on Close.
- Desktop: right floating panel, 400 px wide, 440 px at 1440 px and wider, 16 px inset.
- Mobile: bottom sheet at 22, 55, and 90 percent. Drag only on the handle. Content scrolls internally. The map stays interactive above the sheet.
- Opening a panel does not refit the map. Pan only when the selected marker is covered by the panel.

### Checkout and later flows

- The item detail keeps its existing content and accessible name. Add a sticky footer with price and "Start 5-minute Checkout Hold".
- Starting the hold pushes a checkout stage in the same panel. Keep the existing countdown, expiry, abandon, failed payment, successful payment, notices, and state transitions.
- Closing the panel does not release the hold.
- After payment, show "View order" and "Back to map". "View order" opens the existing Orders screen.
- Scheduling, handover, mismatch, safety, payout, and dispute stay in their existing screens. Do not move them into the map.
- Keep the existing `loadListingForEditing` call when an item opens. Checkout and seller-workspace selection depend on it.

### Demo controls

- Move account switching, role, location snapshot, refresh, stale simulation, map-failure simulation, seller workspace, inventory, reset, exit, and the privacy note into one drawer.
- Keep the reset confirmation and the exit behavior.
- Keep time controls in the transaction panels.
- Header keeps brand, "Demo - simulation" label, Category Filter, Orders, account chip, and Demo controls.
- Keep the labels "Simulated Browsing Location", "Refresh nearby listings", "Simulate stale resumed session", "Reset Demo", and "Exit demo".

### Privacy and camera rules

- Never call `navigator.geolocation`.
- Never show an exact distance.
- Never expose a Home Anchor, Seller Convenience Zone, or Pilot Area boundary.
- Panning and zooming never change the snapshot, results, radius, or inventory.
- Only "Refresh nearby listings" replaces the snapshot. It recentres the map and closes panels that no longer apply.
- "Recenter" returns to the buyer-centred fit without refreshing.
- Selecting an off-screen seller flies to its marker with panel padding, then restores the previous camera on Close.
- No seller-centred boundary is drawn in this build.

### Error and fallback

- Check WebGL support and online status before creating the map.
- Show a loading state. Use an 8-second style timeout.
- On failure, show "The street map did not load", a "Retry map" action, and a "Use List view" action.
- Map Fallback keeps the same results, Category Filter, Distance Bands, and saved Map/List preference.
- A mid-session tile error shows a non-blocking notice. Markers stay usable.
- Never leave a blank canvas.

### URL and state

- Keep the existing `demo`, `account`, `workspace`, `category`, `view`, and `seller` URL parameters.
- Do not add panel stages to the URL.
- If the saved Discovery View is List, open the List stage on entry. Reset forces Map.
- Reset Demo restores Map, snapshot 1, All categories, and the initial session data.

## Testing Decisions

- Good tests assert external behaviour. They enter Demo Mode, open a seller, open an item, go Back, close, and assert the visible result, focus, and preserved map state. They do not assert component internals or class names.
- Acceptance is manual by the project owner. No automated tests, builds, browser checks, or dev-server runs are executed for this change.
- The existing Playwright suite is the prior art and the intended seam once execution resumes. It already covers map discovery, demo mode, checkout, and listing inspection. The affected specs are updated but remain unexecuted.
- The pure discovery seam stays stable. `discoverListings` keeps the same input and output, so the existing discovery unit checks remain valid.
- New pure helpers for coordinate offsets, the circle ring, and the group centroid are the lowest seam. They can be checked later without a browser.
- The highest seam is the demo route: entry, marker, seller, item, Back, Close, error, reset. Use that seam for future automated coverage rather than testing the map adapter or panel shell in isolation.

## Out of Scope

- The public landing page.
- Real authentication, Supabase persistence, and backend APIs.
- Native apps.
- The Seller Convenience Zone map, seller handover map, and any seller-centred boundary.
- Fixed real-world geometry, routing, geocoding, search, and directions.
- Checkout, handover, trust, safety, and orders logic changes.
- Browser Back integration for panels.
- Automated verification for this change.
- Commits, pushes, and pull requests.

## Further Notes

- The map provider is free and keyless. The public instance is donation-funded with no service guarantee. The demo must remain usable through the List fallback when the host fails.
- The 10 km circle is a new buyer-visible concept, recorded as **Maximum Browsing Boundary** in `CONTEXT.md` and ADR 0020. Do not call it the Discovery Radius.
- The seller zone is deferred. Its rule is 1 km around the protected Home Anchor. A future implementation must not send the Home Anchor to the browser; use a server-provided polygon or coarse centre.
- Forced location scenarios keep their eligibility results but can show marker geometry that does not match the Distance Band. The "Simulated evaluation scenario" note explains this.
- Keep a recoverable copy of the working tree before implementation. The repository has uncommitted submission work that must not be reset or committed.
- The execution handoff with file-level tasks, commands, and the manual checklist is `docs/specs/demo-map-first.md`.
- Track this spec in GitHub Issues with the `ready-for-agent` label.
