import psycopg2
import random
from faker import Faker
from datetime import datetime, timezone, timedelta
from skyfield.api import load, EarthSatellite

# ================= KONFIGURACJA =================
import os
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = "wisfcc_db"      
DB_USER = "postgres"
DB_PASS = "admin"          

NUM_USERS = 20
NUM_SPACE_OBJECTS = 100     
NUM_TELEMETRY = 1          
NUM_ANOMALIES = 15         
NUM_GENERATED_COLLISIONS = 6 # Liczba dodatkowo generowanych kolizji losowych z debris
# ================================================

fake = Faker()

# To jest wygenerowany przez BCrypt hasz dla hasła "admin12"
DEFAULT_HASH = "$2a$12$LxVsGAMEpSlbhlXf7/DJe.hf28U2k0yk2JxFkxUdku73iJnFBlOi."
DEFAULT_GUEST_HASH = "$2a$12$VtB0ExPSjuTz3wjzQ4bkb.8Clqp5MOfCIoQFTNOkLmgwwXsTnUsAG"

ROLES = ["ADMIN", "OPERATOR", "GUEST"]
ACTIVE_TYPES = ["SATELLITE", "SPACE_STATION"]

ts = load.timescale()
MU_EARTH = 398600.4418
EARTH_RADIUS = 6371.0

# ====================================================================
# ASTRODYNAMICZNY generator linii TLE (Zgodny z III Prawem Keplera)
# ====================================================================

def calculate_tle_checksum(line: str) -> str:
    """Oblicza sumę kontrolną TLE dla linii (ostatni znak)."""
    checksum = 0
    for char in line[:-1]:
        if char.isdigit():
            checksum += int(char)
        elif char == '-':
            checksum += 1
    return str(checksum % 10)

def generate_keplerian_tle(cat_id: str, inc: float, raan: float, arg_pe: float, mean_anom: float, alt_km: float, now: datetime) -> tuple:
    """Generuje w pełni poprawne fizycznie i strukturalnie linie TLE na podstawie wysokości."""
    a = EARTH_RADIUS + alt_km
    n_rad_s = (MU_EARTH / (a**3))**0.5
    n_rev_day = n_rad_s * (86400.0 / (2.0 * 3.141592653589793))
    
    # Dynamiczny zapis epoki (NOW) zapobiegający dryfowi SGP4
    year_short = now.strftime("%y")
    day_of_year = now.timetuple().tm_yday
    fractional_day = (now.hour / 24.0) + (now.minute / 1440.0) + (now.second / 86400.0)
    epoch_str = f"{year_short}{day_of_year + fractional_day:012.8f}"
    
    cat_id_str = f"{int(cat_id):05d}"
    inc_str = f"{inc:8.4f}"
    raan_str = f"{raan:8.4f}"
    arg_pe_str = f"{arg_pe:8.4f}"
    mean_anom_str = f"{mean_anom % 360.0:8.4f}"
    n_rev_day_str = f"{n_rev_day:11.8f}"
    
    line1_base = f"1 {cat_id_str}U 98067A   {epoch_str}  .00016717  00000-0  30222-3 0  999"
    line1_base = line1_base[:68].ljust(68)
    checksum1 = calculate_tle_checksum(line1_base + " ")
    line1 = line1_base + checksum1
    
    # Eccentricity wymuszone na 0000000 (idealne koło) dla stabilności synchronizacji
    line2_base = f"2 {cat_id_str} {inc_str} {raan_str} 0000000 {arg_pe_str} {mean_anom_str} {n_rev_day_str}0102"
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
        line1, line2 = generate_keplerian_tle(cat_id, inc, raan, 0.0, m0, alt_km, now_datetime)
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
        line1, line2 = generate_keplerian_tle(cat_id, inc, raan, 0.0, mid, alt_km, now_datetime)
        sat = EarthSatellite(line1, line2, "Temp", ts)
        pos = sat.at(t1_utc)
        x, y, z = pos.position.km
        if z < 0:
            low = mid
        else:
            high = mid
    return (low + high) / 2.0

def generate():
    print("🚀 [START] Inicjalizacja zintegrowanego generatora WISFCC...")
    now = datetime.now(timezone.utc)
    try:
        conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
        cursor = conn.cursor()

        print("Czyszczenie starych danych (TRUNCATE)...")
        cursor.execute("TRUNCATE TABLE system_anomalies, collision_events, telemetry, space_objects, users RESTART IDENTITY CASCADE")

        print("Tworzenie stałego konta: admin (hasło: admin12)")
        cursor.execute(
            """INSERT INTO users (username, password, role, account_status, clearance, created_at) 
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            ("admin", DEFAULT_HASH, "ADMIN", "ACTIVE", "LEVEL_5")
        )

        print("Tworzenie stałego konta Gościa: guest (uprawnienia tylko do Dashboardu)")
        cursor.execute(
            """INSERT INTO users (username, password, role, account_status, clearance, created_at) 
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            ("guest", DEFAULT_GUEST_HASH, "GUEST", "ACTIVE", "LEVEL_1")
        )

        print(f"Generowanie {NUM_USERS} dodatkowych losowych użytkowników (w tym ról GUEST)...")
        for _ in range(NUM_USERS):
            username = fake.unique.user_name()
            role = random.choice(ROLES)
            clearance = "LEVEL_5" if role == "ADMIN" else "LEVEL_3"
            
            cursor.execute(
                """INSERT INTO users (username, password, role, account_status, clearance, created_at) 
                   VALUES (%s, %s, %s, %s, %s, NOW())""",
                (username, DEFAULT_HASH, role, "ACTIVE", clearance)
            )

        print(f"Generowanie {NUM_SPACE_OBJECTS} obiektów kosmicznych na różnych wysokościach (300 - 1500 km)...")
        obj_ids = []
        active_obj_ids = [] 
        active_obj_details = {} 
        
        unique_catalog_ids = random.sample(range(10000, 89999), NUM_SPACE_OBJECTS)
        
        for i in range(NUM_SPACE_OBJECTS):
            cat_id = str(unique_catalog_ids[i])
            name = f"{fake.word().upper()}-{random.randint(1,99)}"
            
            if random.random() < 0.8:
                obj_type = random.choice(ACTIVE_TYPES)
                status = "ONLINE"
            else:
                obj_type = "DEBRIS"
                status = "DECAYED"
            
            inc = random.uniform(0.0, 180.0)      
            raan = random.uniform(0.0, 360.0)     
            mean_anom = random.uniform(0.0, 360.0) 
            alt = random.uniform(300.0, 1500.0)
            lat = random.uniform(-90.0, 90.0)
            lon = random.uniform(-180.0, 180.0)
            
            tle1, tle2 = generate_keplerian_tle(cat_id, inc, raan, 58.2618, mean_anom, alt, now)
            
            cursor.execute(
                """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()) RETURNING id""",
                (cat_id, name, obj_type, status, tle1, tle2, lat, lon, alt)
            )
            inserted_id = cursor.fetchone()[0]
            obj_ids.append(inserted_id)
            if obj_type in ACTIVE_TYPES:
                active_obj_ids.append(inserted_id)
                active_obj_details[inserted_id] = {"catalog_id": cat_id, "name": name, "inc": inc, "raan": raan, "alt": alt}

        generated_active_ids = active_obj_ids.copy()

        # ====================================================================
        # SCENARIUSZ 1: Satelita skazany na zderzenie w bazie za 2 minuty
        # ====================================================================
        print("Wstrzykiwanie scenariusza 1: Satelita skazany na zderzenie (Precyzyjny SGP4)...")
        doomed_cat_id = "77777"
        doomed_name = "SAT-DOOMED-1"
        doomed_alt = 400.0
        doomed_t_min = 2.0
        
        tca_doomed_utc = ts.from_datetime(now + timedelta(minutes=doomed_t_min))
        
        # Wyznaczamy TLE dla aktywnego satelity
        inc_doomed = 51.6418
        raan_doomed = 24.7563
        anom_doomed = solve_initial_anomaly(doomed_cat_id, inc_doomed, raan_doomed, doomed_alt, tca_doomed_utc, now)
        tle1_doomed, tle2_doomed = generate_keplerian_tle(doomed_cat_id, inc_doomed, raan_doomed, 0.0, anom_doomed, doomed_alt, now)
        
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, %s, %s, %s, %s, 50.0, 20.0, %s, NOW()) RETURNING id""",
            (doomed_cat_id, doomed_name, "SATELLITE", "ONLINE", tle1_doomed, tle2_doomed, doomed_alt)
        )
        doomed_id = cursor.fetchone()[0]
        obj_ids.append(doomed_id)
        active_obj_ids.append(doomed_id)
        active_obj_details[doomed_id] = {"catalog_id": doomed_cat_id, "name": doomed_name, "inc": inc_doomed, "raan": raan_doomed, "alt": doomed_alt}
        
        # Tworzymy fizyczny DEBRIS lecący z naprzeciwka (czołowo) na tej samej wysokości
        doomed_threat_cat = "99992"
        doomed_threat_name = "DEBRIS HEAD-ON SHRAPNEL (ID 99992)"
        inc_threat = 180.0 - inc_doomed
        raan_threat = raan_doomed
        anom_threat = solve_initial_anomaly(doomed_threat_cat, inc_threat, raan_threat, doomed_alt, tca_doomed_utc, now)
        tle1_threat, tle2_threat = generate_keplerian_tle(doomed_threat_cat, inc_threat, raan_threat, 0.0, anom_threat, doomed_alt, now)
        
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, 'DEBRIS', 'DECAYED', %s, %s, 50.0, 20.0, %s, NOW()) RETURNING id""",
            (doomed_threat_cat, doomed_threat_name, tle1_threat, tle2_threat, doomed_alt)
        )
        doomed_thr_id = cursor.fetchone()[0]
        obj_ids.append(doomed_thr_id)
        
        # Telemetria dla dooma
        cursor.execute("""INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) VALUES (%s, 0.0, 0.0, %s, 100.0, NOW())""", (doomed_id, doomed_alt))
        cursor.execute("""INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) VALUES (%s, 0.0, 0.0, %s, 0.0, NOW())""", (doomed_thr_id, doomed_alt))
        
        cursor.execute(
            """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
               VALUES (%s, %s, %s, %s, NOW() + INTERVAL '2 minutes', 0.15, 98.4, 'CRITICAL', false)""",
            ("CAS-AUTO-77777", doomed_id, doomed_threat_cat, doomed_threat_name)
        )

        # ====================================================================
        # SCENARIUSZ 2: Sparowane TLE do automatycznych obliczeń w Pythonie
        # ====================================================================
        print("Wstrzykiwanie scenariusza 2: Sparowane TLE do symulacji orbitalnej...")
        match_sat_cat_id = "88888"
        match_sat_name = "SAT-ORBIT-MATCH"
        
        # Wyznaczamy parametry za pomocą Solvera z jawną wysokością 420 km!
        tca_match_utc = ts.from_datetime(now + timedelta(minutes=5.0)) # Przykładowy czas spotkania
        anom_match = solve_initial_anomaly(match_sat_cat_id, 51.6418, 24.7563, 420.0, tca_match_utc, now)
        tle_match_1, tle_match_2 = generate_keplerian_tle(match_sat_cat_id, 51.6418, 24.7563, 0.0, anom_match, 420.0, now)
        
        # POPRAWIONO: Dodano brakującą wysokość 420.0 na końcu krotki parametrów!
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, %s, %s, %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
            (match_sat_cat_id, match_sat_name, "SATELLITE", "ONLINE", tle_match_1, tle_match_2, 420.0)
        )
        match_sat_id = cursor.fetchone()[0]
        obj_ids.append(match_sat_id)
        active_obj_ids.append(match_sat_id)
        active_obj_details[match_sat_id] = {"catalog_id": match_sat_cat_id, "name": match_sat_name, "inc": 51.6418, "raan": 24.7563, "alt": 420.0}
        
        match_deb_cat_id = "88889"
        match_deb_name = "DEBRIS-ORBIT-MATCH"
        tle_match_deb1, tle_match_deb2 = generate_keplerian_tle(match_deb_cat_id, 51.6418, 24.7563, 0.0, anom_match, 420.0, now)
        
        # POPRAWIONO: Dodano brakującą wysokość 420.0 na końcu krotki parametrów!
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, %s, %s, %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
            (match_deb_cat_id, match_deb_name, "DEBRIS", "DECAYED", tle_match_deb1, tle_match_deb2, 420.0)
        )
        obj_ids.append(cursor.fetchone()[0])

        # ====================================================================
        # GENEROWANIE TELEMETRII POCZĄTKOWEJ DLA ZWYKŁYCH OBIEKTÓW
        # ====================================================================
        print(f"Generowanie telemetrii ({NUM_TELEMETRY} wpisów na obiekt)...")
        for obj_id in obj_ids:
            if obj_id not in [doomed_id, doomed_thr_id, match_sat_id]:
                cursor.execute(
                    """INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) 
                       VALUES (%s, 0.0, 0.0, %s, 100.0, NOW())""",
                    (obj_id, 400.0)
                )

        # ====================================================================
        # GENEROWANIE LOSOWYCH ANOMALII (DLA RAPORTÓW - ZOPTYMALIZOWANE)
        # ====================================================================
        print(f"Generowanie {NUM_ANOMALIES} anomalii telemetrycznych dla aktywnej floty...")
        
        ANOMALY_TYPES = [
            "COMMUNICATION DROPOUT", 
            "POWER SPIKE", 
            "BATTERY CRITICAL DROP", 
            "THERMAL ANOMALY OVERHEAT", 
            "ATTITUDE SENSOR DRIFT"
        ]
        SEVERITIES = ["WARNING", "CRITICAL"]
        STATUSES = ["RESOLVED", "INVESTIGATING", "OPEN"]

        if active_obj_ids:
            for idx in range(NUM_ANOMALIES):
                incident_id = f"ERR-{100 + idx:03d}"
                target_sat_id = random.choice(active_obj_ids)
                anomaly_type = random.choice(ANOMALY_TYPES)
                severity = random.choice(SEVERITIES)
                status = random.choice(STATUSES) if severity == "WARNING" else random.choice(["INVESTIGATING", "OPEN"])
                
                days_ago = random.uniform(0.1, 6.8)
                days_ago_str = f"{days_ago} days"
                
                cursor.execute(
                    """INSERT INTO system_anomalies (incident_id, timestamp, space_object_id, anomaly_type, severity, status) 
                       VALUES (%s, NOW() - %s::interval, %s, %s, %s, %s)""",
                    (incident_id, days_ago_str, target_sat_id, anomaly_type, severity, status)
                )

        # ====================================================================
        # GENERATOR KOLIZJI Z DEBRIS (LOSOWYCH, ALE DOPASOWANYCH FIZYCZNIE DO 2H)
        # ====================================================================
        print(f"Generowanie {NUM_GENERATED_COLLISIONS} dynamicznych i FIZYCZNIE POPRAWNYCH kolizji z debris (Max: 2h)...")
        
        THREAT_NAMES = [
            "COSMOS 2251 DEBRIS", "FENGYUN 1C DEBRIS", "METEOR SWARM SHRAPNEL", 
            "ASTEROID FRAGMENT", "UPPER STAGE BOOSTER", "SL-12 ROCKET BODY", 
            "IRIDIUM 33 DEBRIS"
        ]

        if generated_active_ids:
            sats_for_debris = random.sample(generated_active_ids, min(NUM_GENERATED_COLLISIONS, len(generated_active_ids)))
            for idx, target_sat_id in enumerate(sats_for_debris):
                sat_info = active_obj_details[target_sat_id]
                
                time_minutes = round(random.uniform(5.0, 120.0), 2)
                interval_str = f"{time_minutes} minutes"
                tca_utc = ts.from_datetime(now + timedelta(minutes=time_minutes))
                
                threat_cat_id = str(95000 + idx)
                
                is_head_on = random.choice([True, False])
                if is_head_on:
                    inc_thr = 180.0 - sat_info["inc"]
                    raan_thr = sat_info["raan"]
                    threat_desc = f"DEBRIS HEAD-ON SHRAPNEL (ID {threat_cat_id})"
                else:
                    inc_thr = 90.0
                    raan_thr = sat_info["raan"]
                    threat_desc = f"DEBRIS CROSSING FRAGMENT (ID {threat_cat_id})"
                
                anom_thr = solve_initial_anomaly(threat_cat_id, inc_thr, raan_thr, sat_info["alt"], tca_utc, now)
                tle1_thr, tle2_thr = generate_keplerian_tle(threat_cat_id, inc_thr, raan_thr, 0.0, anom_thr, sat_info["alt"], now)
                
                cursor.execute(
                    """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
                       VALUES (%s, %s, 'DEBRIS', 'DECAYED', %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
                    (threat_cat_id, threat_desc, tle1_thr, tle2_thr, sat_info["alt"])
                )
                thr_id = cursor.fetchone()[0]
                obj_ids.append(thr_id)
                
                cursor.execute(
                    """INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) 
                       VALUES (%s, 0.0, 0.0, %s, 0.0, NOW())""",
                    (thr_id, sat_info["alt"])
                )
                
                miss_distance = round(random.uniform(0.01, 1.8), 2)
                probability = round(random.uniform(70.0, 99.9), 2)
                
                event_id = f"CAS-RAND-DEB-{idx:03d}"
                cursor.execute(
                    """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
                       VALUES (%s, %s, %s, %s, NOW() + %s::interval, %s, %s, 'CRITICAL', false)""",
                    (event_id, target_sat_id, threat_cat_id, threat_desc, interval_str, miss_distance, probability)
                )

        # ====================================================================
        # NOWE: 5 WBUDOWANYCH PAR (10 SATELITÓW/STACJI) KOLIDUJĄCYCH ZE SOBĄ
        # ====================================================================
        print("Wstrzykiwanie 5 wbudowanych par (10 satelitów/stacji) kolidujących ze sobą (99%+) do 2 godzin...")
        
        static_sat_pairs = [
            # Para 1: POLARIS-A vs POLARIS-B (Wysokość: 400 km)
            {
                "sat1": {"cat_id": "10001", "name": "SAT-POLARIS-A", "type": "SATELLITE", "alt": 400.0, "inc": 51.6, "raan": 30.0, "anom": 10.0},
                "sat2": {"cat_id": "10002", "name": "SAT-POLARIS-B", "type": "SATELLITE", "alt": 400.0, "inc": 51.6, "raan": 30.0, "anom": 10.01}, 
                "collision": {"event_id_prefix": "CAS-STATIC-PLR", "time": "3 minutes", "t_min": 3.0, "miss": 0.01, "prob": 99.9}
            },
            # Para 2: ALPHA-STATION vs OSIRIS-1 (Wysokość: 550 km)
            {
                "sat1": {"cat_id": "10003", "name": "ALPHA-STATION", "type": "SPACE_STATION", "alt": 550.0, "inc": 45.0, "raan": 120.0, "anom": 45.0},
                "sat2": {"cat_id": "10004", "name": "SAT-OSIRIS-1", "type": "SATELLITE", "alt": 550.0, "inc": 45.0, "raan": 120.0, "anom": 45.02},
                "collision": {"event_id_prefix": "CAS-STATIC-OSR", "time": "5 minutes", "t_min": 5.0, "miss": 0.02, "prob": 99.8}
            },
            # Para 3: SAT-VANGUARD vs BETA-STATION (Wysokość: 700 km)
            {
                "sat1": {"cat_id": "10005", "name": "SAT-VANGUARD", "type": "SATELLITE", "alt": 700.0, "inc": 98.0, "raan": 250.0, "anom": 180.0},
                "sat2": {"cat_id": "10006", "name": "BETA-STATION", "type": "SPACE_STATION", "alt": 700.0, "inc": 98.0, "raan": 250.0, "anom": 180.03},
                "collision": {"event_id_prefix": "CAS-STATIC-VNG", "time": "10 minutes", "t_min": 10.0, "miss": 0.03, "prob": 99.9}
            },
            # Para 4: GALAXY-X vs GALAXY-Y (Wysokość: 900 km, Skrócone z 1h do 60 min)
            {
                "sat1": {"cat_id": "10007", "name": "SAT-GALAXY-X", "type": "SATELLITE", "alt": 900.0, "inc": 30.0, "raan": 15.0, "anom": 90.0},
                "sat2": {"cat_id": "10008", "name": "SAT-GALAXY-Y", "type": "SATELLITE", "alt": 900.0, "inc": 30.0, "raan": 15.0, "anom": 90.05},
                "collision": {"event_id_prefix": "CAS-STATIC-GLX", "time": "60 minutes", "t_min": 60.0, "miss": 0.05, "prob": 99.6}
            },
            # Para 5: ISS-ZARYA vs TIANGONG (Wysokość: 1100 km, Skrócone z 2h do 120 min)
            {
                "sat1": {"cat_id": "10009", "name": "ISS-ZARYA-MOCK", "type": "SPACE_STATION", "alt": 1100.0, "inc": 75.0, "raan": 340.0, "anom": 270.0},
                "sat2": {"cat_id": "10010", "name": "TIANGONG-MOCK", "type": "SPACE_STATION", "alt": 1100.0, "inc": 75.0, "raan": 340.0, "anom": 270.08},
                "collision": {"event_id_prefix": "CAS-STATIC-TNG", "time": "120 minutes", "t_min": 120.0, "miss": 0.08, "prob": 99.5}
            }
        ]

        for pair in static_sat_pairs:
            s1 = pair["sat1"]
            s2 = pair["sat2"]
            col = pair["collision"]
            
            tca_static_utc = ts.from_datetime(now + timedelta(minutes=col["t_min"]))
            
            anom_s1 = solve_initial_anomaly(s1["cat_id"], s1["inc"], s1["raan"], s1["alt"], tca_static_utc, now)
            
            inc_s2_headon = 180.0 - s1["inc"]
            raan_s2_headon = s1["raan"]
            anom_s2 = solve_initial_anomaly(s2["cat_id"], inc_s2_headon, raan_s2_headon, s2["alt"], tca_static_utc, now)
            
            tle1_s1, tle2_s1 = generate_keplerian_tle(s1["cat_id"], s1["inc"], s1["raan"], 0.0, anom_s1, s1["alt"], now)
            tle1_s2, tle2_s2 = generate_keplerian_tle(s2["cat_id"], inc_s2_headon, raan_s2_headon, 0.0, anom_s2, s2["alt"], now)
            
            cursor.execute(
                """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
                   VALUES (%s, %s, %s, 'ONLINE', %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
                (s1["cat_id"], s1["name"], s1["type"], tle1_s1, tle2_s1, s1["alt"])
            )
            s1_id = cursor.fetchone()[0]
            obj_ids.append(s1_id)
            active_obj_ids.append(s1_id)
            active_obj_details[s1_id] = {"catalog_id": s1["cat_id"], "name": s1["name"], "inc": s1["inc"], "raan": s1["raan"], "alt": s1["alt"]}
            
            cursor.execute(
                """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
                   VALUES (%s, %s, %s, 'ONLINE', %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
                (s2["cat_id"], s2["name"], s2["type"], tle1_s2, tle2_s2, s2["alt"])
            )
            s2_id = cursor.fetchone()[0]
            obj_ids.append(s2_id)
            active_obj_ids.append(s2_id)
            active_obj_details[s2_id] = {"catalog_id": s2["cat_id"], "name": s2["name"], "inc": inc_s2_headon, "raan": raan_s2_headon, "alt": s2["alt"]}
            
            cursor.execute(
                """INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) 
                   VALUES (%s, 0.0, 0.0, %s, 100.0, NOW())""",
                (s1_id, s1["alt"])
            )
            cursor.execute(
                """INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) 
                   VALUES (%s, 0.0, 0.0, %s, 100.0, NOW())""",
                (s2_id, s2["alt"])
            )
            
            cursor.execute(
                """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
                   VALUES (%s, %s, %s, %s, NOW() + %s::interval, %s, %s, 'CRITICAL', false)""",
                (f"{col['event_id_prefix']}-A", s1_id, s2["cat_id"], s2["name"], col["time"], col["miss"], col["prob"])
            )
            cursor.execute(
                """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
                   VALUES (%s, %s, %s, %s, NOW() + %s::interval, %s, %s, 'CRITICAL', false)""",
                (f"{col['event_id_prefix']}-B", s2_id, s1["cat_id"], s1["name"], col["time"], col["miss"], col["prob"])
            )

        # ====================================================================
        # NOWE: 5 LOSOWYCH DWUSTRONNYCH KOLIZJI (Satelita <=> Satelita) 99%+
        # ====================================================================
        print("Wstrzykiwanie 5 losowych obustronnych kolizji satelitów wewnątrz wygenerowanej floty...")
        if len(generated_active_ids) >= 10:
            chosen_random_pairs = random.sample(generated_active_ids, 10)
            for idx in range(5):
                s1_id = chosen_random_pairs[idx * 2]
                s2_id = chosen_random_pairs[idx * 2 + 1]
                
                s1_info = active_obj_details[s1_id]
                s2_info = active_obj_details[s2_id]
                
                event_id_prefix = f"CAS-RAND-SS-{300 + idx:03d}"
                
                time_minutes = round(random.uniform(5.0, 120.0), 2)
                interval_str = f"{time_minutes} minutes"
                tca_rand_utc = ts.from_datetime(now + timedelta(minutes=time_minutes))
                
                inc_s1 = s1_info["inc"]
                raan_s1 = s1_info["raan"]
                anom_s1 = solve_initial_anomaly(s1_info["catalog_id"], inc_s1, raan_s1, s1_info["alt"], tca_rand_utc, now)
                
                inc_s2_headon = 180.0 - inc_s1
                raan_s2 = raan_s1
                anom_s2 = solve_initial_anomaly(s2_info["catalog_id"], inc_s2_headon, raan_s2, s2_info["alt"], tca_rand_utc, now)
                
                tle1_s1, tle2_s1 = generate_keplerian_tle(s1_info["catalog_id"], inc_s1, raan_s1, 0.0, anom_s1, s1_info["alt"], now)
                tle1_s2, tle2_s2 = generate_keplerian_tle(s2_info["catalog_id"], inc_s2_headon, raan_s2, 0.0, anom_s2, s2_info["alt"], now)
                
                cursor.execute("UPDATE space_objects SET tle_line1 = %s, tle_line2 = %s WHERE id = %s", (tle1_s1, tle2_s1, s1_id))
                cursor.execute("UPDATE space_objects SET tle_line1 = %s, tle_line2 = %s WHERE id = %s", (tle1_s2, tle2_s2, s2_id))
                
                miss_distance = round(random.uniform(0.01, 0.20), 2)
                probability = round(random.uniform(99.0, 99.9), 2)
                
                cursor.execute(
                    """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
                       VALUES (%s, %s, %s, %s, NOW() + %s::interval, %s, %s, 'CRITICAL', false)""",
                    (f"{event_id_prefix}-A", s1_id, s2_info["catalog_id"], s2_info["name"], interval_str, miss_distance, probability)
                )
                cursor.execute(
                    """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
                       VALUES (%s, %s, %s, %s, NOW() + %s::interval, %s, %s, 'CRITICAL', false)""",
                    (f"{event_id_prefix}-B", s2_id, s1_info["catalog_id"], s1_info["name"], interval_str, miss_distance, probability)
                )

        conn.commit()
        cursor.close()
        conn.close()
        print(f"Sukces! Wygenerowano {len(obj_ids)} obiektów na różnych wysokościach, telemetrię, anomalie, kolizje z debris oraz 10 zderzeń Satelita <=> Satelita.")

    except Exception as e:
        print("Nie udało się połączyć lub wystąpił błąd zapisu.")
        safe_error = str(e).encode('ascii', 'ignore').decode('ascii')
        print("Szczegóły błędu:", safe_error)

if __name__ == "__main__":
    generate()