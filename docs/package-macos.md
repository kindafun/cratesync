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

## Recommended beta packaging path

1. Build the frontend bundle with `npm run build --prefix frontend`.
2. Replace the dev frontend with a static mount served by FastAPI for packaged builds.
3. Package the backend launcher with `pyinstaller` or `briefcase`.
4. Sign and notarize the macOS app bundle once the OAuth callback URL and app identity are fixed.

## Gaps before a polished installer

- Serve the production frontend bundle directly from the backend.
- Replace the current browser-open helper with a signed app launcher.
- Add app icon, signed bundle metadata, and update feed.