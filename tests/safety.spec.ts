import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "List" })
    .click();
}

async function switchAccount(page: Page, accountId: string) {
  await page
    .getByRole("combobox", { name: "Selected fictional account" })
    .selectOption(accountId);
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

function basketHandover(page: Page) {
  return page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
}

async function arrangeHandover(page: Page) {
  await switchAccount(page, "seller-dimas");
  await basketHandover(page)
    .getByRole("button", { name: "Propose two handover windows" })
    .click();
  await switchAccount(page, "buyer-ayu");
  await basketHandover(page)
    .getByRole("button", { name: "Accept first proposed window" })
    .click();
}

async function submitImmediateDangerReport(page: Page) {
  const safety = basketHandover(page).getByRole("region", {
    name: "Safety incident help",
  });
  await safety.getByRole("button", { name: "Report a safety incident" }).click();
  const report = safety.getByRole("region", { name: "Safety Report" });
  await expect(report.getByRole("button", { name: "Submit Safety Report" })).toBeDisabled();
  await report
    .getByRole("combobox", { name: "Safety category" })
    .selectOption("immediate-physical-danger");
  await report
    .getByRole("textbox", { name: "Describe what happened" })
    .fill("The seller threatened me beside the pavilion.");
  await report.getByRole("checkbox", { name: "Include simulated evidence" }).check();
  await report.getByRole("button", { name: "Submit Safety Report" }).click();
}

async function completeBasketHandover(page: Page) {
  await arrangeHandover(page);
  let handover = basketHandover(page);
  await handover.getByRole("button", { name: "Advance to accepted handover window" }).click();
  await handover.getByRole("button", { name: "Record buyer Presence Check" }).click();
  await switchAccount(page, "seller-dimas");
  handover = basketHandover(page);
  await handover.getByRole("button", { name: "Record seller Presence Check" }).click();
  await switchAccount(page, "buyer-ayu");
  await basketHandover(page)
    .getByRole("button", { name: "Buyer confirms inspected and accepted" })
    .click();
  await switchAccount(page, "seller-dimas");
  await basketHandover(page).getByRole("button", { name: "Seller confirms handover" }).click();
}

test("a private report blocks contact and places an eligible paid transaction on Safety Hold", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await submitImmediateDangerReport(page);

  let handover = basketHandover(page);
  let safety = handover.getByRole("region", { name: "Safety incident help" });
  await expect(safety).toContainText("Safety Hold");
  await expect(safety).toContainText("Simulated Escrow: Held");
  await expect(safety).toContainText("Contact blocked");
  await expect(safety).toContainText("Leave the unsafe situation");
  await expect(
    handover.getByRole("button", {
      name: "Request 11:00-11:30 WIB adjustment",
    }),
  ).toBeDisabled();

  await switchAccount(page, "seller-dimas");
  handover = basketHandover(page);
  safety = handover.getByRole("region", { name: "Safety incident help" });
  await expect(safety).toContainText("Contact unavailable");
  await expect(safety).toContainText("No Trust Record change while this allegation is unreviewed");
  await expect(handover).not.toContainText("The seller threatened me beside the pavilion.");
  await expect(handover).not.toContainText("Ayu S.");
  await expect(handover).not.toContainText("simulated evidence received");
});

test("an unfinished private report draft is cleared when the selected account changes", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  let safety = basketHandover(page).getByRole("region", {
    name: "Safety incident help",
  });
  await safety.getByRole("button", { name: "Report a safety incident" }).click();
  await safety
    .getByRole("textbox", { name: "Describe what happened" })
    .fill("PRIVATE UNSUBMITTED SAFETY DRAFT");

  await switchAccount(page, "seller-dimas");
  let handover = basketHandover(page);
  await expect(handover).not.toContainText("PRIVATE UNSUBMITTED SAFETY DRAFT");
  await expect(
    handover.getByRole("button", { name: "Report a safety incident" }),
  ).toBeVisible();

  await switchAccount(page, "buyer-ayu");
  handover = basketHandover(page);
  safety = handover.getByRole("region", { name: "Safety incident help" });
  await expect(safety).not.toContainText("PRIVATE UNSUBMITTED SAFETY DRAFT");
  await expect(
    safety.getByRole("button", { name: "Report a safety incident" }),
  ).toBeVisible();
});

test("a dismissed report removes the temporary hold and permits the handover to resume", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await submitImmediateDangerReport(page);

  const handover = basketHandover(page);
  const safety = handover.getByRole("region", { name: "Safety incident help" });
  await safety.getByRole("button", { name: "Simulate dismissed report" }).click();
  await expect(safety).toContainText("review removed the transaction contact block");
  await expect(safety).not.toContainText("Safety Hold");
  await expect(
    handover.getByRole("button", {
      name: "Request 11:00-11:30 WIB adjustment",
    }),
  ).toBeEnabled();
});

test("a confirmed finding has one inclusive seven-day appeal handled by a different reviewer", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await submitImmediateDangerReport(page);

  const reporterSafety = basketHandover(page).getByRole("region", {
    name: "Safety incident help",
  });
  await reporterSafety
    .getByRole("button", { name: "Simulate confirmed finding" })
    .click();

  await switchAccount(page, "buyer-naufal");
  await expect(
    page.getByRole("article", {
      name: "Nearby simulated listing: Batik cotton overshirt",
    }),
  ).toHaveCount(0);

  await switchAccount(page, "seller-dimas");
  const reportedSafety = basketHandover(page).getByRole("region", {
    name: "Safety incident help",
  });
  await expect(reportedSafety).toContainText("Confirmed safety finding");
  await expect(reportedSafety).toContainText("Written outcome");
  await expect(reportedSafety).toContainText("Simulated Escrow: Refunded in full");
  await expect(reportedSafety).not.toContainText("Ayu S.");
  await expect(
    page.getByRole("region", { name: "Restricted simulated account" }),
  ).toContainText("Account unavailable");

  await reportedSafety
    .getByRole("combobox", { name: "Appeal time boundary" })
    .selectOption("after-deadline");
  await reportedSafety.getByRole("button", { name: "Set simulated appeal time" }).click();
  await expect(
    reportedSafety.getByRole("button", { name: "Request one Safety Appeal" }),
  ).toBeDisabled();
  await expect(reportedSafety).toContainText("Appeal deadline passed");

  await reportedSafety
    .getByRole("combobox", { name: "Appeal time boundary" })
    .selectOption("exact-deadline");
  await reportedSafety.getByRole("button", { name: "Set simulated appeal time" }).click();
  await reportedSafety.getByRole("button", { name: "Request one Safety Appeal" }).click();
  await expect(reportedSafety).toContainText("Safety Appeal under review");
  await expect(reportedSafety).toContainText("Different simulated reviewer");
  await expect(reportedSafety).toContainText("Restriction remains during appeal");
  await reportedSafety.getByRole("button", { name: "Simulate appeal overturned" }).click();
  await expect(reportedSafety).toContainText("Finding overturned");
  await expect(reportedSafety).toContainText("Lasting restriction removed");
  await expect(
    page.getByRole("region", { name: "Restricted simulated account" }),
  ).toHaveCount(0);
  await expect(
    reportedSafety.getByRole("button", { name: "Request one Safety Appeal" }),
  ).toHaveCount(0);
});

test("serious safety reporting after matching confirmations does not reverse payment", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await completeBasketHandover(page);

  let handover = basketHandover(page);
  await expect(handover).toContainText("Simulated Escrow: Released");
  await expect(handover).toContainText("Simulated payout: Paid");

  const safety = handover.getByRole("region", { name: "Safety incident help" });
  await safety.getByRole("button", { name: "Report a safety incident" }).click();
  const report = safety.getByRole("region", { name: "Safety Report" });
  await report
    .getByRole("combobox", { name: "Safety category" })
    .selectOption("threat-or-harassment");
  await report
    .getByRole("textbox", { name: "Describe what happened" })
    .fill("Serious threatening conduct became clear after the handover.");
  await report.getByRole("button", { name: "Submit Safety Report" }).click();

  handover = basketHandover(page);
  await expect(handover).toContainText("Safety Report under guided prototype review");
  await expect(handover).toContainText("Completed payment remains final");
  await expect(handover).toContainText("Simulated Escrow: Released");
  await expect(handover).toContainText("Simulated payout: Paid");
  await expect(handover).not.toContainText("Simulated refund: Full");
});

test("Reset Demo clears private safety state before a fresh transaction", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await submitImmediateDangerReport(page);
  await expect(basketHandover(page)).toContainText("Safety Hold");

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();
  await expect(basketHandover(page)).toHaveCount(0);

  await purchaseBasket(page);
  const safety = basketHandover(page).getByRole("region", {
    name: "Safety incident help",
  });
  await expect(
    safety.getByRole("button", { name: "Report a safety incident" }),
  ).toBeVisible();
  await expect(safety).not.toContainText("Safety Hold");
  await expect(safety).not.toContainText("under guided prototype review");
});
