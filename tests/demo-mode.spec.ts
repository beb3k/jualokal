import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectHorizontallyContained(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
}

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
}

test("fresh Demo Mode contains the exact representative simulated marketplace", async ({
  page,
}) => {
  await openDemo(page);

  const summary = page.getByRole("region", { name: "Demo marketplace summary" });
  await expect(summary).toContainText("3 Demo Buyers");
  await expect(summary).toContainText("5 Demo Sellers");
  await expect(summary).toContainText("25 active Demo Listings");

  const currentTask = page.getByRole("region", { name: "Current demo task" });
  const workspaces = currentTask.getByRole("navigation", { name: "Demo workspaces" });
  await expect(currentTask).toContainText("Buyer discovery");
  await expect(
    workspaces.getByRole("button", { name: "Buyer discovery", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  const trustContext = page.getByRole("region", {
    name: "Buyer trust and reviewer context",
  });
  const reviewerControls = page.getByRole("region", { name: "Reviewer controls" });
  await expect(trustContext).toBeVisible();
  await expect(reviewerControls).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tier Progress" })
      .getByRole("button", { name: "Record successful handover" }),
  ).toHaveCount(0);
  await expect(
    reviewerControls.getByRole("button", { name: "Record successful handover" }),
  ).toBeVisible();
  const taskBox = await currentTask.boundingBox();
  const summaryBox = await summary.boundingBox();
  const trustBox = await trustContext.boundingBox();
  expect(taskBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(trustBox).not.toBeNull();
  expect(taskBox!.y).toBeLessThan(summaryBox!.y);
  expect(summaryBox!.y).toBeLessThan(trustBox!.y);
  await expectHorizontallyContained(page, summary);
  await expectHorizontallyContained(page, currentTask);
  await expectHorizontallyContained(page, trustContext);
  await expectHorizontallyContained(page, reviewerControls);

  const accountSwitcher = page.getByRole("combobox", { name: "Selected fictional account" });
  await expect(
    accountSwitcher.locator('optgroup[label="Fictional Demo Buyers (3)"] option'),
  ).toHaveCount(3);
  await expect(
    accountSwitcher.locator('optgroup[label="Fictional Demo Sellers (5)"] option'),
  ).toHaveCount(5);

  await page.getByRole("button", { name: "Demo inventory" }).click();
  await expect(
    workspaces.getByRole("button", { name: "Demo inventory", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const inventory = page.getByRole("region", { name: "Complete simulated inventory" });
  await expect(inventory.getByRole("article")).toHaveCount(25);
  await expect(inventory.getByText("Like New", { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText("Very Good", { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText("Good", { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText("Fair", { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText("Needs Repair", { exact: true }).first()).toBeVisible();
  await expect(inventory.getByText(/Synthetic fallback.*simulated item image/i)).toHaveCount(25);
});

test("safe Demo navigation survives refresh without persisting location state", async ({ page }) => {
  await page.goto(
    "/?demo=1&account=buyer-naufal&workspace=buyer&category=Books&view=list&seller=seller-sari",
  );

  await expect(
    page.getByRole("combobox", { name: "Selected fictional account" }),
  ).toHaveValue("buyer-naufal");
  await expect(page.getByLabel("Category Filter")).toHaveValue("Books");
  await expect(
    page.getByRole("group", { name: "Discovery View" }).getByRole("button", { name: "List" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Qualifying Demo Seller" }),
  ).toContainText("Sari N.");

  await page.getByLabel("Category Filter").selectOption("Toys");
  await page
    .getByRole("group", { name: "Discovery View" })
    .getByRole("button", { name: "Map" })
    .click();
  await page.getByRole("combobox", { name: "Qualifying Demo Seller" }).click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: /Bima A./ })
    .click();
  await page.getByLabel("Simulated Browsing Location").selectOption("at-edge");
  await page.getByRole("button", { name: "Refresh nearby listings" }).click();

  await page.reload();

  await expect(
    page.getByRole("combobox", { name: "Selected fictional account" }),
  ).toHaveValue("buyer-naufal");
  await expect(page.getByLabel("Category Filter")).toHaveValue("Toys");
  await expect(
    page.getByRole("group", { name: "Discovery View" }).getByRole("button", { name: "Map" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Qualifying Demo Seller" }),
  ).toContainText("Bima A.");
  await expect(page.getByLabel("Simulated Browsing Location")).toHaveValue("current");

  const params = new URL(page.url()).searchParams;
  expect([...params.keys()].sort()).toEqual([
    "account",
    "category",
    "demo",
    "seller",
    "view",
    "workspace",
  ]);
});

test("judges can switch fictional accounts with identity, role, and tier history always clear", async ({
  page,
}) => {
  await openDemo(page);

  const switcher = page.getByRole("combobox", { name: "Selected fictional account" });
  const identity = page.getByRole("region", { name: "Selected simulated identity" });

  for (const buyer of [
    {
      id: "buyer-ayu",
      name: "Ayu R.",
      tier: "Verified Buyer",
      history: "0 successful handovers with 0 different Demo Sellers",
    },
    {
      id: "buyer-naufal",
      name: "Naufal S.",
      tier: "Reliable Buyer",
      history: "3 successful handovers with 3 different Demo Sellers",
    },
    {
      id: "buyer-lestari",
      name: "Lestari W.",
      tier: "Trusted Buyer",
      history: "5 successful handovers with 5 different Demo Sellers",
    },
  ]) {
    await switcher.selectOption(buyer.id);
    await expect(identity).toContainText(buyer.name);
    await expect(identity).toContainText("Fictional Demo Buyer");
    await expect(identity).toContainText("Buyer discovery");
    await expect(identity).toContainText("Simulated as verified");
    await expect(identity).toContainText(buyer.tier);
    await expect(identity).toContainText(buyer.history);
    await expect(identity).toContainText("Fictional history");
  }

  await switcher.selectOption("seller-sari");
  await expect(
    page
      .getByRole("navigation", { name: "Demo workspaces" })
      .getByRole("button", { name: "Seller workspace", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(identity).toContainText("Sari N.");
  await expect(identity).toContainText("Fictional Demo Seller");
  await expect(identity).toContainText("Seller workspace");
  await expect(identity).toContainText("Seller Activation complete");
  await expect(identity).toContainText("Simulated as verified");

  const selectedSellerDiscovery = page
    .getByRole("navigation", { name: "Demo workspaces" })
    .getByRole("button", { name: "View discovery as selected Seller", exact: true });
  await selectedSellerDiscovery.click();
  await expect(selectedSellerDiscovery).toHaveAccessibleName("View discovery as selected Seller");
  await expect(selectedSellerDiscovery).toHaveAttribute("aria-current", "page");
});

test("cancelling Reset Demo preserves the current session changes", async ({ page }) => {
  await openDemo(page);

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByLabel("Title").fill("Session-edited rattan basket");
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page.getByText("Listing published")).toBeVisible();

  await page.getByRole("combobox", { name: "Selected fictional account" }).selectOption(
    "buyer-naufal",
  );
  await page.getByLabel("Simulated Browsing Location").selectOption("outside-edge");

  await page.getByRole("button", { name: "Reset Demo" }).click();
  const confirmation = page.getByRole("dialog", { name: "Reset Demo" });
  await expect(confirmation).toContainText(
    "Only this browser session's simulated accounts, listings, histories, and locations",
  );
  await confirmation.getByRole("button", { name: "Cancel reset" }).click();

  await expect(confirmation).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Selected fictional account" }),
  ).toHaveValue("buyer-naufal");
  await expect(page.getByLabel("Simulated Browsing Location")).toHaveValue("outside-edge");

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Session-edited rattan basket");
});

test("confirming Reset Demo restores the original fictional session", async ({ page }) => {
  await openDemo(page);

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByLabel("Title").fill("Changed before reset");
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.getByRole("button", { name: "Deactivate listing" }).click();

  await page.getByRole("combobox", { name: "Selected fictional account" }).selectOption(
    "buyer-lestari",
  );
  await page.getByLabel("Simulated Browsing Location").selectOption("outside-edge");

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();

  await expect(
    page.getByRole("combobox", { name: "Selected fictional account" }),
  ).toHaveValue("buyer-ayu");
  const identity = page.getByRole("region", { name: "Selected simulated identity" });
  await expect(identity).toContainText("Ayu R.");
  await expect(identity).toContainText("Verified Buyer");
  await expect(identity).toContainText(
    "0 successful handovers with 0 different Demo Sellers",
  );
  await expect(page.getByLabel("Simulated Browsing Location")).toHaveValue("current");
  await expect(page.getByRole("region", { name: "Demo Listing" })).toBeVisible();

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Handwoven rattan market basket");
  await expect(page.getByText("Listing deactivated")).toHaveCount(0);
  await expect(page.getByText("Listing published")).toHaveCount(0);
});

test("independent browser sessions keep changes and resets isolated", async ({
  browser,
  page: sessionAPage,
}) => {
  await openDemo(sessionAPage);
  const sessionBContext = await browser.newContext({
    viewport: sessionAPage.viewportSize() ?? { width: 1280, height: 720 },
  });
  const sessionBPage = await sessionBContext.newPage();

  try {
    await openDemo(sessionBPage);

    await sessionAPage.getByRole("button", { name: "Seller workspace" }).click();
    await sessionAPage.getByLabel("Title").fill("Only changed in session A");
    await sessionAPage.getByRole("button", { name: "Publish listing" }).click();

    await sessionBPage.getByRole("button", { name: "Seller workspace" }).click();
    await expect(sessionBPage.getByLabel("Title")).toHaveValue(
      "Handwoven rattan market basket",
    );

    await sessionBPage.getByRole("button", { name: "Buyer discovery" }).click();
    await sessionBPage
      .getByLabel("Simulated Browsing Location")
      .selectOption("outside-edge");
    await sessionBPage.getByRole("button", { name: "Reset Demo" }).click();
    await sessionBPage
      .getByRole("dialog", { name: "Reset Demo" })
      .getByRole("button", { name: "Reset this simulated session" })
      .click();
    await expect(sessionBPage.getByLabel("Simulated Browsing Location")).toHaveValue(
      "current",
    );

    await expect(sessionAPage.getByLabel("Title")).toHaveValue(
      "Only changed in session A",
    );
    await expect(sessionAPage.getByText("Listing published")).toBeVisible();
  } finally {
    await sessionBContext.close();
  }
});

test("nearby discovery shows the seeded in-radius listings and excludes out-of-radius listings", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole("group", { name: "Discovery View" }).getByRole("button", { name: "List" }).click();

  const discovery = page.getByRole("region", { name: "Demo marketplace listings" });
  await expect(discovery).toContainText("20 nearby simulated listings");
  await expect(discovery.getByRole("article")).toHaveCount(20);
  await expect(discovery.getByText("Handwoven rattan market basket")).toBeVisible();
  await expect(discovery.getByText("Pocket guide to Bandung architecture")).toHaveCount(0);
  await expect(discovery.getByText("Bamboo laundry basket")).toHaveCount(0);
  await expect(discovery.getByText("Under 1 km", { exact: true }).first()).toBeVisible();
  await expect(discovery.getByText("1-2 km", { exact: true }).first()).toBeVisible();

  await page.getByLabel("Simulated Browsing Location").selectOption("outside-edge");
  await page.getByRole("button", { name: "Refresh nearby listings" }).first().click();
  await expect(discovery.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No nearby listings yet" })).toBeVisible();

  await page.getByLabel("Simulated Browsing Location").selectOption("denied");
  await page.getByRole("button", { name: "Refresh nearby listings" }).first().click();
  await expect(discovery.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Location permission denied" })).toBeVisible();

  await page.getByLabel("Simulated Browsing Location").selectOption("current");
  await page.getByRole("button", { name: "Refresh nearby listings" }).first().click();
  await expect(discovery.getByRole("article")).toHaveCount(20);

  await page.getByRole("button", { name: "Demo inventory" }).click();
  await expect(
    page.getByRole("region", { name: "Complete simulated inventory" }).getByRole("article"),
  ).toHaveCount(25);

  const account = page.getByRole("combobox", { name: "Selected fictional account" });
  await account.selectOption("seller-dimas");
  await page.getByRole("combobox", { name: "Selected seller listing" }).selectOption("listing-05");
  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expect(page.getByRole("region", { name: "Demo Listing" })).toBeHidden();
});

test("each Demo Seller manages only the selected listing in the session inventory", async ({
  page,
}) => {
  await openDemo(page);

  const account = page.getByRole("combobox", { name: "Selected fictional account" });
  const sellerListing = page.getByRole("combobox", { name: "Selected seller listing" });

  for (const sellerId of [
    "seller-dimas",
    "seller-sari",
    "seller-bima",
    "seller-rani",
    "seller-wawan",
  ]) {
    await account.selectOption(sellerId);
    await expect(sellerListing.locator("option")).toHaveCount(5);
  }

  await account.selectOption("seller-sari");
  await expect(page.getByLabel("Title")).toHaveValue("Woven pandan tote");

  await sellerListing.selectOption("listing-07");
  await expect(page.getByLabel("Title")).toHaveValue("Children's wayang puzzle");
  await page.getByLabel("Title").fill("Updated wayang puzzle");
  await page.getByRole("button", { name: "Publish listing" }).click();

  await page.getByRole("button", { name: "Demo inventory" }).click();
  const summary = page.getByRole("region", { name: "Demo marketplace summary" });
  await expect(summary).toContainText("25 active Demo Listings");
  const inventory = page.getByRole("region", { name: "Complete simulated inventory" });
  await expect(inventory.getByText("Updated wayang puzzle")).toBeVisible();
  await expect(inventory.getByText("Children's wayang puzzle")).toHaveCount(0);
  await expect(inventory.getByText("Handwoven rattan market basket")).toBeVisible();

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await expect(account).toHaveValue("seller-sari");
  await expect(sellerListing).toHaveValue("listing-07");
  await page.getByRole("button", { name: "Deactivate listing" }).click();

  await expect(summary).toContainText("24 active Demo Listings");
  await page.getByRole("button", { name: "Demo inventory" }).click();
  await expect(inventory.getByRole("heading", { level: 1 })).toHaveText("24 active Demo Listings");
  const changedListing = inventory.getByRole("article", {
    name: "Simulated listing: Updated wayang puzzle",
  });
  await expect(changedListing).toContainText(/Deactivated.*simulated/);

  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset Demo" })
    .getByRole("button", { name: "Reset this simulated session" })
    .click();
  await expect(summary).toContainText("25 active Demo Listings");

  await account.selectOption("seller-sari");
  await sellerListing.selectOption("listing-07");
  await expect(page.getByLabel("Title")).toHaveValue("Children's wayang puzzle");
});

test("switching listings keeps buyer details and update requests tied to the selected item", async ({
  page,
}) => {
  await openDemo(page);

  await page.getByRole("button", { name: "Request listing update" }).click();
  await expect(page.getByText(/Request sent:/)).toBeVisible();

  const account = page.getByRole("combobox", { name: "Selected fictional account" });
  await account.selectOption("seller-sari");
  await expect(page.getByRole("combobox", { name: "Selected seller listing" })).toHaveValue(
    "listing-06",
  );
  await page.getByRole("button", { name: "Buyer discovery" }).click();

  const listing = page.getByRole("region", { name: "Demo Listing" });
  await expect(listing).toContainText("Woven pandan tote");
  await expect(listing).toContainText("10:30 WIB");
  await expect(listing).toContainText("Fictional Demo Seller");
  await expect(listing).toContainText("Sari N.");
  await expect(page.getByText(/Request sent:/)).toHaveCount(0);
});

test("accounts, listings, histories, locations, and activity stay simulated and private", async ({
  page,
}) => {
  await openDemo(page);

  const notice = page.getByRole("status", { name: "Demo Mode simulation" });
  await expect(notice).toContainText("Accounts, listing, location, identity status, and activity");
  const identity = page.getByRole("region", { name: "Selected simulated identity" });
  await expect(identity).toContainText("Fictional Demo Buyer");
  await expect(identity).toContainText("Simulated as verified");
  await expect(identity).toContainText("Fictional history");
  await expect(page.getByLabel("Simulated Browsing Location")).toBeVisible();

  await page.getByRole("button", { name: "Demo inventory" }).click();
  const inventory = page.getByRole("region", { name: "Complete simulated inventory" });
  for (const listing of await inventory.getByRole("article").all()) {
    await expect(listing).toContainText("Simulated Demo Listing");
    await expect(listing).toContainText(/Synthetic fallback.*simulated item image/i);
  }

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByLabel("Title").fill("Privacy-labelled demo edit");
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page.getByText(/Listing published.*simulated/i)).toBeVisible();

  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  expect(visibleText).not.toMatch(/\+62[\s-]?\d{8,}/);
  expect(visibleText).not.toMatch(/\b\d{16}\b/);
  expect(visibleText).not.toMatch(/-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/);
  expect(visibleText).not.toMatch(/street address|home address|builder account|builder information/i);
  expect(visibleText).not.toMatch(
    /private Trust Record|strike reason|safety report detail|dispute detail|payout account/i,
  );
  await expect(page.locator('input[type="password"], input[type="file"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await page.getByRole("group", { name: "Discovery View" }).getByRole("button", { name: "List" }).click();
  await page
    .getByRole("article", { name: "Nearby simulated listing: Privacy-labelled demo edit" })
    .getByRole("button", { name: "View item" })
    .click();
  await page.getByRole("button", { name: "Start 5-minute Checkout Hold" }).click();
  const hold = page.getByRole("region", { name: "Checkout Hold" });
  await expect(hold).toContainText("Simulation only");
  await expect(hold).toContainText("No real payment information or money is requested");
  await expect(hold.getByRole("button", { name: "Simulate successful payment" })).toBeVisible();
  await expect(hold.getByRole("button", { name: "Simulate failed payment" })).toBeVisible();
  await expect(
    page.locator(
      'input[autocomplete^="cc-"], input[name*="card" i], input[name*="cvv" i], input[name*="bank" i]',
    ),
  ).toHaveCount(0);
  await expect(page.locator("body")).toContainText(
    "No real identity, contact, precise location, or payment information",
  );
});

test("List View filters approved categories and uses privacy-safe deterministic order", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole("group", { name: "Discovery View" }).getByRole("button", { name: "List" }).click();

  const discovery = page.getByRole("region", { name: "Demo marketplace listings" });
  const categoryFilter = discovery.getByRole("combobox", { name: "Category Filter" });

  await expect(categoryFilter.locator("option")).toHaveText([
    "All",
    "Clothing",
    "Accessories",
    "Small Electronics",
    "Books",
    "Toys",
    "Hobby Equipment",
    "Portable Household Goods",
  ]);
  await expect(discovery.getByRole("article").first()).toContainText("Denim chore jacket");

  await categoryFilter.selectOption("Books");
  await expect(discovery.getByRole("article")).toHaveCount(2);
  await expect(discovery.getByRole("article").nth(0)).toContainText(
    "Illustrated Indonesian folktales",
  );
  await expect(discovery.getByRole("article").nth(1)).toContainText(
    "Indonesian recipe notebook",
  );
  await expect(discovery).not.toContainText(/\b\d+(?:\.\d+)?\s*(?:m|km) away\b/i);
});

test("listing updates and reactivation preserve the original List View order", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole("group", { name: "Discovery View" }).getByRole("button", { name: "List" }).click();

  const discovery = page.getByRole("region", { name: "Demo marketplace listings" });
  const titleHeadings = discovery.locator("article h3");
  const visibleTitles = async () => {
    await expect(titleHeadings).toHaveCount(20);
    return titleHeadings.allTextContents();
  };
  const originalTitle = "Handwoven rattan market basket";
  const editedTitle = "Order-stable rattan basket";
  const initialOrder = await visibleTitles();
  expect(initialOrder).toContain(originalTitle);

  const expectOriginalOrder = async () => {
    const currentOrder = await visibleTitles();
    expect(
      currentOrder.map((title) => (title === editedTitle ? originalTitle : title)),
    ).toEqual(initialOrder);
  };

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByLabel("Title").fill(editedTitle);
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expectOriginalOrder();

  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page.getByRole("button", { name: "Deactivate listing" }).click();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expectOriginalOrder();

  await page.getByLabel("Structured question").selectOption("Measurements");
  await page.getByRole("button", { name: "Request listing update" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();
  await page
    .getByLabel("Measurements or specifications")
    .fill("42 cm wide x 31 cm high; approximately 650 g.");
  await page.getByRole("button", { name: "Update shared listing" }).click();
  await page.getByRole("button", { name: "Buyer discovery" }).click();
  await expectOriginalOrder();
});
