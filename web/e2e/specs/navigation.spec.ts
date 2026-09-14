/**
 * Navigation tests -- CRITICAL tier.
 *
 * Covers sidebar (desktop) / bottombar (mobile) link set, conditional
 * nav items (faces, chat, classification), settings menu navigation,
 * unknown-route redirect to /, and mobile-specific nav behaviors.
 */

import { test, expect } from "../fixtures/securevu-test";
import { BasePage } from "../pages/base.page";

const PRIMARY_ROUTES = ["/review", "/explore", "/export"] as const;

test.describe("Navigation — primary links @critical", () => {
  test("every primary link is visible and navigates", async ({
    securevuApp,
  }) => {
    await securevuApp.goto("/");
    for (const route of PRIMARY_ROUTES) {
      await expect(
        securevuApp.page.locator(`a[href="${route}"]`).first(),
      ).toBeVisible();
    }
    const base = new BasePage(securevuApp.page, !securevuApp.isMobile);
    for (const route of PRIMARY_ROUTES) {
      await base.navigateTo(route);
      await expect(securevuApp.page).toHaveURL(new RegExp(route));
      await expect(securevuApp.page.locator("#pageRoot")).toBeVisible();
    }
  });

  test("logo links home on desktop", async ({ securevuApp }) => {
    test.skip(securevuApp.isMobile, "Sidebar logo is desktop-only");
    await securevuApp.goto("/review");
    await securevuApp.page.locator("aside a[href='/']").first().click();
    await expect(securevuApp.page).toHaveURL(/\/$/);
  });

  test("unknown route redirects to /", async ({ securevuApp }) => {
    await securevuApp.page.goto("/nonexistent-route");
    await securevuApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(securevuApp.page).toHaveURL(/\/$/);
    await expect(
      securevuApp.page.locator("[data-camera='front_door']"),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Navigation — conditional items @critical", () => {
  test("/faces is hidden when face_recognition.enabled is false", async ({
    securevuApp,
  }) => {
    await securevuApp.goto("/");
    await expect(
      securevuApp.page.locator('a[href="/faces"]').first(),
    ).toHaveCount(0);
  });

  test("/faces is visible when face_recognition.enabled is true (desktop)", async ({
    securevuApp,
  }) => {
    test.skip(securevuApp.isMobile, "Desktop sidebar");
    await securevuApp.installDefaults({
      config: { face_recognition: { enabled: true } },
    });
    await securevuApp.goto("/");
    await expect(
      securevuApp.page.locator('a[href="/faces"]').first(),
    ).toBeVisible();
  });

  test("/chat is hidden when no agent has the chat role (desktop)", async ({
    securevuApp,
  }) => {
    test.skip(securevuApp.isMobile, "Desktop sidebar");
    await securevuApp.installDefaults({
      config: {
        genai: {
          descriptions_only: {
            provider: "ollama",
            model: "llava",
            roles: ["descriptions"],
          },
        },
      },
    });
    await securevuApp.goto("/");
    await expect(
      securevuApp.page.locator('a[href="/chat"]').first(),
    ).toHaveCount(0);
  });

  test("/chat is visible when an agent has the chat role (desktop)", async ({
    securevuApp,
  }) => {
    test.skip(securevuApp.isMobile, "Desktop sidebar");
    await securevuApp.installDefaults({
      config: {
        genai: {
          chat_agent: {
            provider: "ollama",
            model: "llava",
            roles: ["chat"],
          },
        },
      },
    });
    await securevuApp.goto("/");
    await expect(
      securevuApp.page.locator('a[href="/chat"]').first(),
    ).toBeVisible();
  });

  test("/classification is visible for admin on desktop", async ({
    securevuApp,
  }) => {
    test.skip(securevuApp.isMobile, "Desktop sidebar");
    await securevuApp.goto("/");
    await expect(
      securevuApp.page.locator('a[href="/classification"]').first(),
    ).toBeVisible();
  });
});

test.describe("Navigation — settings menu (desktop) @critical", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Sidebar settings menu is desktop-only",
  );

  const TARGETS = [
    { label: "Settings", url: /\/settings/ },
    { label: "System metrics", url: /\/system/ },
    { label: "System logs", url: /\/logs/ },
    { label: "Configuration Editor", url: /\/config/ },
  ];

  for (const target of TARGETS) {
    test(`menu → ${target.label} navigates`, async ({ securevuApp }) => {
      await securevuApp.goto("/");
      const gear = securevuApp.page
        .locator("aside .mb-8 div[class*='cursor-pointer']")
        .first();
      await gear.click();
      await securevuApp.page.getByLabel(target.label).click();
      await expect(securevuApp.page).toHaveURL(target.url);
    });
  }
});

test.describe("Navigation — mobile @critical @mobile", () => {
  test("mobile bottombar visible, sidebar not rendered", async ({
    securevuApp,
  }) => {
    test.skip(!securevuApp.isMobile, "Mobile-only");
    await securevuApp.goto("/");
    await expect(securevuApp.page.locator("aside")).toHaveCount(0);
    for (const route of PRIMARY_ROUTES) {
      await expect(
        securevuApp.page.locator(`a[href="${route}"]`).first(),
      ).toBeVisible();
    }
  });

  test("mobile nav survives route change", async ({ securevuApp }) => {
    test.skip(!securevuApp.isMobile, "Mobile-only");
    await securevuApp.goto("/");
    const reviewLink = securevuApp.page.locator('a[href="/review"]').first();
    await reviewLink.click();
    await expect(securevuApp.page).toHaveURL(/\/review/);
    await expect(
      securevuApp.page.locator('a[href="/review"]').first(),
    ).toBeVisible();
  });
});
