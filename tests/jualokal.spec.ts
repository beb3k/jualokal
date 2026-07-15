import { expect, test, type Page } from "@playwright/test";

async function enterVerifiedMember(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin registration" }).click();
  await page.getByRole("button", { name: "Continue to simulated verification" }).click();

  const verification = page.getByRole("dialog", {
    name: "Identity Verification walkthrough",
  });
  await verification
    .getByRole("checkbox", { name: /I understand this is a simulation/i })
    .check();
  await verification.getByRole("button", { name: "Complete simulated verification" }).click();
}

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

test("public access stays blocked during the simulated Identity Verification walkthrough", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("main", { name: "Verified Member marketplace" })).toHaveCount(0);
  await page.getByRole("button", { name: "Begin registration" }).click();
  await page.getByRole("button", { name: "Continue to simulated verification" }).click();

  const verification = page.getByRole("dialog", {
    name: "Identity Verification walkthrough",
  });
  await expect(verification).toBeVisible();
  await expect(
    verification.getByText("Identity Verification walkthrough · Simulation", { exact: true }),
  ).toBeVisible();
  await expect(verification.getByText(/not a real identity check/i)).toBeVisible();
  await expect(
    verification.getByText(
      /real ID, selfies, biometrics, passwords, payment methods, or other sensitive evidence/i,
    ),
  ).toBeVisible();
  await expect(
    verification.locator('input[type="file"], input[type="password"], input[type="tel"]'),
  ).toHaveCount(0);
  await expect(page.getByRole("main", { name: "Verified Member marketplace" })).toHaveCount(0);

  await verification.getByRole("button", { name: "Close verification" }).click();
  await expect(page.getByRole("button", { name: "Begin registration" })).toBeVisible();
  await expect(page.getByRole("main", { name: "Verified Member marketplace" })).toHaveCount(0);
});

test("completed verification creates a buyer-only Verified Member", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin registration" }).click();
  await page.getByRole("button", { name: "Continue to simulated verification" }).click();

  const verification = page.getByRole("dialog", {
    name: "Identity Verification walkthrough",
  });
  const completeVerification = verification.getByRole("button", {
    name: "Complete simulated verification",
  });

  await expect(completeVerification).toBeDisabled();
  await expect(page.getByRole("main", { name: "Verified Member marketplace" })).toHaveCount(0);
  await verification
    .getByRole("checkbox", { name: /I understand this is a simulation/i })
    .check();
  await expect(completeVerification).toBeEnabled();
  await completeVerification.click();

  const marketplace = page.getByRole("main", { name: "Verified Member marketplace" });
  await expect(marketplace).toBeVisible();
  await expect(marketplace.getByRole("heading", { name: "Verified Member" })).toBeVisible();
  await expect(marketplace.getByText("Browse enabled", { exact: true })).toBeVisible();
  await expect(marketplace.getByText("Buy enabled", { exact: true })).toBeVisible();

  const sellerActivation = marketplace.getByRole("region", { name: "Seller Activation" });
  await expect(sellerActivation).toContainText("Not activated");
  await expect(sellerActivation.getByRole("button", { name: "Activate selling" })).toBeVisible();
  await expect(page.getByRole("button", { name: /create listing|new listing|checkout|pay/i })).toHaveCount(0);
});

test("Public Identity exposes only the permitted name and Trust Summary", async ({ page }) => {
  await enterVerifiedMember(page);

  const publicIdentity = page.getByRole("region", { name: "Public Identity" });
  await expect(publicIdentity).toBeVisible();
  await expect(publicIdentity.getByRole("heading", { name: "Maya S." })).toBeVisible();
  await expect(publicIdentity.getByText(/profile picture/i)).toContainText("Optional · Not added");
  await expect(publicIdentity.getByText(/single name/i)).toBeVisible();

  const trustSummary = publicIdentity.getByRole("region", { name: "Trust Summary" });
  await expect(trustSummary.getByText("Simulated as verified", { exact: true })).toBeVisible();
  await expect(trustSummary.getByText("0 successful handovers", { exact: true })).toBeVisible();
  await expect(trustSummary.getByText("0 different partners", { exact: true })).toBeVisible();
  await expect(trustSummary.getByText("Verified Buyer", { exact: true })).toBeVisible();

  const publicText = await publicIdentity.innerText();
  expect(publicText).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  expect(publicText).not.toMatch(/\+62[\s-]?\d{8,}/);
  expect(publicText).not.toMatch(/\b\d{16}\b/);
  expect(publicText).not.toMatch(/-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/);
  expect(publicText).not.toMatch(/strike reason|safety report detail|dispute detail/i);
});

test("Seller Activation stays separate and requires all three private confirmations", async ({
  page,
}) => {
  await enterVerifiedMember(page);

  const sellerActivation = page.getByRole("region", { name: "Seller Activation" });
  await expect(sellerActivation).toContainText("Not activated");
  await sellerActivation.getByRole("button", { name: "Activate selling" }).click();

  const activation = page.getByRole("dialog", { name: "Seller Activation" });
  await expect(activation).toBeVisible();
  await expect(activation.getByText(/protected Home Anchor/i)).toBeVisible();
  await expect(activation.getByText(/simulated payout destination/i)).toBeVisible();
  await expect(activation.getByText(/selling and handover rules/i)).toBeVisible();
  await expect(activation.getByText(/no real payout details or money/i)).toBeVisible();
  await expect(activation.getByText(/exact Home Anchor is never shown/i)).toBeVisible();

  const completeActivation = activation.getByRole("button", {
    name: "Complete Seller Activation",
  });
  await expect(completeActivation).toBeDisabled();
  await activation
    .getByRole("checkbox", { name: "Use a fictional protected Home Anchor" })
    .check();
  await activation
    .getByRole("checkbox", { name: "Confirm a simulated payout destination" })
    .check();
  await expect(completeActivation).toBeDisabled();
  await expect(sellerActivation).toContainText("Not activated");

  await activation
    .getByRole("checkbox", { name: /accept Jualokal's selling and handover rules/i })
    .check();
  await expect(completeActivation).toBeEnabled();
  await completeActivation.click();

  await expect(sellerActivation).toContainText("Seller Activation complete");
  await expect(sellerActivation).toContainText("Selling enabled");
  await expect(sellerActivation).toContainText("No manual approval");
  await expect(page.getByRole("button", { name: /create listing|new listing/i })).toHaveCount(0);
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

test("verification, member access, and Seller Activation stay usable in the viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin registration" }).click();
  await page.getByRole("button", { name: "Continue to simulated verification" }).click();

  const verification = page.getByRole("dialog", {
    name: "Identity Verification walkthrough",
  });
  const completeVerification = verification.getByRole("button", {
    name: "Complete simulated verification",
  });
  await completeVerification.scrollIntoViewIfNeeded();
  await expect(completeVerification).toBeVisible();
  await verification
    .getByRole("checkbox", { name: /I understand this is a simulation/i })
    .check();
  await completeVerification.click();

  await expect(page.getByRole("region", { name: "Public Identity" })).toBeVisible();
  const memberOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(memberOverflow).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Activate selling" }).click();
  const activation = page.getByRole("dialog", { name: "Seller Activation" });
  const completeActivation = activation.getByRole("button", {
    name: "Complete Seller Activation",
  });
  await completeActivation.scrollIntoViewIfNeeded();
  await expect(completeActivation).toBeVisible();

  const box = await completeActivation.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  const activationOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(activationOverflow).toBeLessThanOrEqual(1);
});
