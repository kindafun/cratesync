from __future__ import annotations

import threading
import webbrowser

import uvicorn


def open_browser() -> None:
    webbrowser.open_new_tab("http://127.0.0.1:5173")


def main() -> None:
    timer = threading.Timer(1.2, open_browser)
    timer.daemon = True
    timer.start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8421, reload=False)


if __name__ == "__main__":
    main()

