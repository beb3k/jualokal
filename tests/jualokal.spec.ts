import { expect, test } from "@playwright/test";

test("public visitors can understand Jualokal and begin registration without seeing a listing", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /secondhand goods, handed over nearby/i }),
  ).toBeVisible();
  await expect(page.getByText(/private, hyperlocal marketplace/i)).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
  await expect(page.getByText(/Rp\s?\d/)).toHaveCount(0);

  await page.getByRole("button", { name: "Begin registration" }).click();

  const registration = page.getByRole("dialog", { name: "Begin registration" });
  await expect(registration).toBeVisible();
  await expect(registration.getByText(/identity verification comes next/i)).toBeVisible();
  await expect(registration.locator("input")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo Listing" })).toHaveCount(0);
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
  await expect(page.getByRole("region", { name: "Demo Buyer" })).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Demo Seller" })).toHaveCount(1);
  const listing = page.getByRole("region", { name: "Demo Listing" });
  await expect(listing).toHaveCount(1);
  await expect(listing.getByText(/Rp\s?\d{1,3}(\.\d{3})+/)).toBeVisible();
  await expect(listing.getByText(/\d+(\.\d+)?\s?(m|km)/)).toBeVisible();
  await expect(listing.getByText(/\b\d{2}:\d{2}\sWIB\b/)).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const box = await notice.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
});

test("the public and demo layouts remain usable without horizontal clipping", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Begin registration" })).toBeVisible();
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
