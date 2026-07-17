import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
}

async function purchaseBasket(page: Page) {
  await page
    .getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  await page
    .getByRole("region", { name: "Checkout Hold" })
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
}

async function switchAccount(page: Page, accountId: string) {
  await page
    .getByRole("combobox", { name: "Selected fictional account" })
    .selectOption(accountId);
}

async function arrangeHandover(page: Page) {
  await switchAccount(page, "seller-dimas");
  const sellerPanel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await sellerPanel
    .getByRole("combobox", { name: "Seller-selected Handover Point" })
    .selectOption("community-pavilion");
  await sellerPanel.getByRole("button", { name: "Propose two handover windows" }).click();

  await switchAccount(page, "buyer-ayu");
  const buyerPanel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await buyerPanel.getByRole("button", { name: "Accept first proposed window" }).click();
  await buyerPanel.getByRole("button", { name: "Advance to accepted handover window" }).click();
}

test("buyer and seller complete the location-supported handover in order", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);

  let panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel
    .getByRole("combobox", { name: "Buyer simulated handover location" })
    .selectOption("boundary");
  await panel.getByRole("button", { name: "Record buyer Presence Check" }).click();
  await expect(panel).toContainText("Buyer eligible at the 100 m boundary");

  await switchAccount(page, "seller-dimas");
  panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel
    .getByRole("combobox", { name: "Seller simulated handover location" })
    .selectOption("inside");
  await panel.getByRole("button", { name: "Record seller Presence Check" }).click();
  await expect(panel).toContainText("Both parties are eligible during the accepted window");

  await switchAccount(page, "buyer-ayu");
  panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();
  await expect(panel).toContainText("Buyer confirmation recorded");
  await expect(panel).toContainText("Simulated Escrow: Held");

  await switchAccount(page, "seller-dimas");
  panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel.getByRole("button", { name: "Seller confirms handover" }).click();
  await expect(panel).toContainText("Sale final");
  await expect(panel).toContainText("Simulated Escrow: Released");
  await expect(panel).toContainText("Simulated payout: Paid");
  await expect(panel).toContainText("Successful handover recorded for private Tier Progress");

  await page.getByRole("button", { name: "Demo inventory" }).click();
  await expect(
    page.getByRole("article", { name: "Simulated listing: Handwoven rattan market basket" }),
  ).toContainText("Sold");
});

test("buyer adjustment changes the schedule only after seller approval", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);

  await switchAccount(page, "seller-dimas");
  let panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel.getByRole("button", { name: "Propose two handover windows" }).click();

  await switchAccount(page, "buyer-ayu");
  panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel.getByRole("button", { name: "Request 11:00-11:30 WIB adjustment" }).click();
  await expect(panel).toContainText("pending seller approval");
  await expect(panel.getByRole("heading", { name: "Accepted Handover Schedule" })).toHaveCount(0);

  await switchAccount(page, "seller-dimas");
  panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel.getByRole("button", { name: "Seller approves requested adjustment" }).click();
  await expect(panel.getByRole("heading", { name: "Accepted Handover Schedule" })).toBeVisible();
  await expect(panel).toContainText("11:00-11:30 WIB");
});

test("poor or unavailable location stays blocked without retaining raw location", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);

  const panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel
    .getByRole("combobox", { name: "Buyer simulated handover location" })
    .selectOption("poor");
  await panel.getByRole("button", { name: "Record buyer Presence Check" }).click();

  await expect(panel).toContainText("Buyer not eligible: reported accuracy is poor");
  await expect(
    panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toBeDisabled();
  await expect(panel.getByLabel("Latitude")).toHaveCount(0);
  await expect(panel.getByLabel("Longitude")).toHaveCount(0);
  await expect(panel.getByLabel("Home address")).toHaveCount(0);
  await expect(panel).toContainText("Location supports the claim; it does not prove a meeting");
});

test("Reset Demo removes the completed transaction and permits a fresh journey", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
  await expect(
    page.getByRole("article", { name: "Nearby simulated listing: Handwoven rattan market basket" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Handover for Handwoven rattan market basket" }),
  ).toHaveCount(0);
});
