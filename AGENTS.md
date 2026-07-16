# AGENTS.md

## Cursor Cloud specific instructions

SecureVu is a Frigate NVR fork with two developer-facing services:

- **Web frontend** (`web/`) — Vite + Preact/React UI. This is the primary, easily runnable dev surface.
- **Python backend** (`securevu/`) — the NVR/AI engine. It only runs inside the full Docker image (it depends on a cp311 `tflite_runtime` wheel, custom ffmpeg builds, and `go2rtc`/`nginx`/`s6` binaries baked into the image), so it cannot be run natively on the VM's Python.

Standard commands live in `web/package.json` scripts and the `Makefile`; see `docs/docs/development/contributing.md`. Notes below are the non-obvious bits.

### Web frontend (`web/`)
- Dev/lint/test/build scripts are in `web/package.json` (`dev`, `lint`, `test`, `build`). Work from the `web/` directory.
- `npm run test` (vitest) currently finds no test files — the repo has no committed test files, so vitest exits without running any. This is expected, not a setup failure.
- `npm run build` requires `web/.env` (holds `VITE_GIT_COMMIT_HASH`). Run `make version` from the repo root first to generate `web/.env` and `securevu/version.py` (both are gitignored). `npm run dev` works without it.
- The dev server proxies `/api`, `/ws`, `/live`, etc. to `http://localhost:5000` (see `web/vite.config.ts`). With no backend on port 5000 the UI shell loads but every page just shows an infinite loading spinner — you need the backend running on 5000 to see real data.

### Python backend (`securevu/`) — run via Docker only
- Docker is **not** preinstalled on the cloud VM, and running Docker here needs the docker-in-docker workaround (storage-driver `fuse-overlayfs`, `"containerd-snapshotter": false` for Docker 29, and `iptables-legacy`). Start the daemon with `sudo dockerd`.
- Build the image with `make local` (produces `securevu:latest`). This is a heavy multi-stage build (nginx from source, ffmpeg, OpenVINO models, TensorFlow, Intel GPU drivers, etc.) — do NOT put it in the update script.
- Run it (headless test setup that works with no cameras/MQTT/GPU):
  - `config/config.yml`: set `mqtt: enabled: false`, a `cpu` detector, and one camera whose ffmpeg input is a looped local mp4.
  - Put a sample mp4 in `debug/` and mount it: `--volume=/workspace/config:/config --volume=/workspace/debug:/media/securevu` and reference it as `/media/securevu/<file>.mp4`.
  - Publish `--publish=5000:5000` (internal nginx: API + UI, **no auth** — this is what the Vite dev server proxies to) and optionally `--publish=8971:8971` (external nginx, auth required).
  - On first start with auth enabled, a default `admin` user is created and its random password is printed to the logs (only needed for the 8971 port; 5000 needs no auth).
- Verify health via `curl http://localhost:5000/api/version`, `/api/stats`, `/api/config`.
