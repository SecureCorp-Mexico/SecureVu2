# Changelog

All notable changes to SecureVu are documented in this file.

## 0.18.0

Major release that brings SecureVu up to parity with **Frigate 0.18.0** (rebranded), while preserving all SecureVu-specific modifications (branding, the interactive guided tour, and CI/lint hardening).

Image: `ghcr.io/securecorp-mexico/securevu2:0.18.0` (and variants: `-standard-arm64`, `-tensorrt`, `-tensorrt-jp6`, `-rk`, `-rocm`, `-synaptics`).

> This is a major upgrade with **breaking changes**. Back up your `/config` directory (config file + `securevu.db`) before upgrading. SecureVu will attempt to migrate your configuration automatically; in some cases manual changes may be required.

### Breaking changes

- **GenAI now supports multiple providers.** The global `genai` config is now a mapping of provider setups, with a new `roles` field defining which provider handles each task (object descriptions, review summaries, embeddings, chat, etc.). Existing configs are migrated automatically.
- **Annotated JPEG snapshots are no longer written to disk.** Only a clean, unannotated WebP snapshot (`<camera>-<id>-clean.webp`) is stored in `/media/securevu/clips/`. The `clean_copy` option has been removed (clean snapshots are always saved when snapshots are enabled), and the `snapshots.quality` default changed from 70 to 60 (WebP). Use the `/api/events/<id>/snapshot.jpg` endpoint (now honoring `timestamp`, `bounding_box`, `crop`, `height`, `quality`) for annotated images.
- **Zones and masks config format changed** to add `enabled` and `friendly_name` fields (auto-migrated).
- **Intel GPU stats** now read directly from the kernel's per-client DRM counters (no more `intel_gpu_top`, `CAP_PERFMON`, or privileged mode). Requires host Linux kernel 6.5+.
- **FFmpeg updated to version 8** (except the `-rk` image). Hardware-accelerated go2rtc transcoding needs a small go2rtc config change. FFmpeg 5 is deprecated (removed in 0.19).
- **`DELETE /api/export`** removed; use `POST /api/exports` for (bulk) export deletion.
- **Removed config options:** `sync_recordings` (replaced by the Media Sync settings pane), `timelapse_args` (replaced by custom export ffmpeg args), and `ui.date_format` / `ui.time_format` (now driven by i18n).
- **DeGirum detector removed** (vendor ceased operations); **DeepStack detector deprecated** (removed in 0.19).
- **JinaV2 semantic search on GPU** requires an embeddings reindex.

### Features & improvements (from upstream 0.18)

- **Full UI configuration** — a categorized Settings experience to edit nearly every config section with per-field validation, global/camera overrides, unsaved-change highlighting, and dynamic (no-restart) apply for most options. Manual YAML editing is still fully supported.
- **Profiles** — named config overrides you can switch on the fly (persisted across restarts, switchable via UI or the `securevu/profile/set` MQTT topic).
- **GenAI Chat** — a tool-calling LLM chat interface over your cameras, tracked objects, and review activity, with streaming responses and inline tool-call cards.
- **Remote embeddings** — offload Semantic Search embedding generation to an external GenAI provider.
- **Motion Review & Motion Search** — redesigned motion review with motion previews, a region-based motion search workflow, and a heatmap-grid filter.
- **Debug Replay** — replay recorded video through the detection/motion pipeline to tune settings against real footage.

### SecureVu-specific (preserved)

- Full SecureVu rebranding throughout the app, docs, and images; image repo `ghcr.io/securecorp-mexico/securevu2`; SecureVu domains and favicon.
- Interactive guided tour ("Guía interactiva") and its UI anchors, re-attached to the redesigned 0.18 review/settings/logs/faces UI.
- CI/lint hardening carried forward; adopted upstream's exact `ruff` pin (`0.15.20`) and ruleset for deterministic checks.

### Upgrade notes

- Back up `/config` (config + `securevu.db`) before upgrading.
- Review the breaking changes above; most config migrations are automatic, but GenAI, zones/masks, and go2rtc hardware-transcode setups may need attention.
- Ensure your host kernel is 6.5+ for Intel GPU stats.

Full comparison: ports upstream Frigate `v0.17.2..v0.18.0`, rebranded to SecureVu.

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
