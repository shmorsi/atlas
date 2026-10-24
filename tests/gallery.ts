import type { Page } from "@playwright/test";

/** macOS writes the gallery during the normal suite. Set ATLAS_CAPTURE_GALLERY=1 to write it from another OS. */
export async function saveGallery(page: Page, path: string) {
  if (process.platform !== "darwin" && process.env.ATLAS_CAPTURE_GALLERY !== "1")
    return;
  await page.screenshot({ path, fullPage: true });
}
