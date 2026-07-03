from typing import List
from fastapi import APIRouter, Depends
from app.models.schemas import TleRequest, PositionResponse, OrbitAdjustRequest, OrbitAdjustResponse
from app.services.orbit_engine import calculate_batch_positions, calculate_orbit_adjustment
from app.auth.dependencies import get_current_system_caller
from app.models.schemas import ConjunctionRequest, ConjunctionResponse
from app.services.orbit_engine import find_conjunctions


router = APIRouter()

@router.post("/calculate-batch", response_model=List[PositionResponse])
def get_batch_satellite_positions(
    requests: List[TleRequest], 
    caller_data: dict = Depends(get_current_system_caller)
):
    
    results = calculate_batch_positions(requests)
    return results

@router.post("/physics/orbit-adjust", response_model=OrbitAdjustResponse)
def perform_orbit_adjustment(
    request: OrbitAdjustRequest,
    caller_data: dict = Depends(get_current_system_caller) 
):
    result = calculate_orbit_adjustment(request)
    return result

@router.post("/physics/conjunctions", response_model=List[ConjunctionResponse])
def scan_for_conjunctions(
    request: ConjunctionRequest,
    caller_data: dict = Depends(get_current_system_caller)
):
    results = find_conjunctions(request)
    return results