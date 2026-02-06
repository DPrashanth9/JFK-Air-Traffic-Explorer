"""
Flight Routes API Endpoints
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from app.services.flight_service import FlightService

router = APIRouter(prefix="/api", tags=["flights"])


@router.get("/flights")
async def get_flights(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    airline: Optional[str] = Query(None, description="Filter by airline name"),
    state: Optional[str] = Query(None, description="Filter by destination state")
):
    """
    Get flight routes with optional filters
    
    Returns list of routes matching the filters
    """
    routes = FlightService.get_routes(month=month, airline=airline, state=state)
    return {"routes": routes, "count": len(routes)}


@router.get("/aggregations")
async def get_aggregations(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    airline: Optional[str] = Query(None, description="Filter by airline name"),
    state: Optional[str] = Query(None, description="Filter by destination state")
):
    """
    Get aggregated statistics
    
    Returns totals, top state, top airline, etc.
    """
    aggregations = FlightService.get_aggregations(month=month, airline=airline, state=state)
    return aggregations


@router.get("/states/rankings")
async def get_state_rankings(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    airline: Optional[str] = Query(None, description="Filter by airline name"),
    limit: int = Query(10, ge=1, le=50, description="Number of results")
):
    """
    Get top destination states ranked by passengers
    """
    rankings = FlightService.get_state_rankings(month=month, airline=airline, limit=limit)
    return {"rankings": rankings}


@router.get("/airlines/rankings")
async def get_airline_rankings(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    limit: int = Query(10, ge=1, le=50, description="Number of results")
):
    """
    Get top airlines ranked by passengers
    """
    rankings = FlightService.get_airline_rankings(month=month, limit=limit)
    return {"rankings": rankings}


@router.get("/routes/rankings")
async def get_route_rankings(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM)"),
    airline: Optional[str] = Query(None, description="Filter by airline name"),
    state: Optional[str] = Query(None, description="Filter by destination state"),
    limit: Optional[int] = Query(None, ge=1, le=200, description="Number of results")
):
    """
    Get route rankings for map visualization
    
    Aggregates routes by destination (combining multiple carriers)
    """
    routes = FlightService.get_route_rankings(month=month, airline=airline, state=state, limit=limit)
    return {"routes": routes, "count": len(routes)}


@router.get("/filters")
async def get_filters():
    """
    Get available filter options (months, airlines, states)
    """
    filters = FlightService.get_available_filters()
    return filters
