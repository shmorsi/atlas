import { test, expect } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`observed production network and scenario at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByLabel("Observation year")).toHaveValue("2025");
    await page.getByRole("button", { name: "Research", exact: true }).click();
    await page
      .getByRole("button", { name: "Economic Network", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Japan: measured suppliers in 2022" }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "graph_seed17" }),
    ).toHaveCount(2);
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.getByLabel("Network buyer country").selectOption("CAN");
    await page.getByLabel("Network observation year").selectOption("2020");
    await expect(
      page.getByRole("heading", { name: "Canada: measured suppliers in 2020" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Run observed-network scenario" })
      .click();
    await expect(page.getByRole("status")).toContainText("SAU_ENERGY: 10.0%");
    await expect(page.getByRole("status")).toContainText("2020 coefficients");
    await page.getByLabel("Direct cost change (%)").fill("-10");
    await expect(page.getByRole("status")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Run observed-network scenario" })
      .click();
    await expect(page.getByRole("status")).toContainText("-10.0%");
    await page.getByText("Inspect propagation and numerical checks").click();
    await expect(page.getByRole("status")).toContainText(
      "No substitution or dynamic horizon",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `docs/screenshots/network-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}
test("official events filter, update failure feedback and transmission navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page
    .getByRole("button", { name: "Historical Events", exact: true })
    .click();
  await expect(
    page.getByText("Coverage: selected Federal Reserve and ECB releases.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel("Filter official releases").fill("qzxnoresult");
  await expect(page.getByText("No releases match this filter.")).toBeVisible();
  await page
    .getByLabel("Filter official releases")
    .fill("European Central Bank");
  await expect(page.locator("table").first().getByRole("row")).not.toHaveCount(
    1,
  );
  await page.screenshot({
    path: "docs/screenshots/official-events.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "docs/screenshots/official-events-mobile.png",
    fullPage: true,
  });
  await page.route("**/api/updates", (route) =>
    route.fulfill({
      json: {
        status: "partial_failure",
        results: [
          {
            source: "fed",
            status: "failed",
            detail: "Test: source unavailable",
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Update rates & events" }).click();
  await expect(page.getByRole("status")).toContainText(
    "previously published cache",
  );

  await page
    .getByRole("button", { name: "Trace measured dependencies" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who supplies an economy?" }),
  ).toBeVisible();
});
