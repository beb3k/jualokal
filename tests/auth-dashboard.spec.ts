import { expect, test } from "@playwright/test";

test("login scaffold validates credentials and opens dashboard preview", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email").fill("member@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard\??$/);
  expect(page.url()).not.toContain("member@example.com");
  expect(page.url()).not.toContain("password123");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("dashboard exposes the marketplace shell without horizontal clipping", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByText("Welcome back, Dimas.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Marketplace summary" })).toBeVisible();

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(contentWidth).toBeLessThanOrEqual(viewportWidth);
});
