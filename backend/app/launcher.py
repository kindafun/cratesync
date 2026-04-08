from __future__ import annotations

import os
import sys
import threading
import webbrowser

import uvicorn


def open_browser() -> None:
    from .config import settings

    webbrowser.open_new_tab(settings.app_url)


def main() -> None:
    if getattr(sys, "frozen", False):
        os.environ.setdefault("DISCOGS_MIGRATION_SERVE_FRONTEND", "1")
    timer = threading.Timer(1.2, open_browser)
    timer.daemon = True
    timer.start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8421, reload=False)


if __name__ == "__main__":
    main()
