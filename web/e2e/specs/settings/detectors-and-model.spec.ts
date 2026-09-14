/**
 * Detectors and model settings page tests -- HIGH tier.
 *
 * Tests rendering of the merged page and navigation from the SecureVu+ page.
 */

import { test, expect } from "../../fixtures/securevu-test";

test.describe("Detectors and model Settings @high", () => {
  test("page renders with detector and model cards", async ({ securevuApp }) => {
    await securevuApp.goto("/settings?page=systemDetectorsAndModel");
    await securevuApp.page.waitForTimeout(2000);
    await expect(securevuApp.page.locator("#pageRoot")).toBeVisible();

    const text = await securevuApp.page.textContent("#pageRoot");
    expect(text).toContain("Detectors and model");
    expect(text?.toLowerCase()).toContain("detector hardware");
    expect(text?.toLowerCase()).toContain("detection model");
  });

  test("SecureVu+ page links to the merged page", async ({ securevuApp }) => {
    await securevuApp.goto("/settings?page=securevuplus");
    await securevuApp.page.waitForTimeout(2000);

    const button = securevuApp.page.getByRole("button", {
      name: /Change in Detectors and model/,
    });

    // Button only appears when SecureVu+ is enabled in the test config; skip
    // the click assertion if it's not present.
    if ((await button.count()) > 0) {
      await button.first().click();
      await securevuApp.page.waitForURL(/page=systemDetectorsAndModel/);
      await expect(securevuApp.page.locator("#pageRoot")).toContainText(
        "Detectors and model",
      );
    } else {
      test.skip(
        true,
        "SecureVu+ not enabled in this test config; skipping link assertion",
      );
    }
  });

  test("old systemDetectionModel deep-link no longer routes here", async ({
    securevuApp,
  }) => {
    await securevuApp.goto("/settings?page=systemDetectionModel");
    await securevuApp.page.waitForTimeout(2000);
    // The old page key is no longer in allSettingsViews; the router
    // falls back to its default settings page (uiSettings).
    const text = await securevuApp.page.textContent("#pageRoot");
    expect(text).not.toContain("Detection model");
  });
});
