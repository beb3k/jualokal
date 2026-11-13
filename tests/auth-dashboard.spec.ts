import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

// These tests run against the Firebase Emulator Suite (`npm test` starts it).
const AUTH_EMULATOR = "http://127.0.0.1:9099";
const FIRESTORE_DOCUMENTS =
  "http://127.0.0.1:8080/v1/projects/demo-jualokal/databases/(default)/documents";

function uniqueEmail(prefix: string, projectName: string) {
  return `${prefix}-${projectName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function createEmulatorUser(request: APIRequestContext, email: string) {
  const response = await request.post(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    { data: { email, password: "correct-password", returnSecureToken: true } },
  );
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { idToken: string; localId: string };
  return { idToken: body.idToken, memberId: body.localId };
}

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

  // The first Auth emulator round trip on a cold dev server can be slow.
  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.", {
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/login$/);
  expect(page.url()).not.toContain("not-a-member@example.com");
  expect(page.url()).not.toContain("incorrect-password");
});

test("login offers Google without collecting extra identity evidence", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.locator('input[type="file"], input[type="tel"]')).toHaveCount(0);
});

test("Google login opens the Firebase Google sign-in popup", async ({ page }) => {
  await page.goto("/login");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const popup = await popupPromise;

  await expect.poll(() => popup.url(), { timeout: 15_000 }).toContain("providerId=google.com");
  await popup.close();
  // Firebase notices a closed popup by polling, which can take several seconds.
  await expect(page.getByRole("alert")).toHaveText("Google sign-in was cancelled.", {
    timeout: 15_000,
  });
});

test("registration collects account credentials but no identity evidence", async ({ page }) => {
  await page.goto("/register");

  const registration = page.getByRole("main");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(registration.getByLabel("Email")).toBeVisible();
  await expect(registration.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(registration.getByLabel("Confirm password")).toBeVisible();
  await expect(
    registration.locator('input[type="file"], input[type="tel"]'),
  ).toHaveCount(0);
  await expect(registration).toContainText("Identity verification remains simulated");
});

test("registration rejects mismatched passwords without sending credentials", async ({ page }) => {
  await page.goto("/register");

  await page.getByLabel("Email").fill("new-member@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByLabel("Confirm password").fill("different-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("alert")).toHaveText("Passwords do not match.");
  await expect(page).toHaveURL(/\/register$/);
  expect(page.url()).not.toContain("new-member@example.com");
  expect(page.url()).not.toContain("correct-password");
});

test("landing See listing CTA opens the registration page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See listing" }).click();

  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("landing does not host authenticated onboarding", async ({ page }) => {
  await page.goto("/?onboarding=verify");

  await expect(
    page.getByRole("heading", { name: "Identity Verification walkthrough" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Secondhand goods, handed over nearby." })).toBeVisible();
});

test("landing login CTA opens the real login page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Log in", exact: true }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("a member registers, completes onboarding, signs out, and signs back in", async ({
  page,
}, testInfo) => {
  const email = uniqueEmail("member", testInfo.project.name);

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByLabel("Confirm password").fill("correct-password");
  await page.getByRole("button", { name: "Create account" }).click();

  // Session creation waits on the emulators and the first dashboard compile.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: "Identity Verification walkthrough" }),
  ).toBeVisible();
  expect(page.url()).not.toContain("correct-password");

  const completeVerification = page.getByRole("button", {
    name: "Complete simulated verification",
  });
  // Retry until hydration has attached the controlled inputs. Values typed
  // before hydration stay in the DOM but not in React state, so reset them first.
  await expect(async () => {
    await page.getByLabel("Public first name").fill("");
    await page.getByLabel("Public first name").fill("Rani");
    await page.getByLabel("Last name (optional)").fill("");
    await page.getByLabel("Last name (optional)").fill("Wijaya");
    await page.getByRole("checkbox").setChecked(false);
    await page.getByRole("checkbox").setChecked(true);
    await expect(completeVerification).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await completeVerification.click();

  const signOutButton = page.getByRole("button", { name: "Sign out" });
  await expect(signOutButton).toBeVisible();
  await expect(page.getByText("Rani W").first()).toBeVisible();

  await signOutButton.click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Session creation waits on the emulators and the first dashboard compile.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByText("Rani W").first()).toBeVisible();
});

test("Firestore rules keep member profiles private to their owner", async ({
  request,
}, testInfo) => {
  const owner = await createEmulatorUser(request, uniqueEmail("owner", testInfo.project.name));
  const other = await createEmulatorUser(request, uniqueEmail("other", testInfo.project.name));
  const profileUrl = `${FIRESTORE_DOCUMENTS}/member_profiles/${owner.memberId}`;
  const profile = {
    fields: {
      member_id: { stringValue: owner.memberId },
      identity_verification_status: { stringValue: "unverified" },
      is_restricted: { booleanValue: false },
    },
  };

  // The emulator's "owner" token bypasses rules, standing in for the Admin SDK.
  const seeded = await request.patch(profileUrl, {
    data: profile,
    headers: { Authorization: "Bearer owner" },
  });
  expect(seeded.ok()).toBe(true);

  const anonymousRead = await request.get(profileUrl);
  expect(anonymousRead.status()).toBe(403);

  const otherMemberRead = await request.get(profileUrl, {
    headers: { Authorization: `Bearer ${other.idToken}` },
  });
  expect(otherMemberRead.status()).toBe(403);

  const ownRead = await request.get(profileUrl, {
    headers: { Authorization: `Bearer ${owner.idToken}` },
  });
  expect(ownRead.status()).toBe(200);

  const ownWrite = await request.patch(`${profileUrl}?updateMask.fieldPaths=is_restricted`, {
    data: { fields: { is_restricted: { booleanValue: true } } },
    headers: { Authorization: `Bearer ${owner.idToken}` },
  });
  expect(ownWrite.status()).toBe(403);
});
