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

async function switchAccount(page: Page, accountId: string) {
  await page
    .getByRole("combobox", { name: "Selected fictional account" })
    .selectOption(accountId);
}

test("a multi-Order buyer can select each contained transaction with the keyboard", async ({
  page,
}) => {
  await openDemo(page);
  await switchAccount(page, "buyer-naufal");
  await purchaseNearbyListing(page, "Handwoven rattan market basket");
  await purchaseNearbyListing(page, "Batik cotton overshirt");

  const orders = page.getByRole("region", { name: "Purchase Commitments" });
  const basket = orders.getByRole("article", {
    name: "Purchase Commitment: Handwoven rattan market basket",
  });
  const overshirt = orders.getByRole("article", {
    name: "Purchase Commitment: Batik cotton overshirt",
  });

  await expect(orders).toContainText("2 of 3 active Purchase Commitments");
  await expect(basket.getByRole("button", { name: "Selected Order" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(basket).toContainText("Simulated refund: Not issued");

  const selectOvershirt = overshirt.getByRole("button", {
    name: "Open transaction for Batik cotton overshirt",
  });
  await selectOvershirt.focus();
  await selectOvershirt.press("Enter");

  await expect(overshirt.getByRole("button", { name: "Selected Order" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    overshirt.locator("details", { hasText: "Purchase Snapshot - unchangeable" }),
  ).toHaveAttribute("open", "");
  await expect(
    page.getByRole("region", { name: "Handover for Batik cotton overshirt" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Handover for Handwoven rattan market basket" }),
  ).toHaveCount(0);
  await expect(orders).not.toContainText("Home address");

  const contained = await orders.evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  );
  expect(contained).toBe(true);
});

test("the Order summary never advertises a disabled confirmation", async ({ page }) => {
  await openDemo(page);
  await purchaseNearbyListing(page, "Handwoven rattan market basket");

  await switchAccount(page, "seller-dimas");
  let handover = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await handover.getByRole("button", { name: "Propose two handover windows" }).click();

  await switchAccount(page, "buyer-ayu");
  handover = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await handover.getByRole("button", { name: "Accept first proposed window" }).click();
  await handover.getByRole("button", { name: "Advance to accepted handover window" }).click();
  await handover
    .getByRole("combobox", { name: "Buyer simulated handover location" })
    .selectOption("poor");
  await handover.getByRole("button", { name: "Record buyer Presence Check" }).click();

  const order = page.getByRole("article", {
    name: "Purchase Commitment: Handwoven rattan market basket",
  });
  await expect(order).toContainText("Next permitted action");
  await expect(order).toContainText("Record buyer Presence Check");
  await expect(order).not.toContainText("Buyer confirms inspected and accepted");
  await expect(
    handover.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toBeDisabled();
});
