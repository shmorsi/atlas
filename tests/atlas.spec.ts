import { test, expect } from "@playwright/test";
test("country selection, search, years, geography and navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".country-title h2")).toHaveText("Japan");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.getByLabel("Search countries").fill("Canada");
  await page.locator(".country-list button").click();
  await expect(page.locator(".country-title h2")).toHaveText("Canada");
  await page.getByLabel("Observation year").selectOption("2020");
  await expect(
    page.locator(".metrics").getByText("2020 · people"),
  ).toBeVisible();
  await page.getByLabel("Search countries").fill("nonsense");
  await expect(page.getByText("No countries match")).toBeVisible();
  await page.getByLabel("Search countries").fill("");
  await page.getByRole("button", { name: "Flat map", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Globe", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Research & Methods" }).click();
  await expect(page.getByText("Evidence before inference.")).toBeVisible();
  expect(errors).toEqual([]);
});
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["wide", 1920, 1080],
  ["tablet", 820, 1180],
  ["mobile", 390, 844],
] as const) {
  test(`layout ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".country-title h2")).toHaveText("Japan");
    await page.waitForTimeout(1800);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator(".map-error")).toHaveCount(0);
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: true,
    });
  });
}
test("API failure has recoverable error state", async ({ page }) => {
  await page.route("**/api/countries?*", (route) =>
    route.fulfill({ status: 503, body: "offline" }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Economic cache could not be loaded",
  );
  await expect(
    page.getByRole("button", { name: "Retry connection" }),
  ).toBeVisible();
});
test("quantitative workspaces use backend results", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Shock Laboratory" }).click();
  await page.getByRole("button", { name: "Run structural model" }).click();
  await expect(
    page.getByText("Cost transmission", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0.11111", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/shock-laboratory.png",
    fullPage: true,
  });
  await page.getByLabel("Technical coefficients").fill("[[1]]");
  await page.getByLabel("Shock vector").fill("[0.1]");
  await page.getByRole("button", { name: "Run structural model" }).click();
  await expect(page.getByRole("alert")).toContainText("Unstable");
  await page.getByRole("button", { name: "Rates & Markets" }).click();
  await page.getByRole("button", { name: "Calculate sensitivity" }).click();
  await expect(page.getByText("100.0000", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Macro Forecasting" }).click();
  await expect(
    page.getByRole("cell", { name: "ridge", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/forecasting.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Portfolio Studio" }).click();
  // Explicitly synthetic browser test fixture, never a demonstration dataset.
  const rows = [
    "date,TEST_A,TEST_B",
    ...Array.from(
      { length: 40 },
      (_, i) =>
        `${new Date(Date.UTC(2020, 0, i + 1)).toISOString().slice(0, 10)},${100 + i * 0.1 + Math.sin(i)},${100 + i * 0.05 + Math.cos(i)}`,
    ),
  ];
  await page.getByLabel("Price CSV", { exact: true }).setInputFiles({
    name: "synthetic-test-only.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(rows.join("\n")),
  });
  await page
    .getByLabel("Price source", { exact: true })
    .fill("Synthetic browser test only");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Analyze & optimize" }).click();
  await expect(page.getByText("Historical risk comparison")).toBeVisible();
  expect(errors).toEqual([]);
});
test("offline map and indicators never require a remote request", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) &&
      !["blob:", "data:"].includes(url.protocol)
    ) {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".country-title h2")).toHaveText("Japan");
  await page.waitForTimeout(1500);
  await expect(page.locator(".map-error")).toHaveCount(0);
  expect(external).toEqual([]);
});

test("geographic polygons, hover, click and population layer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".country-title h2")).toHaveText("Japan");
  await expect
    .poll(async () =>
      Number(
        await page
          .getByTestId("world-map")
          .getAttribute("data-rendered-features"),
      ),
    )
    .toBeGreaterThan(20);
  const label = page
    .locator(".country-map-label")
    .filter({ hasText: /^China$/ });
  await expect(label).toHaveCount(1);
  const pos = await label.evaluate((el) => {
    const t = el.style.transform.match(
      /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
    );
    if (!t) throw Error(el.style.transform);
    return { x: +t[1], y: +t[2] };
  });
  await page.locator(".maplibregl-canvas").hover({ position: pos });
  await expect(page.locator(".maplibregl-popup")).toContainText("China");
  await page.locator(".maplibregl-canvas").click({ position: pos });
  await expect(page.locator(".country-title h2")).toHaveText("China");
  await page.getByRole("button", { name: "Population circles" }).click();
  await expect(
    page.getByText("Circle area ∝ observed population"),
  ).toBeVisible();
  await expect(page.locator(".map-error")).toHaveCount(0);
});
test("visual regression desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".country-title h2")).toHaveText("Japan");
  await expect
    .poll(async () =>
      Number(
        await page
          .getByTestId("world-map")
          .getAttribute("data-rendered-features"),
      ),
    )
    .toBeGreaterThan(20);
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot("atlas-desktop.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.003,
  });
});
