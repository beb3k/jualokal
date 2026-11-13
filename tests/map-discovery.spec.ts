import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
}

async function openDemoControls(page: Page) {
  await page.getByRole("button", { name: "Demo controls" }).click();
  return page.getByRole("dialog", { name: "Demo controls" });
}

test("Map View opens one privacy-preserving Seller Preview and the full listing", async ({
  page,
}, testInfo) => {
  await openDemo(page);

  const map = page.getByRole("region", { name: "Seller discovery map" });
  const marker = map.getByRole("button", {
    name: "Seller marker, DP, 5 Listings",
  });
  await expect(map).toBeVisible();
  await expect(map.getByRole("img", { name: "Your location" })).toBeVisible();
  await expect(marker).toBeVisible();
  await expect(map).toContainText("Buyer-centered view");
  await expect(map).toContainText("Moving the map does not change nearby results");
  await expect(map).toContainText("Maximum boundary 10 km");
  await expect(map).toContainText("Active search 2 km");
  await expect(map).not.toContainText(/Dimas|Rp|Under 1 km|Trust Summary|exact distance/i);

  const mapCanvas = map.getByLabel(/Interactive street map/i);
  await mapCanvas.focus();
  await page.keyboard.press("ArrowRight");
  await map.getByRole("button", { name: "Zoom in" }).click();
  await expect(marker).toHaveAccessibleName("Seller marker, DP, 5 Listings");
  await map.getByRole("button", { name: "Fit maximum area" }).click();
  await expect(map.getByRole("status")).toContainText("Maximum browsing boundary fitted");
  await map.getByRole("button", { name: "Recenter map" }).click();
  await expect(map.getByRole("status")).toContainText("Buyer-centered view restored");

  await marker.click();
  const panel = page.getByRole("complementary", { name: "Seller Preview panel" });
  const preview = panel.getByRole("region", { name: "Seller Preview: Dimas P." });
  await expect(panel).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(panel).not.toHaveAttribute("aria-modal", "true");
  await expect(panel.getByRole("button", { name: "Close panel" })).toBeFocused();
  await expect(preview).toContainText("Dimas P.");
  await expect(preview).toContainText("Simulated as verified");
  await expect(preview).toContainText("Under 1 km");
  await expect(preview.getByRole("article")).toHaveCount(5);

  const viewport = page.viewportSize();
  const panelBox = await panel.boundingBox();
  expect(viewport).not.toBeNull();
  expect(panelBox).not.toBeNull();
  if (testInfo.project.name === "phone") {
    expect(panelBox!.y + panelBox!.height).toBeGreaterThan(viewport!.height - 2);
    await expect(panel.getByRole("button", { name: "Resize panel" })).toBeVisible();
  } else {
    expect(panelBox!.x + panelBox!.width).toBeGreaterThan(viewport!.width - 24);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
    expect(panelBox!.width).toBeLessThan(viewport!.width * 0.6);
  }

  await panel.getByRole("button", { name: "Close panel" }).click();
  await expect(marker).toBeFocused();
  await marker.click();
  await preview
    .getByRole("article", { name: "Seller Preview Listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  const itemPanel = page.getByRole("complementary", { name: "Item detail" });
  const listing = itemPanel.getByRole("region", { name: "Demo Listing" });
  await expect(
    listing.getByRole("heading", { name: "Handwoven rattan market basket" }),
  ).toBeVisible();
  await expect(itemPanel.getByRole("button", { name: "Close panel" })).toBeFocused();
  await expect(itemPanel.getByRole("button", { name: "Back", exact: true })).toBeVisible();
});

test("List View prioritizes marketplace controls and opens a complete Listing inspection", async ({
  page,
}) => {
  await openDemo(page);

  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toHaveCount(0);
  const resultPill = page.getByRole("button", {
    name: "Open List panel: 3 seller areas, 25 listings",
  });
  await expect(resultPill).toBeVisible();
  await resultPill.click();

  const discovery = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(discovery).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.getByLabel("Category Filter")).toHaveValue("All");

  const card = discovery.getByRole("article", {
    name: "Nearby simulated listing: Handwoven rattan market basket",
  });
  await expect(
    card.getByRole("img", {
      name: "Synthetic presentation for Handwoven rattan market basket",
    }),
  ).toBeVisible();
  await expect(card.getByRole("heading", { name: "Handwoven rattan market basket" })).toBeVisible();
  await expect(card.getByText("Portable household goods", { exact: true })).toBeVisible();
  await expect(card.getByText("Good", { exact: true })).toBeVisible();
  await expect(card.getByText("Under 1 km", { exact: true })).toBeVisible();
  await expect(card.getByText("Rp 185.000", { exact: true })).toBeVisible();

  const credibility = card.getByRole("region", { name: "Seller credibility: Dimas P." });
  await expect(credibility.getByRole("button", { name: "Dimas P." })).toBeVisible();
  await expect(credibility).toContainText("Simulated as verified");
  await expect(credibility).toContainText(/successful handovers/i);

  const queryBefore = new URL(page.url()).search;
  await card.getByRole("button", { name: "View item" }).click();

  const itemPanel = page.getByRole("complementary", { name: "Item detail" });
  const listing = itemPanel.getByRole("region", { name: "Demo Listing" });
  await expect(itemPanel.getByRole("button", { name: "Close panel" })).toBeFocused();
  await expect(
    listing.getByRole("heading", { name: "Handwoven rattan market basket" }),
  ).toBeVisible();
  await expect(listing.getByRole("region", { name: "Checkout" })).toBeVisible();
  await expect(
    listing.getByRole("region", { name: "Structured listing questions" }),
  ).toBeVisible();
  expect(new URL(page.url()).search).toBe(queryBefore);
});

test("Map and List use one filtered result while only explicit view preference persists", async ({
  page,
}) => {
  await openDemo(page);

  await expect(page.getByRole("region", { name: "Seller discovery map" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo marketplace listings" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 25 listings" }).click();

  const list = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(list).toBeVisible();
  await expect(list.getByRole("article")).toHaveCount(25);
  await list.getByRole("button", { name: "Dimas P." }).first().click();
  const previewPanel = page.getByRole("complementary", { name: "Seller Preview panel" });
  await expect(
    previewPanel.getByRole("region", { name: "Seller Preview: Dimas P." }),
  ).toBeVisible();
  await previewPanel.getByRole("button", { name: "Close panel" }).click();

  await page.getByLabel("Category Filter").selectOption("Books");
  await expect(page.getByRole("region", { name: "Demo marketplace listings" })).toHaveCount(0);
  const filteredMap = page.getByRole("region", { name: "Seller discovery map" });
  await expect(
    filteredMap.getByRole("button", { name: "Seller marker, DP, 0 Listings" }),
  ).toHaveCount(0);
  await expect(filteredMap.locator(".seller-discovery-marker")).toHaveCount(3);
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 3 listings" }).click();
  await expect(list.getByRole("article")).toHaveCount(3);
  await page.getByRole("button", { name: "Close panel" }).click();

  let drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("at-edge");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await expect(page.getByRole("region", { name: "Seller discovery map" })).toContainText(
    "Moving the map does not change nearby results",
  );

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("inside-edge");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 3 listings" }).click();

  const stored = await page.evaluate(() => ({
    view: localStorage.getItem("jualokal.discovery-view"),
    keys: Object.keys(localStorage),
  }));
  expect(stored).toEqual({ view: "list", keys: ["jualokal.discovery-view"] });

  drawer = await openDemoControls(page);
  await drawer.getByRole("button", { name: /Exit demo/ }).click();
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await expect(page.getByRole("region", { name: "Demo marketplace listings" })).toBeVisible();
  await expect(page.getByLabel("Category Filter")).toHaveValue("All");
  drawer = await openDemoControls(page);
  await expect(drawer.getByLabel("Simulated Browsing Location")).toHaveValue("current");
});

test("Map and List hide location-dependent content without a valid snapshot", async ({ page }) => {
  await openDemo(page);
  const map = page.getByRole("region", { name: "Seller discovery map" });

  let drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("denied");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await expect(page.getByRole("heading", { name: "Location permission denied" })).toBeVisible();
  await expect(map.getByRole("img", { name: "Your location" })).toHaveCount(0);
  await expect(map.locator(".seller-discovery-marker")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open List panel:/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo marketplace listings" })).toHaveCount(0);

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("unavailable");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await expect(page.getByRole("heading", { name: "Location unavailable" })).toBeVisible();
  await expect(map.getByRole("img", { name: "Your location" })).toHaveCount(0);
  await expect(map.locator(".seller-discovery-marker")).toHaveCount(0);
});

test("grouped Sellers zoom only when separable and otherwise use one chooser", async ({
  page,
}) => {
  await openDemo(page);
  const map = page.getByRole("region", { name: "Seller discovery map" });

  await expect(
    map.getByRole("button", { name: "Seller marker, DP, 5 Listings" }),
  ).toBeVisible();
  const separableGroup = map.getByRole("button", {
    name: "Seller marker group, 2 Sellers, zoom to separate",
  });
  const sharedAreaGroup = map.getByRole("button", {
    name: "Seller marker group, 2 Sellers, choose Seller",
  });
  await expect(separableGroup).toBeVisible();
  await expect(sharedAreaGroup).toBeVisible();

  await separableGroup.click();
  await expect(
    map.getByRole("button", { name: "Seller marker, SN, 5 Listings" }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Seller marker, BA, 5 Listings" }),
  ).toBeVisible();
  await expect(map.getByRole("status")).toContainText(
    "2 Sellers separate as the map zooms in",
  );
  await expect(separableGroup).toHaveCount(0);

  await map.getByRole("button", { name: "Recenter map" }).click();
  await expect(separableGroup).toBeVisible();
  await sharedAreaGroup.focus();
  await page.keyboard.press("Enter");

  const chooserPanel = page.getByRole("complementary", { name: "Seller chooser panel" });
  const chooser = chooserPanel.getByRole("region", { name: "Seller chooser" });
  await expect(chooserPanel.getByRole("button", { name: "Close panel" })).toBeFocused();
  await expect(chooser).toContainText("cannot be separated without inventing locations");
  await chooser
    .getByRole("button", { name: "Rani K. · Fictional Demo Seller" })
    .click();

  const previewPanel = page.getByRole("complementary", { name: "Seller Preview panel" });
  const preview = previewPanel.getByRole("region", { name: "Seller Preview: Rani K." });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("article")).toHaveCount(5);
  await previewPanel.getByRole("button", { name: "Close panel" }).click();
  await expect(sharedAreaGroup).toBeFocused();
});

test("filters and account switching update groups, Preview, and List from one result", async ({
  page,
}) => {
  await openDemo(page);
  const map = page.getByRole("region", { name: "Seller discovery map" });

  await page.getByLabel("Category Filter").selectOption("Books");
  await expect(map.getByRole("button", { name: /Seller marker group/ })).toHaveCount(0);
  await expect(
    map.getByRole("button", { name: "Seller marker, DP, 1 Listing" }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Seller marker, SN, 1 Listing" }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Seller marker, RK, 1 Listing" }),
  ).toBeVisible();

  await map.getByRole("button", { name: "Seller marker, SN, 1 Listing" }).click();
  const previewPanel = page.getByRole("complementary", { name: "Seller Preview panel" });
  const preview = previewPanel.getByRole("region", { name: "Seller Preview: Sari N." });
  await expect(preview.getByRole("article")).toHaveCount(1);
  await expect(preview).toContainText("Indonesian recipe notebook");
  await previewPanel.getByRole("button", { name: "Close panel" }).click();

  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 3 listings" }).click();
  const list = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(list.getByRole("article")).toHaveCount(3);

  let drawer = await openDemoControls(page);
  await drawer.getByRole("combobox", { name: "Selected fictional account" }).selectOption("seller-sari");
  drawer = await openDemoControls(page);
  await expect(drawer.getByRole("combobox", { name: "Selected fictional account" })).toHaveValue(
    "seller-sari",
  );
  await drawer.getByRole("button", { name: "View discovery as selected Seller" }).click();
  await page.getByRole("button", { name: "Open List panel: 2 seller areas, 2 listings" }).click();
  await expect(list.getByText("Indonesian recipe notebook")).toHaveCount(0);
  await expect(list.getByRole("article")).toHaveCount(2);

  drawer = await openDemoControls(page);
  await drawer.getByRole("combobox", { name: "Selected fictional account" }).selectOption("buyer-naufal");
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 3 listings" }).click();
  await expect(list.getByText("Indonesian recipe notebook")).toBeVisible();
  await expect(list.getByRole("article")).toHaveCount(3);
});

test("Reset Demo restores Map, location, inventory, and grouped marker state", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 25 listings" }).click();
  await page.getByLabel("Category Filter").selectOption("Books");

  let drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("outside-edge");
  await drawer.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await expect(page.getByRole("region", { name: "Demo marketplace listings" })).toHaveCount(0);
  await expect(page.getByLabel("Category Filter")).toHaveValue("All");
  await expect(
    page.getByRole("button", { name: "Open List panel: 3 seller areas, 25 listings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Seller marker group, 2 Sellers, choose Seller" }),
  ).toBeVisible();

  drawer = await openDemoControls(page);
  await expect(drawer.getByLabel("Simulated Browsing Location")).toHaveValue("current");
  await expect(drawer.getByRole("group", { name: "Demo session totals" })).toContainText(
    "25 active Demo Listings",
  );
});

test("refresh replaces only the snapshot while preserving view and category", async ({ page }) => {
  await openDemo(page);

  await page.getByLabel("Category Filter").selectOption("Books");
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 3 listings" }).click();
  const listings = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(listings.getByRole("article")).toHaveCount(3);

  let drawer = await openDemoControls(page);
  const location = drawer.getByLabel("Simulated Browsing Location");
  await location.selectOption("at-edge");
  await expect(drawer).toContainText(/Active simulated snapshot 1/);
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();

  drawer = await openDemoControls(page);
  await expect(drawer).toContainText(/Active simulated snapshot 2/);
  await drawer.getByRole("button", { name: "Close Demo controls" }).click();
  await expect(page.getByLabel("Category Filter")).toHaveValue("Books");
  await expect(page.getByRole("status").filter({ hasText: /recalculated/ })).toBeVisible();
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 3 listings" }).click();
  await expect(listings.getByRole("article")).toHaveCount(3);
  await expect(listings.getByText("1-2 km", { exact: true }).first()).toBeVisible();
});

test("returning from the background marks the Browsing Location stale without requesting location", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let requests = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: () => { requests += 1; },
        watchPosition: () => { requests += 1; return 1; },
        clearWatch: () => undefined,
      },
    });
    Object.defineProperty(window, "__locationRequests", {
      get: () => requests,
    });
  });
  await openDemo(page);
  const map = page.getByRole("region", { name: "Seller discovery map" });
  await expect(map).toBeVisible();

  await page.evaluate(() => {
    let simulatedVisibility: DocumentVisibilityState = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => simulatedVisibility,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    simulatedVisibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(
    page.getByRole("heading", { name: "Browsing Location needs refresh" }),
  ).toBeVisible();
  await expect(map.getByRole("img", { name: "Your location" })).toHaveCount(0);
  await expect(map.locator(".seller-discovery-marker")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open List panel:/ })).toHaveCount(0);
  await expect(
    page.evaluate(
      () => (window as typeof window & { __locationRequests: number }).__locationRequests,
    ),
  ).resolves.toBe(0);
});

test("stale resume, location errors, service failure, and empty states stay distinct", async ({
  page,
}) => {
  await openDemo(page);
  const map = page.getByRole("region", { name: "Seller discovery map" });

  let drawer = await openDemoControls(page);
  await drawer.getByRole("button", { name: "Simulate stale resumed session" }).click();
  await expect(
    page.getByRole("heading", { name: "Browsing Location needs refresh" }),
  ).toBeVisible();
  await expect(map.locator(".seller-discovery-marker")).toHaveCount(0);

  await page
    .getByRole("region", { name: "Nearby discovery status" })
    .getByRole("button", { name: "Refresh nearby listings" })
    .click();
  await expect(map.getByRole("img", { name: "Your location" })).toBeVisible();

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("denied");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await expect(page.getByRole("heading", { name: "Location permission denied" })).toBeVisible();

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("unavailable");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await expect(page.getByRole("heading", { name: "Location unavailable" })).toBeVisible();

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("discovery-failure");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await expect(page.getByRole("heading", { name: "Nearby discovery unavailable" })).toBeVisible();
  await expect(page.getByText("This is not an empty result.")).toBeVisible();

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("books-empty");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  await page.getByLabel("Category Filter").selectOption("Books");
  await expect(page.getByRole("heading", { name: "No Books listings nearby" })).toBeVisible();
  await page.getByRole("button", { name: "Show All categories" }).click();
  await expect(map.getByRole("img", { name: "Your location" })).toBeVisible();

  drawer = await openDemoControls(page);
  await drawer.getByLabel("Simulated Browsing Location").selectOption("outside-edge");
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();
  const nearbyEmpty = page.getByRole("region", { name: "Nearby discovery status" });
  await expect(nearbyEmpty.getByRole("heading", { name: "No nearby listings yet" })).toBeVisible();
  await expect(nearbyEmpty).toContainText("radius was not widened");
  const sellNearby = nearbyEmpty.getByRole("button", { name: "Sell an item nearby" });
  await expect(nearbyEmpty.getByRole("button", { name: "Refresh nearby listings" })).toBeVisible();
  await expect(sellNearby).toBeVisible();

  await sellNearby.click();
  await expect(page.getByRole("heading", { name: "Manage demo listing" })).toBeVisible();
  drawer = await openDemoControls(page);
  await expect(
    drawer.getByRole("combobox", { name: "Selected fictional account" }),
  ).toHaveValue("seller-dimas");
});

test("Map Fallback preserves results and saved preference until retry recovers", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Open List panel: 3 seller areas, 25 listings" }).click();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByLabel("Category Filter").selectOption("Books");

  const drawer = await openDemoControls(page);
  await drawer.getByRole("button", { name: "Simulate map failure" }).click();
  await drawer.getByRole("button", { name: "Refresh nearby listings" }).click();

  const mapError = page.getByRole("region", { name: "Seller discovery map" }).getByRole("alert");
  await expect(mapError.getByRole("heading", { name: "The street map did not load." })).toBeVisible();
  await mapError.getByRole("button", { name: "Use List view" }).click();

  const fallback = page.getByRole("status", { name: "Map Fallback" });
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText("same results");
  await expect(
    page.getByRole("region", { name: "Demo marketplace listings" }).getByRole("article"),
  ).toHaveCount(3);
  await expect(page.getByLabel("Category Filter")).toHaveValue("Books");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jualokal.discovery-view")))
    .toBe("map");

  await fallback.getByRole("button", { name: "Retry map" }).click();
  await expect(fallback).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Your location" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Map rendering recovered" })).toBeVisible();
});

test("Map detail toggle defaults to Clean, persists Detailed across reload, and resets cleanly", async ({
  page,
}, testInfo) => {
  await openDemo(page);

  const map = page.getByRole("region", { name: "Seller discovery map" });
  const detailGroup = map.getByRole("group", { name: "Map detail" });
  const cleanButton = detailGroup.getByRole("button", { name: "Clean" });
  const detailedButton = detailGroup.getByRole("button", { name: "Detailed" });

  await expect(cleanButton).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
  await expect(detailedButton).toHaveAttribute("aria-pressed", "false");
  await expect(map.getByRole("img", { name: "Your location" })).toBeVisible();
  await expect(map.getByRole("button", { name: "Seller marker, DP, 5 Listings" })).toBeVisible();
  await expect(map).toContainText("OpenFreeMap");

  const viewport = page.viewportSize();
  const cleanBox = await cleanButton.boundingBox();
  const detailedBox = await detailedButton.boundingBox();
  const recenterBox = await map.getByRole("button", { name: "Recenter map" }).boundingBox();
  const resultPillBox = await page
    .getByRole("button", { name: "Open List panel: 3 seller areas, 25 listings" })
    .boundingBox();
  expect(viewport && cleanBox && detailedBox && recenterBox && resultPillBox).toBeTruthy();
  expect(cleanBox!.x + cleanBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(detailedBox!.x + detailedBox!.width).toBeLessThanOrEqual(viewport!.width);
  if (testInfo.project.name === "phone") {
    expect(cleanBox!.y + cleanBox!.height).toBeLessThanOrEqual(resultPillBox!.y);
  } else {
    expect(detailedBox!.x + detailedBox!.width).toBeLessThanOrEqual(resultPillBox!.x);
  }

  await detailedButton.focus();
  await page.keyboard.press("Enter");
  await expect(detailedButton).toHaveAttribute("aria-pressed", "true");
  await expect(cleanButton).toHaveAttribute("aria-pressed", "false");
  await expect(map.getByRole("status")).toContainText("Detailed street map selected");
  await expect(map.getByRole("button", { name: "Seller marker, DP, 5 Listings" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open List panel: 3 seller areas, 25 listings" }),
  ).toBeVisible();

  await page.reload();
  await expect(detailedButton).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
  await expect(cleanButton).toHaveAttribute("aria-pressed", "false");

  const drawer = await openDemoControls(page);
  await drawer.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await expect(cleanButton).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
  await expect(detailedButton).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("jualokal.map-detail")))
    .toBeNull();

  await page.evaluate(() => {
    localStorage.setItem("jualokal.map-detail", "unexpected-value");
  });
  await page.reload();
  await expect(cleanButton).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
  await expect(detailedButton).toHaveAttribute("aria-pressed", "false");
});
