from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .config import settings
from .database import db


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.ensure_dirs()
    if settings.serve_frontend_from_backend and not settings.frontend_dist_dir.is_dir():
        raise RuntimeError(
            f"Configured frontend bundle was not found at {settings.frontend_dist_dir}."
        )
    db.init()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
cors_origins = list(
    dict.fromkeys(
        [
            settings.frontend_origin,
            settings.backend_origin,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

if settings.serve_frontend_from_backend:
    app.mount(
        "/",
        StaticFiles(directory=settings.frontend_dist_dir, html=True),
        name="frontend",
    )
