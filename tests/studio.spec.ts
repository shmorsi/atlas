import { test, expect } from "@playwright/test";
async function open(page: any) {
  await page.goto("/");
  await page.getByRole("button", { name: "What if?", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "See how it spreads" }),
  ).toBeEnabled();
}
test("combined scenario, sensitivities, evidence, export and stale results", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.getByRole("button", { name: /Two pressures at once/ }).click();
  await expect(page.getByLabel("Shock 2 country")).toHaveValue("CHN");
  await page.getByRole("button", { name: "See how it spreads" }).click();
  const results = page.getByRole("region", { name: "Scenario results" });
  await expect(results).toBeVisible();
  await expect(results).toContainText("Japan");
  await page
    .getByText("The mathematics behind the picture", { exact: true })
    .click();
  await expect(results).toContainText("float64");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export scenario & assumptions" })
    .click();
  expect((await download).suggestedFilename()).toBe("atlas-scenario-2022.json");
  await page.getByLabel("Shock 1 cost change").fill("-10");
  await expect(results).toHaveCount(0);
  await page.getByRole("button", { name: "See how it spreads" }).click();
  await expect(results).toBeVisible();
  await page.getByRole("button", { name: "02 / Neural evidence" }).click();
  await expect(
    page.getByRole("heading", { name: "Does learning the network help?" }),
  ).toBeVisible();
  await expect(
    page.locator(".studio-evidence table").first(),
  ).not.toContainText("…");
  await page.getByLabel("Neural checkpoint").selectOption("no_graph_seed43");
  await expect(
    page.locator(".studio-evidence table").first(),
  ).not.toContainText("…");
  await page
    .getByText("All seeds, ablations and baselines", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "ridge", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
for (const width of [1440, 820, 390])
  test(`studio responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await page.getByRole("button", { name: "See how it spreads" }).click();
    await expect(
      page.getByRole("region", { name: "Scenario results" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `docs/screenshots/studio-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "02 / Neural evidence" }).click();
    await expect(
      page.locator(".studio-evidence table").first(),
    ).not.toContainText("…");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
test("failed and superseded scenario requests cannot show misleading results", async ({
  page,
}) => {
  await open(page);
  await page.route("**/api/studio/simulate", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Temporarily unavailable" }),
    });
  });
  await page.getByRole("button", { name: "See how it spreads" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await page.unroute("**/api/studio/simulate");
  await page.route("**/api/studio/simulate", async (route) => {
    const response = await route.fetch();
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "See how it spreads" }).click();
  await page.getByLabel("Shock 1 cost change").fill("25");
  await page.waitForTimeout(900);
  await expect(
    page.getByRole("region", { name: "Scenario results" }),
  ).toHaveCount(0);
});
