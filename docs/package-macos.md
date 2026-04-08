---
title: package-macos
type: note
permalink: discogs-migration/package-macos
---

# macOS Packaging Notes

The current implementation is built as a localhost app:

- FastAPI API on `127.0.0.1:8421`
- React/Vite frontend on `127.0.0.1:5173`
- OAuth tokens in macOS Keychain
- SQLite and exports under `app_data/`

## Current beta packaging path

1. Install packaging support with `pip install -e "backend[package]"`.
2. Build and bundle the app with [`scripts/package_macos.sh`](../scripts/package_macos.sh).
3. Open the generated `.app` or onedir bundle from `dist/`.

The packaging script:

- builds `frontend/dist`
- bundles `backend/app/launcher.py` with PyInstaller
- includes `frontend/dist` inside the app bundle so FastAPI can serve it directly

At runtime, frozen bundles default to:

- serving the frontend from `BACKEND_ORIGIN`
- storing writable data under `~/Library/Application Support/CrateSync/`
- keeping OAuth tokens in macOS Keychain

## Gaps before a polished installer

- Replace the unsigned PyInstaller beta bundle with a signed launcher flow.
- Add app icon, signed bundle metadata, and notarization.
- Add update feed and installer polish.
