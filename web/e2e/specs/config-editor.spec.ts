/**
 * Config Editor tests -- MEDIUM tier.
 *
 * Monaco load + value, Save (config/save?save_option=saveonly),
 * Save error path, Save and Restart (WS frame via useRestart),
 * Copy (clipboard), schema markers.
 */

import { test, expect } from "../fixtures/securevu-test";
import { installWsFrameCapture, waitForWsFrame } from "../helpers/ws-frames";
import { grantClipboardPermissions, readClipboard } from "../helpers/clipboard";
import {
  getMonacoVisibleText,
  replaceMonacoValue,
  waitForErrorMarker,
} from "../helpers/monaco";

const SAMPLE_CONFIG =
  "mqtt:\n  host: mqtt\ncameras:\n  front_door:\n    enabled: true\n";

async function installSaveRoute(
  app: { page: import("@playwright/test").Page },
  status: number,
  body: Record<string, unknown>,
): Promise<{
  capturedUrl: () => string | null;
  capturedBody: () => string | null;
}> {
  let lastUrl: string | null = null;
  let lastBody: string | null = null;
  await app.page.route("**/api/config/save**", async (route) => {
    lastUrl = route.request().url();
    lastBody = route.request().postData();
    await route.fulfill({ status, json: body });
  });
  return {
    capturedUrl: () => lastUrl,
    capturedBody: () => lastBody,
  };
}

test.describe("Config Editor — Monaco @medium", () => {
  test("editor loads with mocked configRaw content", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    // Assert via DOM-rendered visible text (Monaco virtualizes — works
    // for short configs which covers our mocked content).
    await expect
      .poll(() => getMonacoVisibleText(securevuApp.page), { timeout: 10_000 })
      .toContain("front_door");
  });
});

test.describe("Config Editor — Save @medium", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Save button copy is desktop-visible (hidden md:block)",
  );

  test("clicking Save Only POSTs config/save?save_option=saveonly", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    const capture = await installSaveRoute(securevuApp, 200, {
      message: "Config saved",
    });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    await securevuApp.page.getByLabel("Save Only").click();
    await expect
      .poll(() => capture.capturedUrl(), { timeout: 5_000 })
      .toMatch(/config\/save\?save_option=saveonly/);
    // Body is the raw YAML as text/plain
    await expect
      .poll(() => capture.capturedBody(), { timeout: 5_000 })
      .toContain("front_door");
  });

  test("Save error shows the server message in the error area", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await installSaveRoute(securevuApp, 400, {
      message: "Invalid field `cameras.front_door`",
    });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    await securevuApp.page.getByLabel("Save Only").click();
    await expect(securevuApp.page.getByText(/Invalid field/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Config Editor — Save and Restart @medium", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Save and Restart button copy is desktop-visible",
  );

  test("Save and Restart opens dialog; confirm sends WS restart frame", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await installSaveRoute(securevuApp, 200, { message: "Saved" });
    await installWsFrameCapture(securevuApp.page);

    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    await securevuApp.page.getByLabel("Save & Restart").click();
    const dialog = securevuApp.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByRole("button", { name: /restart/i }).click();
    await waitForWsFrame(
      securevuApp.page,
      (frame) => frame.includes('"restart"') || frame.includes("restart"),
      { message: "useRestart should send a WS frame on the restart topic" },
    );
  });

  test("cancelling the restart dialog leaves body interactive", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await installSaveRoute(securevuApp, 200, { message: "Saved" });

    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    await securevuApp.page.getByLabel("Save & Restart").click();
    const dialog = securevuApp.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible();
  });
});

test.describe("Config Editor — Copy @medium", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Copy button copy is desktop-visible",
  );

  test("Copy places the editor value in the clipboard", async ({
    securevuApp,
    context,
  }) => {
    await grantClipboardPermissions(context);
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    await securevuApp.page.getByLabel("Copy Config").click();
    await expect
      .poll(() => readClipboard(securevuApp.page), { timeout: 5_000 })
      .toContain("front_door");
  });
});

test.describe("Config Editor — schema markers @medium", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Schema validation assumes focused desktop editing",
  );

  test("invalid YAML renders at least one error marker in the DOM", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    // Replace editor contents with clearly invalid YAML via keyboard.
    await replaceMonacoValue(
      securevuApp.page,
      "this is not: [yaml: and has {unbalanced",
    );
    // Monaco debounces marker evaluation; the .squiggly-error decoration
    // appears asynchronously in the .view-overlays layer.
    await waitForErrorMarker(securevuApp.page);
  });
});

test.describe("Config Editor — Cmd+S keyboard shortcut @medium", () => {
  test.skip(
    ({ securevuApp }) => securevuApp.isMobile,
    "Keyboard save shortcut is desktop-only",
  );

  test("Cmd/Ctrl+S fires the same config/save POST as the Save button", async ({
    securevuApp,
  }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    const capture = await installSaveRoute(securevuApp, 200, {
      message: "Saved",
    });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });

    // Focus the editor so Monaco's keybinding receives the shortcut.
    await securevuApp.page.locator(".monaco-editor").first().click();
    await securevuApp.page.keyboard.press("ControlOrMeta+s");

    await expect
      .poll(() => capture.capturedUrl(), { timeout: 5_000 })
      .toMatch(/config\/save\?save_option=saveonly/);
  });
});

test.describe("Config Editor — Safe Mode auto-validation @medium", () => {
  test("safe-mode config auto-posts on mount and shows the inline error", async ({
    securevuApp,
  }) => {
    // Thread safe_mode: true through the config override, then stub
    // config/save to return a validation error. The page's
    // initialValidationRef effect runs on mount and POSTs
    // config/save?save_option=saveonly with the raw config; the 400
    // surfaces through setError.
    // installDefaults must come first so our specific route wins (LIFO).
    await securevuApp.installDefaults({
      config: { safe_mode: true } as unknown as Record<string, unknown>,
      configRaw: "cameras:\n  front_door:\n    ffmpeg: {}\n",
    });
    let autoSaveCalled = false;
    await securevuApp.page.route("**/api/config/save**", async (route) => {
      autoSaveCalled = true;
      await route.fulfill({
        status: 400,
        json: { message: "safe-mode validation failure" },
      });
    });

    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => autoSaveCalled, { timeout: 10_000 }).toBe(true);
    await expect(
      securevuApp.page.getByText(/safe-mode validation failure/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Config Editor — mobile @medium @mobile", () => {
  test.skip(({ securevuApp }) => !securevuApp.isMobile, "Mobile-only");

  test("editor renders at narrow viewport", async ({ securevuApp }) => {
    await securevuApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await securevuApp.goto("/config");
    await expect(
      securevuApp.page.locator(".monaco-editor").first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
