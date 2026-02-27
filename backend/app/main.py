"""
FastAPI Main Application
This is the entry point for our backend API server.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Import database connection
from app.database.connection import db

# Import routes
from app.routes import flights


# Startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle startup and shutdown events
    """
    # Startup: Connect to Neo4j (non-blocking)
    print("[INFO] Starting up...")
    try:
        db.connect()
    except Exception as e:
        print(f"[WARNING] Could not connect to Neo4j on startup: {e}")
        print("[INFO] Server will start, but database features may not work")
    yield
    # Shutdown: Close Neo4j connection
    print("[INFO] Shutting down...")
    try:
        db.close()
    except:
        pass


# Create FastAPI app instance
app = FastAPI(
    title="JFK Air Traffic Explorer API",
    description="Backend API for JFK Domestic Air Traffic Explorer",
    version="1.0.0",
    lifespan=lifespan  # Add lifespan events
)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows your React frontend to call this API
import os

# Get allowed origins from environment or use defaults
# For development, allow common localhost ports
allowed_origins = [
    "http://localhost:5173",  # Vite dev server (default)
    "http://localhost:5174",  # Vite dev server (alternative port)
    "http://localhost:3000",  # Alternative React port
    "http://127.0.0.1:5173",  # Vite dev server (IP format)
    "http://127.0.0.1:5174",  # Vite dev server (IP format, alternative port)
    "http://127.0.0.1:3000",  # Alternative React port (IP format)
]

# Add production frontend URL from environment variable if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

# For development: Allow any localhost port (more flexible)
# In production, you should restrict this by setting FRONTEND_URL
# This regex pattern allows any localhost port for development
import re
def is_localhost_origin(origin: str) -> bool:
    """Check if origin is from localhost (any port)"""
    pattern = r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$'
    return bool(re.match(pattern, origin))

# Configure CORS
# - Always allow localhost (any port) for development
# - Additionally allow explicit frontend URLs (e.g., Render static site) via FRONTEND_URL
app.add_middleware(
    CORSMiddleware,
    # Explicit list of allowed origins (e.g. your Render frontend)
    allow_origins=allowed_origins,
    # Plus any localhost/127.0.0.1 port for local dev
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


@app.get("/")
async def root():
    """
    Root endpoint - just a simple health check
    """
    return {
        "message": "JFK Air Traffic Explorer API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    # Test database connection
    db_healthy = False
    try:
        db_healthy = db.test_connection()
    except:
        pass
    
    return {
        "status": "healthy",
        "database": "connected" if db_healthy else "disconnected"
    }


# Include routers
app.include_router(flights.router)
