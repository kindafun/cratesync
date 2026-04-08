#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

npm run build --prefix frontend

python3 -m PyInstaller \
  --noconfirm \
  --clean \
  --windowed \
  --name CrateSync \
  --paths backend \
  --hidden-import app.main \
  --add-data "frontend/dist:frontend/dist" \
  backend/app/launcher.py
