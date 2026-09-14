/**
 * Auth and role tests -- HIGH tier.
 *
 * Admin access to /system, /config, /logs; viewer access denied
 * markers (via i18n heading, not a data-testid we don't own);
 * viewer nav restrictions; all-routes smoke.
 */

import { test, expect } from "../fixtures/securevu-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

test.describe("Auth — admin access @high", () => {
  test("admin /system renders general tab", async ({ securevuApp }) => {
    await securevuApp.goto("/system");
    await expect(securevuApp.page.getByLabel("Select general")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("admin /config renders Monaco editor", async ({ securevuApp }) => {
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page
        .locator(".monaco-editor, [data-keybinding-context]")
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin /logs renders securevu tab", async ({ securevuApp }) => {
    await securevuApp.goto("/logs");
    await expect(securevuApp.page.getByLabel("Select securevu")).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Auth — viewer restrictions @high", () => {
  for (const path of ["/system", "/config", "/logs"]) {
    test(`viewer on ${path} sees AccessDenied`, async ({ securevuApp }) => {
      await securevuApp.installDefaults({ profile: viewerProfile() });
      await securevuApp.page.goto(path);
      await securevuApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
      await expect(
        securevuApp.page.getByRole("heading", {
          level: 2,
          name: /access denied/i,
        }),
      ).toBeVisible({ timeout: 10_000 });
    });
  }

  test("viewer sees cameras on /", async ({ securevuApp }) => {
    await securevuApp.installDefaults({ profile: viewerProfile() });
    await securevuApp.page.goto("/");
    await expect(
      securevuApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("viewer sees severity tabs on /review", async ({ securevuApp }) => {
    await securevuApp.installDefaults({ profile: viewerProfile() });
    await securevuApp.page.goto("/review");
    await expect(securevuApp.page.getByLabel("Alerts")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("viewer can access all non-admin routes without AccessDenied", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ profile: viewerProfile() });
    const routes = ["/", "/review", "/explore", "/export", "/settings"];
    for (const route of routes) {
      await securevuApp.page.goto(route);
      await securevuApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
      await expect(
        securevuApp.page.getByRole("heading", {
          level: 2,
          name: /access denied/i,
        }),
      ).toHaveCount(0);
    }
  });
});

test.describe("Auth — viewer nav restrictions (desktop) @high", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Sidebar only on desktop",
  );

  test("viewer sidebar hides admin routes", async ({ securevuApp }) => {
    await securevuApp.installDefaults({ profile: viewerProfile() });
    await securevuApp.page.goto("/");
    await securevuApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    for (const href of ["/system", "/config", "/logs"]) {
      await expect(
        securevuApp.page.locator(`aside a[href='${href}']`),
      ).toHaveCount(0);
    }
  });
});

test.describe("Auth — all routes smoke @high @mobile", () => {
  test("every common route renders #pageRoot", async ({ securevuApp }) => {
    for (const route of ["/", "/review", "/explore", "/export", "/settings"]) {
      await securevuApp.goto(route);
      await expect(securevuApp.page.locator("#pageRoot")).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
