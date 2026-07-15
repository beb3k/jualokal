import { expect, test } from "@playwright/test";

test("seller sees browser-visible publication failures before a listing can be published", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Demo Mode" }).click();
  await page.getByRole("button", { name: "Seller workspace" }).click();

  await page.getByLabel("Title").fill("");
  await page.getByLabel("Detail photo").uncheck();
  await page.getByRole("button", { name: "Publish listing" }).click();

  const errors = page.getByRole("alert", { name: "Listing publication errors" });
  await expect(errors).toContainText("Add a title");
  await expect(errors).toContainText("Add at least three actual-item photos");
  await expect(page.getByText("Listing published")).toHaveCount(0);
});
