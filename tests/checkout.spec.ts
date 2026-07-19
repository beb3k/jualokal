import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "List" })
    .click();
}

async function purchaseNearbyListing(page: Page, title: string) {
  await page
    .getByRole("article", { name: `Nearby simulated listing: ${title}` })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  await page
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
}

test("buyer starts checkout and receives one visible five-minute Checkout Hold", async ({
  page,
}) => {
  await openDemo(page);

  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();

  const hold = page.getByRole("region", { name: "Checkout Hold" });
  await expect(hold).toContainText("Handwoven rattan market basket");
  await expect(hold).toContainText("05:00 remaining");
  await expect(hold).toContainText("Rp 185.000");
  await expect(hold).toContainText(/expires.*WIB/i);
  await expect(hold).toContainText(/simulation only/i);
});

test("every buyer can hold only one item at a time", async ({ page }) => {
  await openDemo(page);

  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();

  await page
    .getByRole("article", { name: "Nearby simulated listing: Batik cotton overshirt" })
    .getByRole("button", { name: "View item" })
    .click();

  const checkout = page.getByRole("region", { name: "Checkout" });
  await expect(checkout).toContainText(
    "You already have a Checkout Hold for Handwoven rattan market basket",
  );
  await expect(
    checkout.getByRole("button", { name: "Start 5-minute Checkout Hold" }),
  ).toBeDisabled();
});

test("the item is released at the exact five-minute expiry with no commitment", async ({
  page,
}) => {
  await openDemo(page);

  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();

  const hold = page.getByRole("region", { name: "Checkout Hold" });
  await hold
    .getByRole("button", { name: "Advance to one second before hold expiry" })
    .click();
  await expect(hold.getByRole("timer")).toHaveText("00:01 remaining");
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );

  await hold.getByRole("button", { name: "Advance to exact hold expiry" }).click();

  await expect(page.getByRole("region", { name: "Checkout" })).toBeVisible();
  await expect(page.getByText(
    "Checkout Hold expired. The item returned to sale",
  )).toBeVisible();
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
});

test("payment clicked after real expiry cannot announce or create success", async ({ page }) => {
  const startedAtMs = Date.now();
  await page.clock.install({ time: startedAtMs });
  await openDemo(page);

  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  const timeImmediatelyAfterHoldStarted = await page.evaluate(() => Date.now());

  const expiredPaymentButton = page
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Simulate successful payment" });
  const pauseNowMs = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(pauseNowMs + 1_000);
  await page.clock.setSystemTime(timeImmediatelyAfterHoldStarted + 5 * 60 * 1000 + 1);
  await expiredPaymentButton.click();

  await expect(page.getByText("Simulated payment succeeded")).toHaveCount(0);
  await expect(page.getByText("Simulated payment did not complete")).toBeVisible();
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
});

test("abandoning checkout returns the item to sale without a commitment", async ({ page }) => {
  await openDemo(page);

  const listing = page.getByRole("article", {
    name: "Nearby simulated listing: Handwoven rattan market basket",
  });
  await listing.getByRole("button", { name: "View item" }).click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  await page
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Abandon checkout" })
    .click();

  await expect(page.getByText("Checkout abandoned. The item returned to sale")).toBeVisible();
  await expect(page.getByRole("region", { name: "Checkout" })).toBeVisible();
  await expect(listing).toBeVisible();
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
});

test("failed simulated payment returns the item to sale without a commitment", async ({ page }) => {
  await openDemo(page);

  const listing = page.getByRole("article", {
    name: "Nearby simulated listing: Handwoven rattan market basket",
  });
  await listing.getByRole("button", { name: "View item" }).click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  await page
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Simulate failed payment" })
    .click();

  await expect(page.getByText("Simulated payment failed. The item returned to sale")).toBeVisible();
  await expect(page.getByRole("region", { name: "Checkout" })).toBeVisible();
  await expect(listing).toBeVisible();
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
});

test("competing buyers cannot both hold the same item and the holder stays private", async ({
  page,
}) => {
  await openDemo(page);

  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();

  await page
    .getByRole("combobox", { name: "Selected fictional account" })
    .selectOption("buyer-naufal");

  const checkout = page.getByRole("region", { name: "Checkout" });
  await expect(checkout).toContainText(
    "Checkout is already in progress for another buyer",
  );
  await expect(
    checkout.getByRole("button", { name: "Start 5-minute Checkout Hold" }),
  ).toBeDisabled();
  await expect(checkout).not.toContainText("Ayu R.");
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
});

test("a competing buyer sees one held Listing as unclaimable across Map, Preview, List, and detail", async ({
  page,
}) => {
  await openDemo(page);
  const list = page.getByRole("region", { name: "Demo marketplace listings" });
  const titlesBeforeHold = await list.locator("article h3").allTextContents();
  const basket = list.getByRole("article", {
    name: "Nearby simulated listing: Handwoven rattan market basket",
  });
  await basket.getByRole("button", { name: "View item" }).click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();

  const account = page.getByRole("combobox", { name: "Selected fictional account" });
  await account.selectOption("buyer-naufal");
  await expect(basket).toContainText("Checkout Hold · unavailable to claim");
  await expect(await list.locator("article h3").allTextContents()).toEqual(titlesBeforeHold);

  const detail = page.getByRole("region", { name: "Demo Listing" });
  await expect(detail).toContainText("Checkout Hold · unavailable to claim");
  const checkout = detail.getByRole("region", { name: "Checkout" });
  await expect(checkout).toContainText("Checkout is already in progress for another buyer");
  await expect(checkout).not.toContainText("Ayu R.");

  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "Map" })
    .click();
  const map = page.getByRole("region", { name: "Seller discovery map" });
  const marker = map.getByRole("button", {
    name: "Seller marker, DP, 4 Listings, 1 held Listing unavailable to claim",
  });
  await expect(marker).toBeVisible();
  await expect(map).not.toContainText("Ayu R.");
  await marker.click();

  const preview = page.getByRole("dialog", { name: "Seller Preview: Dimas P." });
  const previewBasket = preview.getByRole("article", {
    name: "Seller Preview Listing: Handwoven rattan market basket",
  });
  await expect(preview).toContainText("Under 1 km");
  await expect(previewBasket).toContainText("Checkout Hold · unavailable to claim");
  await expect(preview).not.toContainText("Ayu R.");
  await preview.getByRole("button", { name: "Close Seller Preview" }).click();

  await account.selectOption("buyer-ayu");
  await detail
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Advance to exact hold expiry" })
    .click();
  await account.selectOption("buyer-naufal");
  await expect(map.getByRole("button", {
    name: "Seller marker, DP, 4 Listings",
    exact: true,
  })).toBeVisible();
  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "List" })
    .click();
  await expect(basket.getByText("Checkout Hold · unavailable to claim")).toHaveCount(0);
  await expect(await list.locator("article h3").allTextContents()).toEqual(titlesBeforeHold);
});

test("successful purchase updates List, marker counts, and group membership together", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByLabel("Category Filter").selectOption("Accessories");
  const list = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(list.getByRole("article")).toHaveCount(4);

  await purchaseNearbyListing(page, "Woven pandan tote");
  await expect(list.getByText("Woven pandan tote")).toHaveCount(0);
  await expect(list.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "3 nearby simulated listings" })).toBeVisible();

  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "Map" })
    .click();
  const map = page.getByRole("region", { name: "Seller discovery map" });
  await expect(
    map.getByRole("button", { name: "Seller marker group, 2 Sellers, zoom to separate" }),
  ).toHaveCount(0);
  await expect(map.getByRole("button", { name: "Seller marker, SN, 1 Listing" })).toHaveCount(0);
  const bimaMarker = map.getByRole("button", { name: "Seller marker, BA, 1 Listing" });
  await expect(bimaMarker).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Seller marker group, 2 Sellers, choose Seller" }),
  ).toBeVisible();

  await bimaMarker.click();
  const preview = page.getByRole("dialog", { name: "Seller Preview: Bima A." });
  await expect(preview.getByRole("article")).toHaveCount(1);
  await expect(preview).toContainText("Canvas futsal shoe bag");
});

test("a Seller cannot reach checkout for an owned Listing through discovery", async ({ page }) => {
  await openDemo(page);
  const account = page.getByRole("combobox", { name: "Selected fictional account" });
  await account.selectOption("seller-dimas");
  await page.getByRole("button", { name: "View discovery as selected Seller" }).click();

  const list = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(list.getByText("Handwoven rattan market basket")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo Listing" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Start 5-minute Checkout Hold" })).toHaveCount(0);
});

test("a Checkout Hold locks the seller's listing details and sale actions", async ({ page }) => {
  await openDemo(page);

  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();

  await page
    .getByRole("combobox", { name: "Selected fictional account" })
    .selectOption("seller-dimas");

  const workspace = page.getByRole("region", { name: "Manage demo listing" });
  await expect(workspace).toContainText(
    "Checkout Hold active. Editing and sale actions are locked",
  );
  await expect(page.getByLabel("Title")).toBeDisabled();
  await expect(page.getByLabel("Category")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Publish listing" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Deactivate listing" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Mark cross-listed item unavailable" }),
  ).toBeDisabled();

  await page.getByRole("combobox", { name: "Selected seller listing" }).selectOption(
    "listing-02",
  );
  await expect(page.getByLabel("Title")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Deactivate listing" })).toBeEnabled();
});

test("successful simulated payment freezes the terms, holds Escrow, and removes discovery", async ({
  page,
}) => {
  await openDemo(page);

  const listing = page.getByRole("article", {
    name: "Nearby simulated listing: Handwoven rattan market basket",
  });
  await listing.getByRole("button", { name: "View item" }).click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  await page
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Simulate successful payment" })
    .click();

  const commitments = page.getByRole("region", { name: "Purchase Commitments" });
  const commitment = commitments.getByRole("article", {
    name: "Purchase Commitment: Handwoven rattan market basket",
  });
  await expect(commitments).toContainText("1 of 1 active Purchase Commitments");
  await expect(commitment).toContainText("Purchase Snapshot - unchangeable");
  await expect(commitment).toContainText("Dimas P. - Fictional Demo Seller");
  await expect(commitment).toContainText("A lightweight secondhand Pasar Cihapit basket");
  await expect(commitment).toContainText("Light surface wear near the rim");
  await expect(commitment).toContainText("Good");
  await expect(commitment).toContainText("42 cm wide x 30 cm high");
  await expect(commitment).toContainText("Item and all parts shown in the fictional photos");
  await expect(commitment).toContainText("Complete-item view");
  await expect(commitment).toContainText("Detail view");
  await expect(commitment).toContainText("Second detail view");
  await expect(commitment).toContainText("Buyer total: Rp 185.000");
  await expect(commitment).toContainText("Seller payout: Rp 185.000");
  await expect(commitment).toContainText("Simulated Escrow: Held");

  await expect(listing).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo Listing" })).toBeHidden();

  await page
    .getByRole("combobox", { name: "Selected fictional account" })
    .selectOption("seller-dimas");
  await expect(page.getByText("Purchase Commitment active. This listing is locked")).toBeVisible();
  await expect(page.getByLabel("Title")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Deactivate listing" })).toBeDisabled();
});

test("Verified, Reliable, and Trusted Buyers are limited to 1, 3, and 5 commitments", async ({
  page,
}) => {
  test.slow();
  await openDemo(page);
  const account = page.getByRole("combobox", { name: "Selected fictional account" });

  await purchaseNearbyListing(page, "Handwoven rattan market basket");
  await page
    .getByRole("article", { name: "Nearby simulated listing: Batik cotton overshirt" })
    .getByRole("button", { name: "View item" })
    .click();
  let checkout = page.getByRole("region", { name: "Checkout" });
  await expect(checkout).toContainText("Verified Buyer limit of 1 active Purchase Commitment reached");
  await expect(checkout.getByRole("button", { name: "Start 5-minute Checkout Hold" })).toBeDisabled();

  await account.selectOption("buyer-naufal");
  for (const title of [
    "Batik cotton overshirt",
    "Mini angklung set",
    "Ceramic sambal bowls",
  ]) {
    await purchaseNearbyListing(page, title);
  }
  await page
    .getByRole("article", { name: "Nearby simulated listing: Woven pandan tote" })
    .getByRole("button", { name: "View item" })
    .click();
  checkout = page.getByRole("region", { name: "Checkout" });
  await expect(checkout).toContainText("Reliable Buyer limit of 3 active Purchase Commitments reached");
  await expect(checkout.getByRole("button", { name: "Start 5-minute Checkout Hold" })).toBeDisabled();

  await account.selectOption("buyer-lestari");
  for (const title of [
    "Woven pandan tote",
    "Children's wayang puzzle",
    "USB desk fan",
    "Indonesian recipe notebook",
    "Canvas futsal shoe bag",
  ]) {
    await purchaseNearbyListing(page, title);
  }
  await page
    .getByRole("article", { name: "Nearby simulated listing: Foldable badminton net" })
    .getByRole("button", { name: "View item" })
    .click();
  checkout = page.getByRole("region", { name: "Checkout" });
  await expect(checkout).toContainText("Trusted Buyer limit of 5 active Purchase Commitments reached");
  await expect(checkout.getByRole("button", { name: "Start 5-minute Checkout Hold" })).toBeDisabled();

  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "5 of 5 active Purchase Commitments",
  );
});

test("Reset Demo clears checkout state and restores purchased items", async ({ page }) => {
  await openDemo(page);
  await purchaseNearbyListing(page, "Handwoven rattan market basket");
  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "1 of 1 active Purchase Commitments",
  );

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "List" })
    .click();
  await expect(
    page.getByRole("article", {
      name: "Nearby simulated listing: Handwoven rattan market basket",
    }),
  ).toBeVisible();
});

test("checkout commitments stay isolated between browser sessions", async ({ browser, page }) => {
  await openDemo(page);
  await purchaseNearbyListing(page, "Handwoven rattan market basket");

  const otherContext = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 1280, height: 720 },
  });
  const otherPage = await otherContext.newPage();
  try {
    await openDemo(otherPage);
    await expect(otherPage.getByRole("region", { name: "Purchase Commitments" })).toContainText(
      "No active Purchase Commitments",
    );
    await expect(
      otherPage.getByRole("article", {
        name: "Nearby simulated listing: Handwoven rattan market basket",
      }),
    ).toBeVisible();

    await otherPage.getByRole("button", { name: "Reset Demo" }).click();
    await otherPage
      .getByRole("dialog", { name: "Reset Demo" })
      .getByRole("button", { name: "Reset this simulated session" })
      .click();

    await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
      "1 of 1 active Purchase Commitments",
    );
    await expect(
      page.getByRole("article", {
        name: "Nearby simulated listing: Handwoven rattan market basket",
      }),
    ).toHaveCount(0);
  } finally {
    await otherContext.close();
  }
});
