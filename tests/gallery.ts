import type { Page } from "@playwright/test";

/** Pixel baselines and the docs gallery are the inspected macOS Chromium evidence. */
export async function saveGallery(page: Page, path: string) {
  if (process.platform !== "darwin") return;
  await page.screenshot({ path, fullPage: true });
}
