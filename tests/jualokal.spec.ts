import { expect, test } from "@playwright/test";

test("public visitors can understand Jualokal and start registration without seeing a listing", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /secondhand goods, handed over nearby/i }),
  ).toBeVisible();
  await expect(page.getByText(/private, hyperlocal marketplace/i)).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
  await expect(page.getByText(/Rp\s?\d/)).toHaveCount(0);

  await page.getByRole("link", { name: "See listing" }).click();

  await expect(page).toHaveURL(/\/register$/);
  const registration = page.getByRole("main");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(registration.getByLabel("Email")).toBeVisible();
  await expect(registration.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(registration.getByLabel("Confirm password")).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
});

test("anonymous visitors cannot open the member dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("main", { name: "Verified Member marketplace" })).toHaveCount(0);
});

test("registration keeps Identity Verification separate and simulated", async ({ page }) => {
  await page.goto("/register");

  const registration = page.getByRole("main");
  await expect(registration).toContainText("Identity verification remains simulated");
  await expect(
    registration.locator('input[type="file"], input[type="tel"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Identity Verification walkthrough" }),
  ).toHaveCount(0);
});

test("Demo Mode opens without private information and stays clearly fictional", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();

  const notice = page.getByRole("status", { name: "Demo Mode simulation" });
  await expect(notice).toContainText(
    "Accounts, listing, location, identity status, and activity are fictional",
  );
  await expect(notice).toContainText(
    "Fictional pre-verified accounts enter directly; normal admission uses the separate simulated Identity Verification walkthrough",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo Buyer" })).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Demo Seller" })).toHaveCount(1);

  const listing = page.getByRole("region", { name: "Demo Listing" });
  await expect(listing).toHaveCount(1);
  await expect(listing.getByText(/Rp\s?\d{1,3}(\.\d{3})+/)).toBeVisible();
  await expect(listing.getByText(/\d+(\.\d+)?\s?(m|km)/)).toBeVisible();
  await expect(listing.getByText(/\b\d{2}:\d{2}\sWIB\b/)).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0);
});

test("public and Demo layouts remain usable without horizontal clipping", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "See listing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore Demo Mode" })).toBeVisible();

  const publicOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(publicOverflow).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await expect(page.getByRole("heading", { name: "Nearby in Bandung" })).toBeVisible();

  const demoOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(demoOverflow).toBeLessThanOrEqual(1);
});

test("registration and login remain usable without horizontal clipping", async ({ page }) => {
  for (const path of ["/register", "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("main")).toBeVisible();
  }
});
