import { test, expect } from "@playwright/test";
test("observed Treasury curves and on-demand PyTorch inference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page
    .getByRole("button", { name: "Rates & Markets", exact: true })
    .click();
  await page.getByLabel("Curve observation date").selectOption("2024-01-02");
  await page.getByText("Read yields as a table and inspect the source").click();
  await expect(
    page.getByRole("row").filter({ hasText: "120 months" }),
  ).toContainText("3.95%");
  await page.screenshot({
    path: "docs/screenshots/treasury-curves.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Macro Forecasting", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run saved PyTorch model", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Predicted growth:");
  await expect(page.getByRole("status")).toContainText("PyTorch / cpu");
  await page.getByLabel("Prediction target year").selectOption("2015");
  await expect(
    page.getByText("Predicted growth:", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Run saved PyTorch model", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("2009–2013");
  expect(errors).toEqual([]);
});
test("walk-forward portfolio uses repeated costs and chronological allocations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Research", exact: true }).click();
  await page
    .getByRole("button", { name: "Portfolio Studio", exact: true })
    .click();
  const rows = [
    "date,TEST_A,TEST_B",
    ...Array.from(
      { length: 95 },
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
    .fill("Synthetic numerical test only");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Run walk-forward backtest", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Out-of-sample dates:");
  await expect(
    page.getByRole("status").getByRole("row").filter({ hasText: "optimized" }),
  ).toHaveCount(1);
  await page.getByText("Inspect every allocation and cost").click();
  await expect(page.getByRole("status")).toContainText("training_end");
  await page.getByLabel("Training observations", { exact: true }).fill("80");
  await expect(
    page.getByText("Out-of-sample dates:", { exact: false }),
  ).toHaveCount(0);
});
