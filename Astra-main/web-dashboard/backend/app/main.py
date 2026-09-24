"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import chat, sandboxes, documents, carbon, incentives, registry
from app.db.mongodb import MongoDB

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(sandboxes.router, prefix=settings.api_prefix)
app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(carbon.router, prefix=settings.api_prefix)
app.include_router(incentives.router, prefix=settings.api_prefix)
app.include_router(registry.router, prefix=settings.api_prefix)


@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection and seed data on startup."""
    MongoDB.connect()
    # Seed carbon registry with initial data
    try:
        from app.services.registry_service import RegistryService
        registry_svc = RegistryService()
        await registry_svc.seed_initial_data()
    except Exception as e:
        print(f"⚠️ Registry seeding skipped: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown."""
    MongoDB.close()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Architecture Sandbox Chatbot API",
        "version": settings.api_version,
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
