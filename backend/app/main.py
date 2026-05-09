from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_karma_lens import router as karma_lens_router
from app.api.routes_reflections import router as reflections_router
from app.api.routes_checkins import router as checkins_router
from app.api.routes_home import router as home_router
from app.api.routes_journeys import router as journeys_router
from app.api.routes_users import router as users_router
from app.api.routes_welcome import router as welcome_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_gita import router as gita_router
from app.db.database import init_db

app = FastAPI(
    title="GitaFlow API",
    version="0.2.0",
    description="Bhagavad Gita-inspired guidance — Karma Lens agent pipeline.",
)

# Initialize the SQLite database on startup. Idempotent — safe on every boot.
@app.on_event("startup")
def _startup():
    init_db()


# CORS — open in dev so the Vite frontend (5173), the Expo Go app, and any
# tool can hit the backend. Tighten this list before deploying to prod.
# `allow_origin_regex=".*"` covers Expo Go (no fixed origin) and LAN IPs.
# X-Device-Id must be in allow_headers so browsers send it cross-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(karma_lens_router, prefix="/api")
app.include_router(reflections_router, prefix="/api")
app.include_router(checkins_router, prefix="/api")
app.include_router(home_router, prefix="/api")
app.include_router(journeys_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(welcome_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(gita_router, prefix="/api")


@app.get("/")
def health():
    return {"status": "ok", "service": "GitaFlow API", "version": "0.2.0"}
