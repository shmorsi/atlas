import { test, expect } from "@playwright/test";
import { saveGallery } from "./gallery";
test("guided journey explains data and preserves research access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Guided", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".guide-country-summary h2")).toHaveText("Japan");
  await page.getByLabel("Find a country").fill("Canada");
  await page.locator(".guide-search-results button").click();
  await expect(page.locator(".guide-country-summary h2")).toHaveText("Canada");
  await expect(
    page.getByText("How large is the economy?", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Observation year").selectOption("2020");
  await expect(page.locator(".guide-country-summary .eyebrow")).toContainText(
    "2020",
  );
  await page.getByLabel("Compare with").selectOption("JPN");
  await expect(page.locator(".guide-compare th").last()).toHaveText("Japan");
  await page
    .getByRole("button", { name: "Open Scenario Studio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See how it spreads" }).click();
  await expect(
    page.getByRole("region", { name: "Scenario results" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open the mathematical sandbox" })
    .click();
  await expect(page.getByLabel("Technical coefficients")).toBeVisible();
  expect(errors).toEqual([]);
});
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["wide", 1920, 1080],
  ["tablet", 820, 1180],
  ["mobile", 390, 844],
] as const) {
  test(`guided ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".guide-country-summary h2")).toHaveText("Japan");
    await expect
      .poll(async () =>
        Number(
          await page
            .getByTestId("world-map")
            .getAttribute("data-rendered-features"),
        ),
      )
      .toBeGreaterThan(20);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    if (name === "desktop" || name === "mobile") {
      await expect(page).toHaveScreenshot(`guided-${name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    }
    await saveGallery(page, `docs/screenshots/guided-${name}.png`);
    if (name === "mobile") {
      await page
        .getByRole("navigation", { name: "Explore ATLAS" })
        .getByRole("button", { name: "What if?", exact: true })
        .click();
      await page.getByRole("button", { name: "See how it spreads" }).click();
      await expect(
        page.getByRole("region", { name: "Scenario results" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await saveGallery(page, "docs/screenshots/guided-scenario-mobile.png");
      await page.getByRole("button", { name: "Explore", exact: true }).click();
      await expect(page.locator(".guide-country-summary h2")).toHaveText(
        "Japan",
      );
    }
  });
}
test("guided missing data and errors stay explicit", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Find a country").fill("Antarctica");
  await page.locator(".guide-search-results button").click();
  await expect(
    page.getByText("Growth data are unavailable for this year."),
  ).toBeVisible();
  await expect(page.locator(".guide-country-summary")).toContainText(
    "Not available",
  );
  await page.route("**/api/countries?*", (r) =>
    r.fulfill({ status: 503, body: "offline" }),
  );
  await page.getByLabel("Observation year").selectOption("2020");
  await expect(page.getByRole("alert")).toContainText(
    "We couldn’t load the country data.",
  );
});

test("guided map allows ordinary page scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".guide-country-summary h2")).toHaveText("Japan");
  await page.locator(".maplibregl-canvas").hover();
  await page.mouse.wheel(0, 450);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(200);
});
