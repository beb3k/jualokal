import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "List" })
    .click();
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

async function purchaseNearbyListing(page: Page, title: string) {
  await page
    .getByRole("article", { name: "Nearby simulated listing: " + title })
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

function basketHandover(page: Page) {
  return page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
}

async function recordBothPartiesPresent(
  page: Page,
  buyerLocation = "boundary",
  sellerLocation = "inside",
) {
  let panel = basketHandover(page);
  await panel
    .getByRole("combobox", { name: "Buyer simulated handover location" })
    .selectOption(buyerLocation);
  await panel.getByRole("button", { name: "Record buyer Presence Check" }).click();
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel
    .getByRole("combobox", { name: "Seller simulated handover location" })
    .selectOption(sellerLocation);
  await panel.getByRole("button", { name: "Record seller Presence Check" }).click();
}

async function prepareMismatchHandover(page: Page) {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
}

async function submitMismatchClaim(
  page: Page,
  reason: string,
  description: string,
) {
  const panel = basketHandover(page);
  await panel.getByRole("button", { name: "Raise Material Mismatch Claim" }).click();
  const claim = panel.getByRole("region", { name: "Material Mismatch Claim" });
  await claim.getByRole("combobox", { name: "Mismatch reason" }).selectOption(reason);
  await claim
    .getByRole("textbox", {
      name: "Describe how the item differs from the Purchase Snapshot",
    })
    .fill(description);
  await claim.getByRole("button", { name: "Submit Material Mismatch Claim" }).click();
}

async function expectIncompleteSettlement(
  panel: ReturnType<typeof basketHandover>,
  actorRole: "buyer" | "seller",
) {
  const incomplete = panel.getByRole("region", { name: "Incomplete Handover" });
  await expect(incomplete).toContainText("Simulated Escrow: Held");
  await expect(incomplete).toContainText("Simulated payout: Pending");
  await expect(incomplete).toContainText("Simulated refund: Not issued");
  await expect(incomplete).toContainText("Listing status: Purchased — not sold");
  if (actorRole === "buyer") {
    await expect(incomplete).toContainText("Tier Progress: Not advanced");
  } else {
    await expect(incomplete).not.toContainText("Tier Progress");
  }
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
  await panel.getByRole("button", { name: "Accept first proposed window" }).click();
  const acceptedSchedule = panel.getByRole("region", { name: "Accepted Handover Schedule" });
  await expect(acceptedSchedule).toBeVisible();
  await expect(acceptedSchedule).toContainText("10:00-10:30 WIB");
  await panel.getByRole("button", { name: "Request 11:00-11:30 WIB adjustment" }).click();
  await expect(panel).toContainText("pending seller approval");
  await expect(acceptedSchedule).toContainText("10:00-10:30 WIB");

  await switchAccount(page, "seller-dimas");
  panel = page.getByRole("region", {
    name: "Handover for Handwoven rattan market basket",
  });
  await panel.getByRole("button", { name: "Seller approves requested adjustment" }).click();
  await expect(
    panel.getByRole("region", { name: "Accepted Handover Schedule" }),
  ).toContainText("11:00-11:30 WIB");
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

test("buyer-only evidence stays incomplete and cannot be remotely completed after separation", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
  let panel = basketHandover(page);

  await expect(
    panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: "Seller confirms handover" })).toHaveCount(0);
  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();
  await expectIncompleteSettlement(panel, "buyer");

  const evidence = panel.getByRole("region", { name: "Preserved confirmation evidence" });
  await expect(evidence).toContainText("Buyer confirmation recorded");
  await expect(evidence).toContainText(/Buyer presence eligible.*reported accuracy 12 m/i);
  await expect(evidence).toContainText(/Recorded at .* WIB/i);
  await expect(evidence).toContainText("Seller confirmation not recorded");
  await panel.getByRole("button", { name: "End this handover attempt and separate" }).click();
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);

  await expect(panel).toContainText("Remote confirmation unavailable");
  await expect(panel.getByRole("button", { name: "Seller confirms handover" })).toBeDisabled();
  await expectIncompleteSettlement(panel, "seller");
  await expect(page.getByLabel(/Latitude|Longitude|Home address|Raw location history/i)).toHaveCount(
    0,
  );
  await expect(page.getByRole("region", { name: /Raw location|Location history/i })).toHaveCount(0);
});

test("seller-only evidence is independent and either participant can enter guided review", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  let panel = basketHandover(page);

  await expect(panel.getByRole("button", { name: "Seller confirms handover" })).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toHaveCount(0);
  await panel.getByRole("button", { name: "Seller confirms handover" }).click();
  await expectIncompleteSettlement(panel, "seller");

  const evidence = panel.getByRole("region", { name: "Preserved confirmation evidence" });
  await expect(evidence).toContainText("Seller confirmation recorded");
  await expect(evidence).toContainText(/Seller presence eligible.*reported accuracy 10 m/i);
  await expect(evidence).toContainText(/Recorded at .* WIB/i);
  await expect(evidence).toContainText("Buyer confirmation not recorded");
  await expect(panel.getByRole("button", { name: "Open Active Dispute" })).toBeVisible();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);
  await expect(panel.getByRole("button", { name: "Open Active Dispute" })).toBeVisible();
  await panel.getByRole("button", { name: "Open Active Dispute" }).click();

  await expect(panel).toContainText("Active Dispute — guided prototype review");
  await expect(panel).toContainText(
    "Jualokal authority is limited to incomplete, inconsistent, or disputed transaction states",
  );
  await expect(panel).toContainText("Prototype policy — subject to later launch elaboration");
  await expectIncompleteSettlement(panel, "buyer");
});

test("a mutually accepted repeat meeting requires fresh presence and matching confirmations", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
  let panel = basketHandover(page);

  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();
  await panel.getByRole("button", { name: "End this handover attempt and separate" }).click();
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Seller proposes repeat meeting" }).click();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Buyer accepts repeat meeting" }).click();
  await panel.getByRole("button", { name: "Advance to repeat handover window" }).click();

  await expect(
    panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toBeDisabled();
  await expect(panel).toContainText("Fresh Presence Checks required for this repeat meeting");
  await recordBothPartiesPresent(page, "inside", "boundary");
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Seller confirms handover" }).click();

  await expect(panel).toContainText("Sale final");
  await expect(panel).toContainText("Simulated Escrow: Released");
  await expect(panel).toContainText("Simulated payout: Paid");
  await expect(panel).toContainText("Successful handover recorded for private Tier Progress");
});

test("preserved evidence can enter guided review after a repeat proposal", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
  let panel = basketHandover(page);

  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();
  await panel.getByRole("button", { name: "End this handover attempt and separate" }).click();
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Seller proposes repeat meeting" }).click();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);

  await expect(panel.getByRole("region", { name: "Preserved confirmation evidence" })).toContainText(
    "Buyer confirmation recorded",
  );
  await expect(panel.getByRole("button", { name: "Open Active Dispute" })).toBeVisible();
  await panel.getByRole("button", { name: "Open Active Dispute" }).click();

  await expect(panel).toContainText("Active Dispute — guided prototype review");
  await expect(panel).toContainText("Remote confirmation unavailable after separation");
  await expectIncompleteSettlement(panel, "buyer");
});

test("buyer and seller can agree an adjustment for a repeat meeting", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
  let panel = basketHandover(page);

  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();
  await panel.getByRole("button", { name: "End this handover attempt and separate" }).click();
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Seller proposes repeat meeting" }).click();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);

  await panel
    .getByRole("button", { name: "Request 11:00-11:30 WIB adjustment" })
    .click();
  await expect(panel).toContainText("Buyer adjustment pending seller approval");
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Seller approves requested adjustment" }).click();

  await expect(
    panel.getByRole("region", { name: "Accepted Handover Schedule" }),
  ).toContainText("11:00-11:30 WIB");
  await expect(panel.getByRole("region", { name: "Preserved confirmation evidence" })).toContainText(
    "Buyer confirmation recorded",
  );
});

test("presence and accepted-window controls enforce their exact inclusive boundaries", async ({
  page,
}) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  let panel = basketHandover(page);

  await panel
    .getByRole("combobox", { name: "Buyer simulated handover location" })
    .selectOption("boundary");
  await panel.getByRole("button", { name: "Record buyer Presence Check" }).click();
  await expect(panel).toContainText("Buyer eligible at the 100 m boundary");
  await switchAccount(page, "seller-dimas");
  panel = basketHandover(page);
  await panel
    .getByRole("combobox", { name: "Seller simulated handover location" })
    .selectOption("outside");
  await panel.getByRole("button", { name: "Record seller Presence Check" }).click();
  await expect(panel).toContainText("Seller not eligible: outside the 100 m area");
  await panel
    .getByRole("combobox", { name: "Seller simulated handover location" })
    .selectOption("inside");
  await panel.getByRole("button", { name: "Record seller Presence Check" }).click();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);
  await panel.getByRole("combobox", { name: "Simulated handover time" }).selectOption("window-end");
  await panel.getByRole("button", { name: "Set simulated handover time" }).click();
  await expect(
    panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toBeEnabled();
  await panel
    .getByRole("combobox", { name: "Simulated handover time" })
    .selectOption("just-after-window");
  await panel.getByRole("button", { name: "Set simulated handover time" }).click();
  await expect(panel).toContainText("Outside the accepted handover window");
  await expect(
    panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }),
  ).toBeDisabled();
});

test("incomplete handovers stay isolated between independent browser contexts", async ({
  browser,
  page: sessionAPage,
}) => {
  await openDemo(sessionAPage);
  await purchaseBasket(sessionAPage);
  await arrangeHandover(sessionAPage);
  await recordBothPartiesPresent(sessionAPage);
  await switchAccount(sessionAPage, "buyer-ayu");
  await basketHandover(sessionAPage)
    .getByRole("button", { name: "Buyer confirms inspected and accepted" })
    .click();

  const sessionBContext = await browser.newContext({
    viewport: sessionAPage.viewportSize() ?? { width: 1280, height: 720 },
  });
  const sessionBPage = await sessionBContext.newPage();
  try {
    await openDemo(sessionBPage);
    await expect(sessionBPage.getByRole("region", { name: "Purchase Commitments" })).toContainText(
      "No active Purchase Commitments",
    );
    await expect(basketHandover(sessionBPage)).toHaveCount(0);
    await expectIncompleteSettlement(basketHandover(sessionAPage), "buyer");
    await expect(
      basketHandover(sessionAPage).getByRole("region", {
        name: "Preserved confirmation evidence",
      }),
    ).toContainText("Buyer confirmation recorded");
  } finally {
    await sessionBContext.close();
  }
});

test("Reset Demo clears an incomplete handover and its preserved evidence", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
  await basketHandover(page)
    .getByRole("button", { name: "Buyer confirms inspected and accepted" })
    .click();
  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await expect(page.getByRole("region", { name: "Purchase Commitments" })).toContainText(
    "No active Purchase Commitments",
  );
  await expect(basketHandover(page)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Preserved confirmation evidence" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("article", {
      name: "Nearby simulated listing: Handwoven rattan market basket",
    }),
  ).toBeVisible();
});

test("Material Mismatch offers only qualifying reasons and requires a description", async ({
  page,
}) => {
  await prepareMismatchHandover(page);
  const panel = basketHandover(page);
  await panel.getByRole("button", { name: "Raise Material Mismatch Claim" }).click();
  const claim = panel.getByRole("region", { name: "Material Mismatch Claim" });
  const reason = claim.getByRole("combobox", { name: "Mismatch reason" });
  const submit = claim.getByRole("button", { name: "Submit Material Mismatch Claim" });

  for (const qualifyingReason of [
    "Wrong item",
    "Undisclosed defect",
    "False description or condition grade",
    "Important measurement mismatch",
    "Missing included part",
    "Suspected counterfeit",
  ]) {
    await expect(reason.getByRole("option", { name: qualifyingReason, exact: true })).toHaveCount(1);
  }
  for (const excludedReason of ["Changed my mind", "Subjective dislike", "Preference", "Poor fit"]) {
    await expect(reason.getByRole("option", { name: excludedReason, exact: true })).toHaveCount(0);
  }

  await expect(submit).toBeDisabled();
  await reason.selectOption("wrong-item");
  await expect(submit).toBeDisabled();
  await claim
    .getByRole("textbox", {
      name: "Describe how the item differs from the Purchase Snapshot",
    })
    .fill("The item presented is not the basket shown in the Purchase Snapshot.");
  await expect(submit).toBeEnabled();
  await expect(claim.getByLabel("Supporting photo (optional)")).toHaveCount(1);
  await expect(claim).toContainText("Change of mind, subjective dislike, preference, and poor fit without misdescription do not qualify");
});

test("ordinary mismatch closes after the buyer accepts or takes the item", async ({ page }) => {
  await prepareMismatchHandover(page);
  const panel = basketHandover(page);
  await expect(panel.getByRole("button", { name: "Raise Material Mismatch Claim" })).toBeVisible();
  await expect(panel).toContainText("Raise this before confirming acceptance or taking the item");

  await panel.getByRole("button", { name: "Buyer confirms inspected and accepted" }).click();

  await expect(panel.getByRole("button", { name: "Raise Material Mismatch Claim" })).toHaveCount(0);
  await expect(panel).toContainText("Material Mismatch Claim unavailable after buyer acceptance");
});

test("seller acknowledgement refunds the buyer and pauses the listing", async ({ page }) => {
  await prepareMismatchHandover(page);
  await submitMismatchClaim(
    page,
    "wrong-item",
    "The item presented is not the basket shown in the Purchase Snapshot.",
  );
  await switchAccount(page, "seller-dimas");
  const panel = basketHandover(page);
  await panel.getByRole("button", { name: "Acknowledge Material Mismatch" }).click();

  await expect(panel).toContainText("Seller keeps the item");
  await expect(panel).toContainText("Simulated Escrow: Refunded in full");
  await expect(panel).toContainText("Simulated refund: Full");
  await expect(panel).toContainText("Simulated payout: Not paid");
  await expect(panel).toContainText("Listing status: Paused for correction");
  await page.getByRole("button", { name: "Demo inventory" }).click();
  await expect(
    page.getByRole("article", { name: "Simulated listing: Handwoven rattan market basket" }),
  ).toContainText("Paused for correction");
});

test("contested mismatch stays held as an Active Dispute until guided refund", async ({ page }) => {
  await prepareMismatchHandover(page);
  await submitMismatchClaim(
    page,
    "undisclosed-defect",
    "The base has a split that is absent from the Purchase Snapshot.",
  );
  await switchAccount(page, "seller-dimas");
  const panel = basketHandover(page);
  await panel.getByRole("button", { name: "Contest Material Mismatch" }).click();

  await expect(panel).toContainText("Active Dispute");
  await expect(panel).toContainText("Seller keeps the item");
  await expect(panel).toContainText("Simulated Escrow: Held");
  await expect(panel).toContainText("Simulated payout: Pending");
  await expect(panel).toContainText("Simulated refund: Not issued");
  await expect(panel).toContainText(/Prototype policy .* subject to later launch elaboration/);

  await panel.getByRole("button", { name: "Simulate guided-review refund" }).click();
  await expect(panel).toContainText("Guided prototype review resolved with a full simulated buyer refund");
  await expect(panel).toContainText("Simulated Escrow: Refunded in full");
  await expect(panel).toContainText("Simulated payout: Not paid");
});

test("suspected counterfeit removes the listing for fictional fraud review", async ({ page }) => {
  await prepareMismatchHandover(page);
  await submitMismatchClaim(
    page,
    "suspected-counterfeit",
    "The maker mark differs from the mark shown in the Purchase Snapshot.",
  );
  const panel = basketHandover(page);

  await expect(panel).toContainText("Seller keeps the item");
  await expect(panel).toContainText("Listing status: Removed");
  await expect(panel).toContainText("Fictional fraud review");
  await expect(panel).toContainText("This is simulated Demo Mode data");
  await page.getByRole("button", { name: "Demo inventory" }).click();
  await expect(
    page.getByRole("article", { name: "Simulated listing: Handwoven rattan market basket" }),
  ).toContainText("Removed");
});

test("Material Mismatch details stay isolated between demo sessions", async ({
  browser,
  page: sessionAPage,
}) => {
  const privateDescription = "Private mismatch detail unique to session A";
  await prepareMismatchHandover(sessionAPage);
  await submitMismatchClaim(sessionAPage, "wrong-item", privateDescription);
  await expect(basketHandover(sessionAPage)).toContainText(privateDescription);
  await switchAccount(sessionAPage, "buyer-naufal");
  await expect(sessionAPage.getByText(privateDescription)).toHaveCount(0);
  await expect(basketHandover(sessionAPage)).toHaveCount(0);
  await switchAccount(sessionAPage, "buyer-ayu");
  await expect(basketHandover(sessionAPage)).toContainText(privateDescription);

  const sessionBContext = await browser.newContext({
    viewport: sessionAPage.viewportSize() ?? { width: 1280, height: 720 },
  });
  const sessionBPage = await sessionBContext.newPage();
  try {
    await openDemo(sessionBPage);
    await expect(sessionBPage.getByRole("region", { name: "Purchase Commitments" })).toContainText(
      "No active Purchase Commitments",
    );
    await expect(sessionBPage.getByText(privateDescription)).toHaveCount(0);
    await expect(basketHandover(sessionBPage)).toHaveCount(0);
  } finally {
    await sessionBContext.close();
  }
});

test("Reset Demo clears a mismatch and permits a fresh successful handover", async ({ page }) => {
  await prepareMismatchHandover(page);
  await submitMismatchClaim(
    page,
    "wrong-item",
    "The item presented is not the basket shown in the Purchase Snapshot.",
  );
  await switchAccount(page, "seller-dimas");
  await basketHandover(page)
    .getByRole("button", { name: "Acknowledge Material Mismatch" })
    .click();
  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await purchaseBasket(page);
  await arrangeHandover(page);
  await recordBothPartiesPresent(page);
  await switchAccount(page, "buyer-ayu");
  await basketHandover(page)
    .getByRole("button", { name: "Buyer confirms inspected and accepted" })
    .click();
  await switchAccount(page, "seller-dimas");
  const panel = basketHandover(page);
  await panel.getByRole("button", { name: "Seller confirms handover" }).click();

  await expect(panel).toContainText("Sale final");
  await expect(panel).toContainText("Simulated Escrow: Released");
  await expect(panel).toContainText("Simulated payout: Paid");
});

test("ordinary mismatch closes after the seller transfers the item", async ({ page }) => {
  await prepareMismatchHandover(page);
  await switchAccount(page, "seller-dimas");
  await basketHandover(page)
    .getByRole("button", { name: "Seller confirms handover" })
    .click();
  await switchAccount(page, "buyer-ayu");
  const panel = basketHandover(page);

  await expect(panel.getByRole("button", { name: "Raise Material Mismatch Claim" })).toHaveCount(0);
  await expect(panel).toContainText("Material Mismatch Claim unavailable after item transfer");
});

test("deadline controls expose exact boundaries and scheduling expiry outcome", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  const panel = basketHandover(page);
  const deadlines = panel.getByRole("region", { name: "Transaction deadlines" });
  await expect(deadlines).toContainText("Seller proposal (2 hours)");
  await expect(deadlines).toContainText("Accepted schedule (6 hours)");
  await expect(deadlines).toContainText("Latest handover start (48 hours)");
  await deadlines.getByRole("combobox", { name: "Demo time boundary" }).selectOption("agreement-exact");
  await deadlines.getByRole("button", { name: "Set demo boundary time" }).click();
  await expect(deadlines).toContainText("Accepted schedule (6 hours): 0h 0m remaining");
  await deadlines.getByRole("combobox", { name: "Demo time boundary" }).selectOption("handover-exact");
  await deadlines.getByRole("button", { name: "Set demo boundary time" }).click();
  await expect(deadlines).toContainText("Latest handover start (48 hours): 0h 0m remaining");
  await deadlines.getByRole("combobox", { name: "Demo time boundary" }).selectOption("proposal-exact");
  await deadlines.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Expire: seller response overdue" }).click();
  await expect(panel).toContainText("Action blocked: failure not eligible");
  await deadlines.getByRole("combobox", { name: "Demo time boundary" }).selectOption("proposal-after");
  await deadlines.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Expire: seller response overdue" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText("Scheduling Expiry");
  await expect(panel).toContainText("Full refund issued");
  await expect(panel).toContainText("Listing status: For Sale");
});

test("buyer cancellation ends with a full refund and private late strike", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  const panel = basketHandover(page);
  await panel.getByRole("combobox", { name: "Demo time boundary" }).selectOption("cancel-exact");
  await panel.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Buyer cancels transaction" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText("Buyer Cancellation");
  await expect(panel).toContainText("Your private Reliability Strike: late cancellation");
});

test("seller cancellation ends without a strike more than two hours before", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await switchAccount(page, "seller-dimas");
  const panel = basketHandover(page);
  await panel.getByRole("combobox", { name: "Demo time boundary" }).selectOption("cancel-before");
  await panel.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Seller cancels transaction" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText("Seller Cancellation");
  await expect(panel).not.toContainText("Your private Reliability Strike");
});

test("present seller can report buyer no-show only after the grace boundary", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  await switchAccount(page, "seller-dimas");
  let panel = basketHandover(page);
  await panel.getByRole("button", { name: "Record seller Presence Check" }).click();
  await panel.getByRole("combobox", { name: "Demo time boundary" }).selectOption("no-show-exact");
  await panel.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Report buyer no-show" }).click();
  await expect(panel).toContainText("Action blocked: failure not eligible");
  await panel.getByRole("combobox", { name: "Demo time boundary" }).selectOption("no-show-after");
  await panel.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Report buyer no-show" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText("Buyer No-Show");
});

test("present buyer can report seller no-show after the grace period", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await arrangeHandover(page);
  const panel = basketHandover(page);
  await panel.getByRole("button", { name: "Record buyer Presence Check" }).click();
  await panel.getByRole("combobox", { name: "Demo time boundary" }).selectOption("no-show-after");
  await panel.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Report seller no-show" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText("Seller No-Show");
  await expect(panel).toContainText("Listing status: Paused");
});

test("seller unavailability removes the listing while hiding the reason from buyer", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await switchAccount(page, "seller-dimas");
  let panel = basketHandover(page);
  await panel.getByRole("combobox", { name: "Seller unavailability reason" }).selectOption("damage");
  await panel.getByRole("button", { name: "Report seller unavailability" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText("Seller Unavailability");
  await expect(panel).toContainText("Your private seller reason: damage");
  await switchAccount(page, "buyer-ayu"); panel = basketHandover(page);
  await expect(panel).not.toContainText("damage");
  await expect(panel).not.toContainText("Your private Reliability Strike");
  await expect(panel).toContainText("Listing status: Removed");
  const commitment = page.getByRole("article", {
    name: "Purchase Commitment: Handwoven rattan market basket",
  });
  await expect(commitment).toContainText("Simulated Escrow: Refunded");
  await expect(commitment).toContainText("Simulated payout: Not paid");
});

test("buyer overdue expiry strikes only the buyer after the six-hour boundary", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await switchAccount(page, "seller-dimas");
  let panel = basketHandover(page);
  await panel.getByRole("button", { name: "Propose two handover windows" }).click();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);
  await panel.getByRole("combobox", { name: "Demo time boundary" }).selectOption("agreement-after");
  await panel.getByRole("button", { name: "Set demo boundary time" }).click();
  await panel.getByRole("button", { name: "Expire: buyer response overdue" }).click();
  await expect(panel.getByRole("region", { name: "Ended transaction outcome" })).toContainText(
    "Scheduling Expiry",
  );
  await expect(panel).toContainText("Your private Reliability Strike: overdue scheduling response");
});

test("incompatible availability ends neutrally with the listing for sale", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await switchAccount(page, "seller-dimas");
  let panel = basketHandover(page);
  await panel.getByRole("button", { name: "Propose two handover windows" }).click();
  await switchAccount(page, "buyer-ayu");
  panel = basketHandover(page);
  await panel.getByRole("button", { name: "Demo both responded: no compatible time within 48 hours" }).click();
  const outcome = panel.getByRole("region", { name: "Ended transaction outcome" });
  await expect(outcome).toContainText("Scheduling Expiry");
  await expect(outcome).toContainText("Listing status: For Sale");
  await expect(outcome).not.toContainText("Your private Reliability Strike");
});
test("seller sees private refund outcomes before a second overlapping strike restricts the account", async ({ page }) => {
  await openDemo(page);
  await purchaseBasket(page);
  await switchAccount(page, "seller-dimas");
  let panel = basketHandover(page);
  await panel.getByRole("combobox", { name: "Seller unavailability reason" }).selectOption("damage");
  await panel.getByRole("button", { name: "Report seller unavailability" }).click();
  await expect(panel).toContainText("Your private seller reason: damage");

  await switchAccount(page, "buyer-ayu");
  await purchaseNearbyListing(page, "Batik cotton overshirt");
  await switchAccount(page, "seller-dimas");
  await page
    .getByRole("combobox", { name: "Selected seller listing" })
    .selectOption("listing-02");
  panel = page.getByRole("region", { name: "Handover for Batik cotton overshirt" });
  await panel.getByRole("combobox", { name: "Seller unavailability reason" }).selectOption("loss");
  await panel.getByRole("button", { name: "Report seller unavailability" }).click();
  await expect(panel).toContainText("Your private seller reason: loss");
  await expect(page.getByRole("heading", { name: "Account unavailable" })).toBeVisible();
});
