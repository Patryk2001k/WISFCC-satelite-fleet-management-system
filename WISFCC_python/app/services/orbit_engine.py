from typing import List
from skyfield.api import load, EarthSatellite, wgs84
from datetime import datetime, timezone
from app.models.schemas import TleRequest, OrbitAdjustRequest, OrbitAdjustResponse
from math import pi, sqrt
from app.models.schemas import ConjunctionRequest, ConjunctionResponse


ts = load.timescale()

MU_EARTH = 398600.4418  
EARTH_RADIUS = 6371.0   

def calculate_tle_checksum(line: str) -> str:
    checksum = 0
    
    for char in line[:-1]:
        if char.isdigit():
            checksum += int(char)
        elif char == '-':
            checksum += 1
    return str(checksum % 10)

def update_line1_epoch(line1: str, now: datetime) -> str:
    year_short = now.strftime("%y")
    day_of_year = now.timetuple().tm_yday
    fractional_day = (now.hour / 24.0) + (now.minute / 1440.0) + (now.second / 86400.0)
    
    epoch_str = f"{year_short}{day_of_year + fractional_day:012.8f}"
    
    
    new_line = line1[:18] + epoch_str + line1[32:-1]
    return new_line + calculate_tle_checksum(new_line)

def update_line2_mean_motion(line2: str, new_n_revs_per_day: float) -> str:
    new_mean_motion_str = f"{new_n_revs_per_day:11.8f}"
    
    new_line = line2[:52] + new_mean_motion_str + line2[63:-1]
    return new_line + calculate_tle_checksum(new_line)


def calculate_batch_positions(requests: List[TleRequest]) -> List[dict]:
    results = []
    now_utc = datetime.now(timezone.utc)
    t = ts.utc(now_utc.year, now_utc.month, now_utc.day, now_utc.hour, now_utc.minute, now_utc.second)
    
    for req in requests:
        try:
            satellite = EarthSatellite(req.line1, req.line2, "Target", ts)
            geocentric = satellite.at(t)
            subpoint = wgs84.subpoint(geocentric)
            
            results.append({
                "satellite_id": req.satellite_id,
                "latitude": subpoint.latitude.degrees,
                "longitude": subpoint.longitude.degrees,
                "altitude": subpoint.elevation.m,
                "updated_line1": update_line1_epoch(req.line1, now_utc),
                "updated_line2": req.line2,
                "timestamp_utc": now_utc.isoformat()
            })
        except Exception as e:
            print(f"Error processing {req.satellite_id}: {e}")
            
    return results

def calculate_orbit_adjustment(request: OrbitAdjustRequest) -> OrbitAdjustResponse:
    try:
        
        current_mean_motion = float(request.currentTle2[52:63].strip())
        
        
        n_rad_per_sec = current_mean_motion * (2 * pi / 86400.0)
        current_a = (MU_EARTH / (n_rad_per_sec ** 2)) ** (1.0 / 3.0)
        current_velocity = sqrt(MU_EARTH / current_a)
        
        
        delta_v_kms = request.deltaV / 1000.0
        
        
        if request.axis == "X":  
            new_velocity = current_velocity + delta_v_kms
            altitude_change = (MU_EARTH / (new_velocity ** 2)) - current_a
        elif request.axis == "Y":  
            altitude_change = delta_v_kms * 50.0 
        else:  
            altitude_change = 0.0
            
        new_a = current_a + altitude_change
        new_altitude = new_a - EARTH_RADIUS
        
        
        new_n_rad_per_sec = sqrt(MU_EARTH / (new_a ** 3))
        new_n_revs_per_day = new_n_rad_per_sec * (86400.0 / (2 * pi))
        
        
        final_line_2 = update_line2_mean_motion(request.currentTle2, new_n_revs_per_day)
        
        return OrbitAdjustResponse(
            newTle1=request.currentTle1,
            newTle2=final_line_2,
            newAltitude=round(new_altitude, 2)
        )
        
    except Exception as e:
        print(f"Błąd fizyki orbitalnej: {e}")
        return OrbitAdjustResponse(
            newTle1=request.currentTle1,
            newTle2=request.currentTle2,
            newAltitude=400.0
        )

def find_conjunctions(request: ConjunctionRequest) -> List[ConjunctionResponse]:
    results = []
    now = datetime.now(timezone.utc)
    
    
    t_array = ts.utc(now.year, now.month, now.day, now.hour, range(now.minute, now.minute + 3 * 24 * 60, 10))

    
    fleet_positions = {}
    for sat_req in request.fleet:
        try:
            sat = EarthSatellite(sat_req.line1, sat_req.line2, sat_req.name, ts)
            fleet_positions[sat_req] = sat.at(t_array)
        except Exception:
            continue

    debris_positions = {}
    for deb_req in request.debris:
        try:
            deb = EarthSatellite(deb_req.line1, deb_req.line2, deb_req.name, ts)
            debris_positions[deb_req] = deb.at(t_array)
        except Exception:
            continue

    for sat_req, pos1 in fleet_positions.items():
        for deb_req, pos2 in debris_positions.items():
            try:
                dist_array = (pos1 - pos2).distance().km
                min_idx = dist_array.argmin()
                min_dist = dist_array[min_idx]
                
                if min_dist < 50.0:
                    tca_time = t_array[min_idx].utc_datetime()
                    prob = max(0.01, min(99.9, 100.0 / (min_dist + 0.1))) 
                    
                    if min_dist < 2.0: risk = "CRITICAL"
                    elif min_dist < 10.0: risk = "HIGH"
                    elif min_dist < 30.0: risk = "MEDIUM"
                    else: risk = "LOW"
                        
                    results.append(ConjunctionResponse(
                        ourSatelliteId=sat_req.id,
                        threatCatalogId=deb_req.id,
                        threatName=deb_req.name,
                        timeOfClosestApproach=tca_time.isoformat(),
                        missDistanceKm=round(float(min_dist), 2),
                        collisionProbability=round(float(prob), 2),
                        riskLevel=risk
                    ))
            except Exception:
                continue
    
    fleet_keys = list(fleet_positions.keys())
    for i in range(len(fleet_keys)):
        for j in range(i + 1, len(fleet_keys)): 
            sat1_req = fleet_keys[i]
            sat2_req = fleet_keys[j]
            pos1 = fleet_positions[sat1_req]
            pos2 = fleet_positions[sat2_req]
            
            try:
                dist_array = (pos1 - pos2).distance().km
                min_idx = dist_array.argmin()
                min_dist = dist_array[min_idx]
                
                if min_dist < 50.0:
                    tca_time = t_array[min_idx].utc_datetime()
                    prob = max(0.01, min(99.9, 100.0 / (min_dist + 0.1)))
                    
                    if min_dist < 2.0: risk = "CRITICAL"
                    elif min_dist < 10.0: risk = "HIGH"
                    elif min_dist < 30.0: risk = "MEDIUM"
                    else: risk = "LOW"
                    
                    
                    sat1_norad_id = sat1_req.line1[2:7].strip()
                    sat2_norad_id = sat2_req.line1[2:7].strip()

                    
                    results.append(ConjunctionResponse(
                        ourSatelliteId=sat1_req.id,
                        threatCatalogId=sat2_norad_id,
                        threatName=sat2_req.name,
                        timeOfClosestApproach=tca_time.isoformat(),
                        missDistanceKm=round(float(min_dist), 2),
                        collisionProbability=round(float(prob), 2),
                        riskLevel=risk
                    ))
                    
                    results.append(ConjunctionResponse(
                        ourSatelliteId=sat2_req.id,
                        threatCatalogId=sat1_norad_id,
                        threatName=sat1_req.name,
                        timeOfClosestApproach=tca_time.isoformat(),
                        missDistanceKm=round(float(min_dist), 2),
                        collisionProbability=round(float(prob), 2),
                        riskLevel=risk
                    ))
            except Exception:
                continue
                
    return results