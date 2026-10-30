import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router as api_router
from app.services.elexon_client import elexon_client
from app.services.actuals_service import actuals_service
from app.services.forecasts_service import forecasts_service
from app.models.schemas import HealthResponse
from app.utils.timestamps import format_iso_utc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("windscope.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload and cache January 2026 data on startup asynchronously
    logger.info("Initializing WindScope backend and pre-warming cache...")
    try:
        # Trigger background data loading
        logger.info("Fetching actuals (FUELHH)...")
        await actuals_service.get_actuals_df()
        logger.info("Fetching forecasts (WINDFOR)...")
        await forecasts_service.get_raw_forecasts_df()
        logger.info("WindScope cache initialized successfully.")
    except Exception as e:
        logger.warning(f"Background pre-warm encountered notice (data will be loaded on demand): {e}")
    yield
    logger.info("WindScope shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="GB National Wind Generation Forecast and Day-Ahead Procurement Intelligence Decision Support API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint returning system status and cache info.
    """
    cache_status = elexon_client.get_cache_status()
    return HealthResponse(
        status="ok",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp_utc=format_iso_utc(datetime.now(timezone.utc)),
        cache_status=cache_status
    )

@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": "/health",
        "api_prefix": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
