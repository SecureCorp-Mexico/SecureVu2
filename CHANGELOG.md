# Changelog

All notable changes to SecureVu are documented in this file.

## 0.17.2

Maintenance release that brings SecureVu up to parity with Frigate 0.17.2 (rebranded), and includes the new interactive guided tour.

Image: `ghcr.io/securecorp-mexico/securevu2:0.17.2` (and variants: `-standard-arm64`, `-tensorrt`, `-tensorrt-jp6`, `-rk`, `-rocm`, `-synaptics`).

### Security & hardening

- go2rtc restricted sources (`exec:`/`echo:`/`expr:`) remain disabled by default; the logic is now centralized and also enforced on the `PUT /go2rtc/streams` API and for dynamic (map-form) stream sources. Override with `GO2RTC_ALLOW_ARBITRARY_EXEC=true`.
- WebSocket messages are now authorized by role: viewers/camera-scoped users can only send permitted topics (e.g. PTZ for cameras they can access); internal IPC topics are always blocked.
- The nginx API cache is now keyed per role/user, preventing admin responses from being served to non-admin users.
- Recording export rejects `..` in image paths (path-traversal guard).

### Features & improvements

- **Interactive guided tour ("Guía interactiva")** — a 35-step onboarding walkthrough for authenticated users, launchable any time from the account menu.
- **MP4 export chapters** — optionally embed per-recording-segment chapters; exports and recording segments now also carry `creation_time`/camera metadata.
- More responsive API under load — preview GIF/MP4 generation and Plus uploads no longer block the event loop.
- Detection region sizing normalized for better small-object detection on larger models.
- DEIMv2 object detector support documented (shares the D-FINE ONNX format).

### Documentation

- New DEIMv2 model download/config docs; MemryX SDK 2.1 setup notes; expanded masks guidance ("Which tool do I need?" / "Common mistakes"); restream and recording-cleanup clarifications; a new parked-car tracking FAQ; and YOLO-NAS Colab notebook fixes.

### Maintenance / CI

- Pinned `ruff` and made the lint ruleset explicit for deterministic formatting/lint checks.
- Added the missing `i18n:extract:ci` locale validation step.

### Upgrade notes

- No breaking config changes. Back up your `/config` directory (config + `securevu.db`) before upgrading, as always.
- If you rely on go2rtc `exec:`/`echo:`/`expr:` sources, ensure `GO2RTC_ALLOW_ARBITRARY_EXEC=true` is set.

Full comparison: ports upstream Frigate `v0.17.1..v0.17.2` (20 commits, 26 files), rebranded to SecureVu.
