import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectHorizontallyContained(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
}

test("public visitors understand Jualokal and reach real registration without seeing listings", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /secondhand goods, handed over nearby/i }),
  ).toBeVisible();
  await expect(page.getByText(/private, hyperlocal marketplace/i)).toBeVisible();
  await expect(page.getByText("Portable goods", { exact: true })).toBeVisible();
  await expect(page.getByText("Nearby handover", { exact: true })).toBeVisible();
  await expect(page.getByText("Protected location", { exact: true })).toBeVisible();

  const marketplacePaths = page.getByRole("region", { name: "Marketplace paths" });
  await expect(marketplacePaths.getByRole("heading", { name: "Buy nearby" })).toBeVisible();
  await expect(marketplacePaths.getByRole("heading", { name: "Sell nearby" })).toBeVisible();
  await expect(
    marketplacePaths.getByRole("link", { name: "Join Jualokal to buy" }),
  ).toBeVisible();
  await expect(
    marketplacePaths.getByRole("link", { name: "Join Jualokal to sell" }),
  ).toBeVisible();

  await expectHorizontallyContained(
    page,
    page.getByRole("img", { name: "Jualokal privacy promise" }),
  );
  await expectHorizontallyContained(page, marketplacePaths);
  for (const pathCard of await marketplacePaths.locator("article").all()) {
    await expectHorizontallyContained(page, pathCard);
  }

  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
  await expect(page.getByText(/Rp\s?\d/)).toHaveCount(0);

  await page.getByRole("link", { name: "See listing" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("anonymous visitors cannot open the member dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("main", { name: "Verified Member marketplace" })).toHaveCount(0);
});

test("Demo Mode persists in the URL and stays clearly fictional after refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();

  await expect(page).toHaveURL(/[?&]demo=1(?:&|$)/);
  const notice = page.getByRole("status", { name: "Demo Mode simulation" });
  await expect(notice).toContainText(
    "Accounts, listing, location, identity status, and activity are fictional",
  );
  await expect(page.getByRole("region", { name: "Demo Buyer" })).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Demo Seller" })).toHaveCount(1);

  await page.reload();
  await expect(page).toHaveURL(/[?&]demo=1(?:&|$)/);
  await expect(page.getByRole("status", { name: "Demo Mode simulation" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(1);
});

test("public, auth, and Demo layouts avoid horizontal clipping", async ({ page }) => {
  for (const path of ["/", "/register", "/login", "/?demo=1"]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
