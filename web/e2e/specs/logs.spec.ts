/**
 * Logs page tests -- MEDIUM tier.
 *
 * Service tabs (with real /logs/<service> JSON contract),
 * log content render, Copy (clipboard), Download (assert
 * ?download=true request fired), mobile tab selector.
 */

import { test, expect } from "../fixtures/securevu-test";
import { grantClipboardPermissions, readClipboard } from "../helpers/clipboard";

function logsJsonBody(lines: string[]) {
  return { lines, totalLines: lines.length };
}

test.describe("Logs — service tabs @medium", () => {
  test("securevu tab renders by default with mocked log lines", async ({
    securevuApp,
  }) => {
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) =>
      route.fulfill({
        json: logsJsonBody([
          "[2026-04-06 10:00:00] INFO: SecureVu started",
          "[2026-04-06 10:00:01] INFO: Cameras loaded",
        ]),
      }),
    );
    // Silence the streaming fetch so it doesn't hang the test.
    await securevuApp.page.route(/\/api\/logs\/securevu\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );
    await securevuApp.goto("/logs");
    await expect(securevuApp.page.getByLabel("Select securevu")).toBeVisible({
      timeout: 5_000,
    });
    await expect(securevuApp.page.getByText(/SecureVu started/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("switching to go2rtc fires a GET to /logs/go2rtc", async ({
    securevuApp,
  }) => {
    let go2rtcCalled = false;
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) =>
      route.fulfill({ json: logsJsonBody(["securevu line"]) }),
    );
    await securevuApp.page.route(/\/api\/logs\/go2rtc(\?|$)/, (route) => {
      if (!route.request().url().includes("stream=true")) {
        go2rtcCalled = true;
      }
      return route.fulfill({ json: logsJsonBody(["go2rtc line"]) });
    });
    await securevuApp.page.route(/\/api\/logs\/.*\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    await securevuApp.goto("/logs");
    await expect(securevuApp.page.getByLabel("Select securevu")).toBeVisible({
      timeout: 5_000,
    });
    const go2rtcTab = securevuApp.page.getByLabel("Select go2rtc");
    await expect(go2rtcTab).toBeVisible();
    await go2rtcTab.click();
    await expect.poll(() => go2rtcCalled, { timeout: 5_000 }).toBe(true);
    await expect(go2rtcTab).toHaveAttribute("data-state", "on");
  });
});

test.describe("Logs — actions @medium", () => {
  test("Copy button writes current logs to clipboard", async ({
    securevuApp,
    context,
  }) => {
    await grantClipboardPermissions(context);
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) =>
      route.fulfill({
        json: logsJsonBody([
          "[2026-04-06 10:00:00] INFO: SecureVu started",
          "[2026-04-06 10:00:01] INFO: Cameras loaded",
        ]),
      }),
    );
    await securevuApp.page.route(/\/api\/logs\/securevu\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );
    await securevuApp.goto("/logs");
    await expect(securevuApp.page.getByText(/SecureVu started/)).toBeVisible({
      timeout: 10_000,
    });

    const copyBtn = securevuApp.page.getByLabel("Copy to Clipboard");
    await expect(copyBtn).toBeVisible({ timeout: 5_000 });
    await copyBtn.click();
    await expect
      .poll(() => readClipboard(securevuApp.page), { timeout: 5_000 })
      .toContain("SecureVu started");
  });

  test("Download button fires GET /logs/<service>?download=true", async ({
    securevuApp,
  }) => {
    let downloadCalled = false;
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) => {
      if (route.request().url().includes("download=true")) {
        downloadCalled = true;
      }
      return route.fulfill({ json: logsJsonBody(["securevu line"]) });
    });
    await securevuApp.page.route(/\/api\/logs\/securevu\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    await securevuApp.goto("/logs");
    const downloadBtn = securevuApp.page.getByLabel("Download Logs");
    await expect(downloadBtn).toBeVisible({ timeout: 5_000 });
    await downloadBtn.click();
    await expect.poll(() => downloadCalled, { timeout: 5_000 }).toBe(true);
  });
});

test.describe("Logs — websocket tab @medium", () => {
  test("switching to websocket tab renders WsMessageFeed container", async ({
    securevuApp,
  }) => {
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) =>
      route.fulfill({ json: logsJsonBody(["securevu line"]) }),
    );
    await securevuApp.page.route(/\/api\/logs\/securevu\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );
    await securevuApp.goto("/logs");
    const wsTab = securevuApp.page.getByLabel("Select websocket");
    await expect(wsTab).toBeVisible({ timeout: 5_000 });
    await wsTab.click();
    await expect(wsTab).toHaveAttribute("data-state", "on", { timeout: 5_000 });
  });
});

test.describe("Logs — streaming @medium", () => {
  test("streamed log lines appear in the viewport", async ({ securevuApp }) => {
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) => {
      if (route.request().url().includes("stream=true")) {
        // Intercepted below via addInitScript fetch override.
        return route.fallback();
      }
      return route.fulfill({
        json: logsJsonBody(["[2026-04-06 10:00:00] INFO: initial batch line"]),
      });
    });

    // Override window.fetch so the /api/logs/securevu?stream=true request
    // resolves with a real ReadableStream that emits chunks over time.
    // This is the only way to validate streaming-append behavior through
    // Playwright — route.fulfill() cannot return a stream.
    // NOTE: The app calls fetch('api/logs/...') with a relative URL (no
    // leading slash), so we match both relative and absolute forms.
    await securevuApp.page.addInitScript(() => {
      const origFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;
        if (url.includes("api/logs/securevu") && url.includes("stream=true")) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              await new Promise((r) => setTimeout(r, 30));
              controller.enqueue(
                encoder.encode(
                  "[2026-04-06 10:00:02] INFO: streamed line one\n",
                ),
              );
              await new Promise((r) => setTimeout(r, 30));
              controller.enqueue(
                encoder.encode(
                  "[2026-04-06 10:00:03] INFO: streamed line two\n",
                ),
              );
              controller.close();
            },
          });
          return new Response(stream, { status: 200 });
        }
        return origFetch.call(window, input as RequestInfo, init);
      };
    });

    await securevuApp.goto("/logs");
    // The initial batch line is parsed by LogLineData and its content is
    // rendered in a .log-content cell — assert against that element.
    await expect(securevuApp.page.getByText("initial batch line")).toBeVisible({
      timeout: 10_000,
    });
    await expect(securevuApp.page.getByText(/streamed line one/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(securevuApp.page.getByText(/streamed line two/)).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Logs — mobile @medium @mobile", () => {
  test.skip(({ securevuApp }) => !securevuApp.isMobile, "Mobile-only");

  test("service tabs render at mobile viewport", async ({ securevuApp }) => {
    await securevuApp.page.route(/\/api\/logs\/securevu(\?|$)/, (route) =>
      route.fulfill({ json: logsJsonBody(["securevu line"]) }),
    );
    await securevuApp.page.route(/\/api\/logs\/securevu\?stream=true/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );
    await securevuApp.goto("/logs");
    await expect(securevuApp.page.getByLabel("Select securevu")).toBeVisible({
      timeout: 5_000,
    });
  });
});
