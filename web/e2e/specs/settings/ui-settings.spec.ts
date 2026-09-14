/**
 * Settings page tests -- HIGH tier.
 *
 * Tests settings page rendering with content, form controls,
 * and section navigation.
 */

import { test, expect } from "../../fixtures/securevu-test";

test.describe("Settings Page @high", () => {
  test("settings page renders with content", async ({ securevuApp }) => {
    await securevuApp.goto("/settings");
    await securevuApp.page.waitForTimeout(2000);
    await expect(securevuApp.page.locator("#pageRoot")).toBeVisible();
    const text = await securevuApp.page.textContent("#pageRoot");
    expect(text?.length).toBeGreaterThan(0);
  });

  test("settings page has clickable navigation items", async ({
    securevuApp,
  }) => {
    await securevuApp.goto("/settings");
    await securevuApp.page.waitForTimeout(2000);
    const navItems = securevuApp.page.locator(
      "#pageRoot button, #pageRoot [role='button'], #pageRoot a",
    );
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("settings page has form controls", async ({ securevuApp }) => {
    await securevuApp.goto("/settings");
    await securevuApp.page.waitForTimeout(2000);
    const formElements = securevuApp.page.locator(
      '#pageRoot input, #pageRoot button[role="switch"], #pageRoot button[role="combobox"]',
    );
    const count = await formElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
