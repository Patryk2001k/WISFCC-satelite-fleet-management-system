from pydantic import BaseModel
from typing import List

class TleRequest(BaseModel):
    satellite_id: str
    line1: str
    line2: str

class PositionResponse(BaseModel):
    satellite_id: str
    latitude: float
    longitude: float
    altitude: float
    updated_line1: str  
    updated_line2: str
    timestamp_utc: str

class OrbitAdjustRequest(BaseModel):
    currentTle1: str
    currentTle2: str
    deltaV: float
    axis: str 

class OrbitAdjustResponse(BaseModel):
    newTle1: str
    newTle2: str
    newAltitude: float

class TleItem(BaseModel):
    id: str
    name: str
    line1: str
    line2: str

class ConjunctionRequest(BaseModel):
    fleet: List[TleItem]
    debris: List[TleItem]

class ConjunctionResponse(BaseModel):
    ourSatelliteId: str
    threatCatalogId: str
    threatName: str
    timeOfClosestApproach: str
    missDistanceKm: float
    collisionProbability: float
    riskLevel: str