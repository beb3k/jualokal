import { expect, test } from "@playwright/test";

async function openDemo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
}

test("Map View opens one privacy-preserving Seller Preview and the full listing", async ({
  page,
}, testInfo) => {
  await openDemo(page);

  const map = page.getByRole("region", { name: "Seller discovery map" });
  const marker = map.getByRole("button", {
    name: "Seller marker, DP, 4 Listings",
  });
  await expect(map).toBeVisible();
  await expect(map.getByRole("img", { name: "Your location" })).toBeVisible();
  await expect(marker).toBeVisible();
  await expect(map).toContainText("Buyer-centered 2 km context");
  await expect(map).not.toContainText(/Dimas|Rp|Under 1 km|Trust Summary|exact distance/i);

  await map.getByRole("button", { name: "Pan map east" }).click();
  await map.getByRole("button", { name: "Zoom in" }).click();
  await expect(map.getByRole("status")).toContainText(
    "Viewport adjusted; discovery results unchanged",
  );
  await expect(marker).toHaveAccessibleName("Seller marker, DP, 4 Listings");
  await map.getByRole("button", { name: "Recenter map" }).click();
  await expect(map.getByRole("status")).toContainText("Buyer-centered view restored");

  await marker.click();
  const preview = page.getByRole("dialog", { name: "Seller Preview: Dimas P." });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole("button", { name: "Close Seller Preview" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(preview.getByRole("button", { name: "View item" }).last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(preview.getByRole("button", { name: "Close Seller Preview" })).toBeFocused();
  await expect(preview).toContainText("Dimas P.");
  await expect(preview).toContainText("Simulated as verified");
  await expect(preview).toContainText("Under 1 km");
  await expect(preview.getByRole("article")).toHaveCount(4);

  const viewport = page.viewportSize();
  const previewBox = await preview.boundingBox();
  expect(viewport).not.toBeNull();
  expect(previewBox).not.toBeNull();
  if (testInfo.project.name === "phone") {
    expect(previewBox!.y + previewBox!.height).toBeGreaterThan(viewport!.height - 2);
  } else {
    expect(previewBox!.x + previewBox!.width).toBeGreaterThan(viewport!.width - 2);
    expect(previewBox!.width).toBeLessThan(viewport!.width * 0.6);
  }

  await preview.getByRole("button", { name: "Close Seller Preview" }).click();
  await expect(marker).toBeFocused();
  await marker.click();
  await preview
    .getByRole("article", { name: "Seller Preview Listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  const listing = page.getByRole("region", { name: "Demo Listing" });
  await expect(
    listing.getByRole("heading", { name: "Handwoven rattan market basket" }),
  ).toBeVisible();
  await expect(listing).toBeFocused();
});

test("Map and List use one filtered result while only explicit view preference persists", async ({
  page,
}) => {
  await openDemo(page);

  const viewControl = page.getByRole("group", { name: "Discovery View" });
  await expect(viewControl.getByRole("button", { name: "Map" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await viewControl.getByRole("button", { name: "List" }).click();

  const list = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(list).toBeVisible();
  await expect(list.getByRole("article")).toHaveCount(20);
  await list.getByRole("button", { name: "Dimas P." }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Seller Preview: Dimas P." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Seller Preview" }).click();

  await page.getByLabel("Category Filter").selectOption("Books");
  await expect(list.getByRole("article")).toHaveCount(2);
  await viewControl.getByRole("button", { name: "Map" }).click();
  const filteredMap = page.getByRole("region", { name: "Seller discovery map" });
  await expect(
    filteredMap.getByRole("button", { name: "Seller marker, DP, 0 Listings" }),
  ).toHaveCount(0);
  await expect(filteredMap.locator(".seller-discovery-marker")).toHaveCount(2);
  await page.getByLabel("Simulated Browsing Location").selectOption("at-edge");
  await expect(page.getByRole("region", { name: "Seller discovery map" })).toContainText(
    "Buyer-centered 3 km context",
  );
  await viewControl.getByRole("button", { name: "List" }).click();
  await page.getByLabel("Simulated Browsing Location").selectOption("inside-edge");

  const stored = await page.evaluate(() => ({
    view: localStorage.getItem("jualokal.discovery-view"),
    keys: Object.keys(localStorage),
  }));
  expect(stored).toEqual({ view: "list", keys: ["jualokal.discovery-view"] });

  await page.getByRole("button", { name: /Exit demo/ }).click();
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await expect(viewControl.getByRole("button", { name: "List" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Simulated Browsing Location")).toHaveValue("current");
  await expect(page.getByLabel("Category Filter")).toHaveValue("All");
});

test("Map and List hide location-dependent content without a valid snapshot", async ({ page }) => {
  await openDemo(page);
  const location = page.getByLabel("Simulated Browsing Location");

  await location.selectOption("denied");
  await expect(page.getByRole("region", { name: "Seller discovery map" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Your location" })).toHaveCount(0);

  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "List" })
    .click();
  await expect(
    page.getByRole("region", { name: "Demo marketplace listings" }).getByRole("article"),
  ).toHaveCount(0);

  await location.selectOption("unavailable");
  await expect(page.getByRole("img", { name: "Your location" })).toHaveCount(0);
});
