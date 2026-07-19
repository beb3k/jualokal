import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected away from the member dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("login rejects invalid credentials without exposing them in the URL", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("not-a-member@example.com");
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.");
  await expect(page).toHaveURL(/\/login$/);
  expect(page.url()).not.toContain("not-a-member@example.com");
  expect(page.url()).not.toContain("incorrect-password");
});

test("login offers Google without collecting extra identity evidence", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.locator('input[type="file"], input[type="tel"]')).toHaveCount(0);
});

test("Google login starts the Supabase OAuth flow with the app callback", async ({ page }) => {
  await page.route("**/auth/v1/authorize?**", (route) => route.abort());
  await page.goto("/login");

  const authorizationRequest = page.waitForRequest((request) =>
    request.url().includes("/auth/v1/authorize?"),
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();

  const authorizationUrl = new URL((await authorizationRequest).url());
  expect(authorizationUrl.searchParams.get("provider")).toBe("google");
  expect(authorizationUrl.searchParams.get("redirect_to")).toBe(
    "http://localhost:5173/auth/callback",
  );
});

test("registration collects account credentials but no identity evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Register" }).click();

  const registration = page.getByRole("dialog", { name: "Begin registration" });
  await expect(registration.getByLabel("Email")).toBeVisible();
  await expect(registration.getByLabel("Password")).toBeVisible();
  await expect(
    registration.locator('input[type="file"], input[type="tel"]'),
  ).toHaveCount(0);
  await expect(registration).toContainText("Identity verification remains simulated");
});

test("landing login CTA opens the real login page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
