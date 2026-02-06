"""
Flight Data Models
Pydantic models for flight route data
"""

from pydantic import BaseModel, Field
from typing import Optional


class AirportModel(BaseModel):
    """Airport node model"""
    code: str = Field(..., description="IATA airport code")
    name: str = Field(..., description="Full airport name")
    city: str = Field(..., description="City name")
    state: str = Field(..., description="Full state name")
    stateCode: str = Field(..., description="2-letter state code")
    lat: float = Field(..., description="Latitude")
    lon: float = Field(..., description="Longitude")


class AirlineModel(BaseModel):
    """Airline node model"""
    name: str = Field(..., description="Airline name")
    code: str = Field(..., description="IATA carrier code")


class FlightRouteModel(BaseModel):
    """Flight route model (from flights.json)"""
    id: str
    month: str = Field(..., description="Month in YYYY-MM format")
    origin: str = Field(default="JFK", description="Origin airport code")
    destinationCode: str
    destinationName: str
    destinationCity: str
    destinationState: str
    destinationStateCode: str
    destinationLat: float
    destinationLon: float
    distanceMiles: float
    carrier: str
    carrierCode: str
    passengers: int
    flights: int


class RouteQueryParams(BaseModel):
    """Query parameters for route endpoints"""
    month: Optional[str] = Field(None, description="Filter by month (YYYY-MM)")
    airline: Optional[str] = Field(None, description="Filter by airline name")
    state: Optional[str] = Field(None, description="Filter by destination state")
    limit: Optional[int] = Field(100, ge=1, le=1000, description="Limit results")
