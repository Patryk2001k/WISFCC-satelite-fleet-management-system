import json
import random
from datetime import datetime, timezone, timedelta
from skyfield.api import load, EarthSatellite

ts = load.timescale()
MU_EARTH = 398600.4418
EARTH_RADIUS = 6371.0

def calculate_tle_checksum(line: str) -> str:
    """Oblicza sumę kontrolną TLE dla linii."""
    checksum = 0
    for char in line[:-1]:
        if char.isdigit():
            checksum += int(char)
        elif char == '-':
            checksum += 1
    return str(checksum % 10)

def make_tle_base(cat_id: str, inc: float, raan: float, mean_anom: float, alt_km: float, now: datetime) -> tuple:
    """Tworzy bazowe linie TLE z wymuszoną kołową orbitą oraz dynamiczną epoką zapobiegającą dryfowi."""
    a = EARTH_RADIUS + alt_km
    n_rad_s = (MU_EARTH / (a**3))**0.5
    n_rev_day = n_rad_s * (86400.0 / (2.0 * 3.141592653589793))
    
    # Dynamiczny zapis epoki (NOW) podnoszący precyzję SGP4 do 100%
    year_short = now.strftime("%y")
    day_of_year = now.timetuple().tm_yday
    fractional_day = (now.hour / 24.0) + (now.minute / 1440.0) + (now.second / 86400.0)
    epoch_str = f"{year_short}{day_of_year + fractional_day:012.8f}"
    
    cat_id_str = f"{int(cat_id):05d}"
    inc_str = f"{inc:8.4f}"
    raan_str = f"{raan:8.4f}"
    mean_anom_str = f"{mean_anom % 360.0:8.4f}"
    n_rev_day_str = f"{n_rev_day:11.8f}"
    
    line1_base = f"1 {cat_id_str}U 98067A   {epoch_str}  .00016717  00000-0  30222-3 0  999"
    line1_base = line1_base[:68].ljust(68)
    checksum1 = calculate_tle_checksum(line1_base + " ")
    line1 = line1_base + checksum1
    
    line2_base = f"2 {cat_id_str} {inc_str} {raan_str} 0000000 000.0000 {mean_anom_str} {n_rev_day_str}0102"
    line2_base = line2_base[:68].ljust(68)
    checksum2 = calculate_tle_checksum(line2_base + " ")
    line2 = line2_base + checksum2
    
    return line1, line2

def solve_initial_anomaly(cat_id: str, inc: float, raan: float, alt_km: float, t1_utc, now_datetime) -> float:
    """
    Zaawansowany SOLVER NUMERYCZNY SGP4.
    Szuka anomalii startowej M0 tak, aby satelita przecinał równik dokładnie w czasie t1_utc.
    """
    best_m0 = 0
    min_z_error = float('inf')
    
    for m0 in range(0, 360, 5):
        line1, line2 = make_tle_base(cat_id, inc, raan, m0, alt_km, now_datetime)
        sat = EarthSatellite(line1, line2, "Temp", ts)
        pos = sat.at(t1_utc)
        x, y, z = pos.position.km
        vx, vy, vz = pos.velocity.km_per_s
        
        if vz > 0:
            err = abs(z)
            if err < min_z_error:
                min_z_error = err
                best_m0 = m0
                
    low = best_m0 - 5.0
    high = best_m0 + 5.0
    for _ in range(15):
        mid = (low + high) / 2.0
        line1, line2 = make_tle_base(cat_id, inc, raan, mid, alt_km, now_datetime)
        sat = EarthSatellite(line1, line2, "Temp", ts)
        pos = sat.at(t1_utc)
        x, y, z = pos.position.km
        
        if z < 0:
            low = mid
        else:
            high = mid
            
    return (low + high) / 2.0

def solve_all_scenarios():
    print("🧮 [SOLVER] Generowanie i obliczanie 50 dynamicznych zderzeń (Zakres: 5 min - 2 godz)...")
    now = datetime.now(timezone.utc)
    
    raw_configs = []
    for _ in range(50):
        t_min = round(random.uniform(5.0, 120.0), 2)
        alt = round(random.uniform(300.0, 1200.0), 2)
        is_head_on = random.choice([True, False])
        obj_type = random.choice(["SATELLITE", "SPACE_STATION"])
        raw_configs.append((t_min, alt, is_head_on, obj_type))
        
    raw_configs.sort(key=lambda x: x[0])
    
    collision_configs = []
    for idx, (t_min, alt, is_head_on, obj_type) in enumerate(raw_configs):
        i = idx + 1
        time_str = f"{t_min} minutes"
        name = f"TEST-SAT-{i:02d}" if obj_type == "SATELLITE" else f"TEST-STATION-{i:02d}"
        collision_configs.append({
            "id": i,
            "time_str": time_str,
            "t_min": t_min,
            "alt": alt,
            "is_head_on": is_head_on,
            "type": obj_type,
            "name": name
        })
        
    scenarios_data = []
    base_cat_id = 20000
    threat_cat_id = 90000
    
    for idx, config in enumerate(collision_configs):
        base_cat_id += 1
        threat_cat_id += 1
        
        t1_utc = ts.from_datetime(now + timedelta(minutes=config["t_min"]))
        
        inc_act = 50.0 + (idx * 1.5)
        raan_act = 100.0 + (idx * 5.0)
        
        # Przekazujemy 'now' do wyznaczenia idealnej epoki
        print(f" -> [{idx+1}/50] Obliczam zderzenie dla {config['name']} (TCA: za {config['time_str']})...")
        anom_act = solve_initial_anomaly(str(base_cat_id), inc_act, raan_act, config["alt"], t1_utc, now)
        
        if config["is_head_on"]:
            inc_thr = 180.0 - inc_act
            raan_thr = raan_act
            threat_desc = f"DEBRIS HEAD-ON SHRAPNEL (ID {threat_cat_id})"
        else:
            inc_thr = 90.0
            raan_thr = raan_act
            threat_desc = f"DEBRIS CROSSING FRAGMENT (ID {threat_cat_id})"
            
        anom_thr = solve_initial_anomaly(str(threat_cat_id), inc_thr, raan_thr, config["alt"], t1_utc, now)
        
        tle1_act, tle2_act = make_tle_base(str(base_cat_id), inc_act, raan_act, anom_act, config["alt"], now)
        tle1_thr, tle2_thr = make_tle_base(str(threat_cat_id), inc_thr, raan_thr, anom_thr, config["alt"], now)
        
        scenarios_data.append({
            "id": config["id"],
            "name": config["name"],
            "type": config["type"],
            "alt": config["alt"],
            "time_str": config["time_str"],
            "base_cat_id": str(base_cat_id),
            "tle1_act": tle1_act,
            "tle2_act": tle2_act,
            "threat_cat_id": str(threat_cat_id),
            "threat_desc": threat_desc,
            "tle1_thr": tle1_thr,
            "tle2_thr": tle2_thr
        })
        
    with open("test_scenarios.json", "w") as f:
        json.dump(scenarios_data, f, indent=4)
    print("💾 [SUKCES] Wygenerowano 50 chronologicznych scenariuszy i zapisano do test_scenarios.json")

if __name__ == "__main__":
    solve_all_scenarios()