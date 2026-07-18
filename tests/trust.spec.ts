import { expect, test, type Locator, type Page } from "@playwright/test";

async function openTrustDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();

  return page.getByRole("region", { name: "Tier Progress" });
}

async function recordSuccess(page: Page, sellerIndex: number) {
  await page
    .getByRole("combobox", { name: "Qualifying Demo Seller" })
    .selectOption({ index: sellerIndex });
  await page.getByRole("button", { name: "Record successful handover" }).click();
}

async function expectTier(
  progress: Locator,
  tier: "Verified" | "Reliable" | "Trusted",
  capacity: 1 | 3 | 5,
) {
  await expect(progress).toContainText(new RegExp(`${tier}(?: Buyer)?`, "i"));
  await expect(progress).toContainText(
    new RegExp(`${capacity} active Purchase Commitment`, "i"),
  );
}

test("different sellers earn Reliable and Trusted capacity while a repeat seller does not", async ({
  page,
}) => {
  const progress = await openTrustDemo(page);

  await recordSuccess(page, 0);
  await recordSuccess(page, 0);

  await expect(progress).toContainText(/2 successful handovers/i);
  await expect(progress).toContainText(/1 (?:qualifying )?different (?:Demo )?seller/i);
  await expectTier(progress, "Verified", 1);

  await recordSuccess(page, 1);
  await recordSuccess(page, 2);

  await expect(progress).toContainText(/3 (?:qualifying )?different (?:Demo )?sellers/i);
  await expectTier(progress, "Reliable", 3);

  await recordSuccess(page, 3);
  await recordSuccess(page, 4);

  await expect(progress).toContainText(/5 (?:qualifying )?different (?:Demo )?sellers/i);
  await expectTier(progress, "Trusted", 5);
});

test("a first strike resets and warns while a second overlapping strike suspends both roles", async ({
  page,
}) => {
  const progress = await openTrustDemo(page);
  for (const sellerIndex of [0, 1, 2]) {
    await recordSuccess(page, sellerIndex);
  }
  await expectTier(progress, "Reliable", 3);

  await page.getByRole("button", { name: "Add Reliability Strike" }).click();

  await expectTier(progress, "Verified", 1);
  await expect(progress).toContainText(/1 active Reliability Strike/i);
  await expect(progress).toContainText(/warning/i);

  const publicSummary = page.getByRole("region", { name: "Trust Summary preview" });
  await expect(publicSummary.getByText(/simulated as verified/i)).toBeVisible();
  await expect(publicSummary.getByText("3 successful handovers", { exact: true })).toBeVisible();
  await expect(publicSummary.getByText("3 different partners", { exact: true })).toBeVisible();
  await expect(publicSummary.getByRole("heading", { name: /Verified(?: Buyer)?/i })).toBeVisible();

  const privateText = await progress.innerText();
  expect(privateText).toMatch(/strike/i);
  const publicTextAfterFirstStrike = await publicSummary.innerText();
  expect(publicTextAfterFirstStrike).not.toMatch(
    /blocker|strike|expiry|appeal|suspend|enforcement|reason/i,
  );

  await page.getByRole("button", { name: "Add Reliability Strike" }).click();

  await expect(progress).toContainText(/2 active Reliability Strikes/i);
  await expect(progress).toContainText(
    /buying and selling (?:are )?(?:suspended|unavailable)/i,
  );
  const publicTextAfterSecondStrike = await publicSummary.innerText();
  expect(publicTextAfterSecondStrike).not.toMatch(
    /blocker|strike|expiry|appeal|suspend|enforcement|reason/i,
  );
});

test("a Reliability Strike remains active until its exact 30-day expiry", async ({ page }) => {
  const progress = await openTrustDemo(page);
  for (const sellerIndex of [0, 1, 2]) {
    await recordSuccess(page, sellerIndex);
  }
  await page.getByRole("button", { name: "Add Reliability Strike" }).click();

  await page
    .getByRole("button", { name: "Advance to one millisecond before strike expiry" })
    .click();
  await expect(progress).toContainText(/1 active Reliability Strike/i);
  await expect(progress).toContainText(/warning/i);
  await expectTier(progress, "Verified", 1);

  await page.getByRole("button", { name: "Advance to exact strike expiry" }).click();
  await expect(progress).toContainText(/no active Reliability Strikes/i);
  await expect(progress).toContainText(/0 (?:of|\/) 3/i);
  await expect(progress).not.toContainText(/warning/i);
  await expectTier(progress, "Verified", 1);
});

test("clearing an ordinary issue restarts progress and permits re-earning", async ({ page }) => {
  const progress = await openTrustDemo(page);
  for (const sellerIndex of [0, 1, 2]) {
    await recordSuccess(page, sellerIndex);
  }
  await expectTier(progress, "Reliable", 3);

  await page.getByRole("button", { name: "Add Reliability Strike" }).click();
  await page.getByRole("button", { name: "Clear ordinary issue" }).click();

  await expect(progress).toContainText(/no active (?:issues|Reliability Strikes)/i);
  await expect(progress).toContainText(/0 (?:of|\/) 3/i);
  await expectTier(progress, "Verified", 1);

  for (const sellerIndex of [0, 1, 2]) {
    await recordSuccess(page, sellerIndex);
  }
  await expect(progress).toContainText(/3 (?:qualifying )?different (?:Demo )?sellers/i);
  await expectTier(progress, "Reliable", 3);
});
