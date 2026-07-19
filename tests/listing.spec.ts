import { expect, test } from "@playwright/test";

test("seller sees browser-visible publication failures before a listing can be published", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();

  await page.getByLabel("Title").fill("");
  await page.getByLabel("Detail photo", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Publish listing" }).click();

  const errors = page.getByRole("alert", { name: "Listing publication errors" });
  await expect(errors).toContainText("Add a title");
  await expect(errors).toContainText("Add at least three actual-item photos");
  await expect(page.getByText("Listing published")).toHaveCount(0);
});

test("seller cannot publish an unsafe or incompletely disclosed item", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();

  await page.getByLabel("Category").selectOption("Food");
  await page.getByLabel("Condition Grade").selectOption("");
  await page.getByLabel("Item type").selectOption("Bundle");
  await page.getByLabel("This item has known defects").check();
  await page.getByLabel("Defect photo (optional supplement)").check();
  await page.getByLabel("Condition Disclosure").fill("No known defects.");
  await page.getByLabel("Complete-item photo").uncheck();
  await page.getByLabel("Photos exclude private details and location metadata").uncheck();
  await page.getByRole("button", { name: "Publish listing" }).click();

  const errors = page.getByRole("alert", { name: "Listing publication errors" });
  await expect(errors).toContainText("Choose an approved category");
  await expect(errors).toContainText("Choose one of the five Condition Grades");
  await expect(errors).toContainText("List one portable item only");
  await expect(errors).toContainText(
    "Describe every known defect in writing; a photo cannot replace it",
  );
  await expect(errors).toContainText("Include at least one complete-item photo");
  await expect(errors).toContainText(
    "Confirm photos exclude private details and location metadata",
  );
  await expect(page.getByText("Listing published")).toHaveCount(0);
});

test("publication requires complete content and blocks every excluded item type", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();

  await page.getByLabel("Fixed rupiah price").fill("0");
  await page.getByLabel("Description").fill("");
  await page.getByLabel("Condition Disclosure").fill("");
  await page.getByLabel("Measurements or specifications").fill("");
  await page.getByRole("button", { name: "Publish listing" }).click();

  const errors = page.getByRole("alert", { name: "Listing publication errors" });
  await expect(errors).toContainText("Add a fixed rupiah price");
  await expect(errors).toContainText("Add a description");
  await expect(errors).toContainText("Add a written Condition Disclosure");
  await expect(errors).toContainText("Add relevant measurements or specifications");

  for (const excludedItemType of [
    "Bundle",
    "Food",
    "Prohibited goods",
    "Requires a vehicle, hired help, or special equipment",
  ]) {
    await page.getByLabel("Item type").selectOption(excludedItemType);
    await page.getByRole("button", { name: "Publish listing" }).click();
    await expect(errors).toContainText("List one portable item only");
  }
});

test("seller publishes one complete portable-item listing for buyer discovery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();

  await page.getByLabel("Title").fill("Compact desk fan");
  await page.getByLabel("Category").selectOption("Small electronics");
  await page.getByLabel("Fixed rupiah price").fill("275000");
  await page.getByLabel("Condition Grade").selectOption("Very Good");
  await page
    .getByLabel("Description")
    .fill("A quiet secondhand fan for a study desk, with three speed settings.");
  await page.getByLabel("This item has known defects").check();
  await page
    .getByLabel("Condition Disclosure")
    .fill("A light scuff on the base is shown in the defect photo.");
  await page
    .getByLabel("Measurements or specifications")
    .fill("30 cm high × 22 cm wide; 220 V; 1.4 m cable.");
  await page.getByLabel("Second detail photo").uncheck();
  await page.getByLabel("Defect photo (optional supplement)").check();
  await page.getByRole("button", { name: "Publish listing" }).click();

  await expect(page.getByText("Listing published")).toBeVisible();
  await page.getByRole("button", { name: "Buyer discovery" }).click();

  const listing = page.getByRole("region", { name: "Demo Listing" });
  await expect(listing.getByRole("heading", { name: "Compact desk fan" })).toBeVisible();
  await expect(listing.getByText("Rp 275.000")).toBeVisible();
  await expect(listing.getByText("Very Good")).toBeVisible();
  await expect(listing.getByText(/30 cm high × 22 cm wide/)).toBeVisible();
  await expect(listing.getByText(/light scuff on the base/i)).toBeVisible();
  await expect(listing.getByText("3 item photos")).toBeVisible();
  const photos = listing.getByRole("region", { name: "Published item photos" });
  await expect(photos.getByRole("img")).toHaveCount(3);
  await expect(photos).toContainText("Complete-item view");
  await expect(photos).toContainText("Detail view");
  await expect(photos).toContainText("Defect view");
  await expect(photos).not.toContainText("Second detail view");
  await expect(listing.getByText(/Synthetic fallback image/)).toBeVisible();
});

test("seller edits, deactivates, and marks a cross-listed item unavailable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();

  await page.getByLabel("Title").fill("Edited rattan basket");
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.getByRole("button", { name: "Deactivate listing" }).click();
  await expect(page.getByText("Listing deactivated")).toBeVisible();

  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
  await expect(page.getByText(/seller deactivated this listing/i)).toBeVisible();

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.getByRole("button", { name: "Mark cross-listed item unavailable" }).click();
  await expect(page.getByText("Cross-listed item marked unavailable")).toBeVisible();

  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
  await expect(page.getByText(/cross-listed item is unavailable/i)).toBeVisible();

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expect(
    page.getByRole("region", { name: "Demo Listing" }).getByRole("heading", {
      name: "Edited rattan basket",
    }),
  ).toBeVisible();
});

test("structured questions are answered only through a shared listing update", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();

  const question = page.getByLabel("Structured question");
  await expect(question.locator("option")).toHaveText([
    "Condition",
    "Measurements",
    "Included parts",
    "Compatibility",
    "Additional photos",
  ]);
  await question.selectOption("Measurements");
  await page.getByRole("button", { name: "Request listing update" }).click();
  await expect(page.getByText(/Request sent: Measurements/i)).toBeVisible();
  await expect(page.getByText(/free-form chat/i)).toBeVisible();
  await expect(page.getByPlaceholder(/message|contact|offer|price/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Seller workspace" }).click();
  const request = page.getByRole("region", { name: "Structured Question Request" });
  await expect(request).toContainText("Measurements");
  await page.getByRole("button", { name: "Update shared listing" }).click();
  await expect(
    page.getByRole("alert", { name: "Listing publication errors" }),
  ).toContainText("Change at least one shared listing detail to answer this request");
  await expect(request).toBeVisible();
  await page
    .getByLabel("Measurements or specifications")
    .fill("42 cm wide × 31 cm high; approximately 650 g.");
  await page.getByRole("button", { name: "Update shared listing" }).click();

  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expect(page.getByText(/Shared listing updated for Measurements/i)).toBeVisible();
  await expect(page.getByText(/42 cm wide × 31 cm high/)).toBeVisible();
});

test("discovery enforces location availability, privacy, and distance boundaries", async ({
  page,
}) => {
  await page.goto("/?discoveryRadiusKm=20");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();

  const location = page.getByLabel("Simulated Browsing Location");
  const refresh = page.getByRole("button", { name: "Refresh nearby listings" }).first();
  const listing = page.getByRole("region", { name: "Demo Listing" });
  const locationLabels = await location.locator("option").allTextContents();
  expect(locationLabels.join(" ")).not.toMatch(/1\.99|2\.00|2\.01|10\.00|10\.01/);
  const locationValues = await location.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(locationValues).not.toContainEqual(expect.stringMatching(/^\d+(?:\.\d+)?$/));

  await location.selectOption("inside-edge");
  await refresh.click();
  await expect(listing).toBeVisible();
  await expect(listing.getByText("1-2 km", { exact: true })).toBeVisible();
  await expect(listing).not.toContainText(/\b\d+(?:\.\d+)?\s*(?:m|km) away\b/i);

  await location.selectOption("at-edge");
  await refresh.click();
  await expect(listing).toBeVisible();

  await location.selectOption("outside-edge");
  await refresh.click();
  await expect(listing).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No nearby listings yet" })).toBeVisible();

  await location.selectOption("denied");
  await refresh.click();
  await expect(listing).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Location permission denied" })).toBeVisible();

  await location.selectOption("unavailable");
  await refresh.click();
  await expect(listing).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Location unavailable" })).toBeVisible();

  await location.selectOption("at-maximum");
  await refresh.click();
  await expect(listing).toHaveCount(0);
  await location.selectOption("outside-maximum");
  await refresh.click();
  await expect(listing).toHaveCount(0);
  await expect(page.getByText(/permanent maximum is 10 km/i)).toBeVisible();

  const body = page.locator("body");
  await expect(body).toContainText("Current-use only; no buyer location history is retained");
  await expect(body).toContainText("Seller Home Anchors and convenience zones stay private");
  await expect(body).not.toContainText(/-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/);
  await expect(body).not.toContainText(/street address|home address|buyer location history:/i);
});

test("buyer and seller listing controls remain usable in the current viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await expect(page.getByLabel("Simulated Browsing Location")).toBeVisible();

  await page.getByRole("button", { name: "Seller workspace" }).click();
  const sellerPanel = page.getByRole("heading", { name: "Manage demo listing" }).locator("..");
  const panelBox = await sellerPanel.boundingBox();
  const titleBox = await page.getByLabel("Title").boundingBox();
  const descriptionBox = await page.getByLabel("Description").boundingBox();

  expect(panelBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(descriptionBox).not.toBeNull();
  expect(titleBox!.width).toBeGreaterThan(panelBox!.width * 0.7);
  expect(descriptionBox!.width).toBeGreaterThan(panelBox!.width * 0.7);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Publish listing" })).toBeVisible();
});
