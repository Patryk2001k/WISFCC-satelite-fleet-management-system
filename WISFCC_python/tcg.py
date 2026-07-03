import psycopg2
import random
import json
import os
from datetime import datetime, timezone, timedelta
from skyfield.api import load, EarthSatellite

# ================= KONFIGURACJA =================
DB_HOST = "localhost"
DB_NAME = "wisfcc_db"      
DB_USER = "postgres"
DB_PASS = "admin"          
# ================================================

# Hashe haseł
DEFAULT_HASH = "$2a$12$LxVsGAMEpSlbhlXf7/DJe.hf28U2k0yk2JxFkxUdku73iJnFBlOi." # admin12
DEFAULT_GUEST_HASH = "$2a$12$VtB0ExPSjuTz3wjzQ4bkb.8Clqp5MOfCIoQFTNOkLmgwwXsTnUsAG" # admin12

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
    # AUTOMATYZACJA: Wygenerowanie pliku z dynamicznymi zderzeniami (50 sztuk)
    print("🔍 Generuję dynamiczne scenariusze SGP4...")
    import collision_solver
    collision_solver.solve_all_scenarios()

    print("📖 Wczytywanie zsynchronizowanych obliczeń SGP4 z test_scenarios.json...")
    with open("test_scenarios.json", "r") as f:
        scenarios = json.load(f)

    print("Łączenie z bazą PostgreSQL...")
    try:
        conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
        cursor = conn.cursor()
        now = datetime.now(timezone.utc)

        print("🧹 Czyszczenie starych danych (TRUNCATE CASCADE)...")
        cursor.execute("TRUNCATE TABLE system_anomalies, collision_events, telemetry, space_objects, users RESTART IDENTITY CASCADE")

        print("👤 Tworzenie kont testowych: admin, guest (hasło: admin12)")
        cursor.execute(
            """INSERT INTO users (username, password, role, account_status, clearance, created_at) 
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            ("admin", DEFAULT_HASH, "ADMIN", "ACTIVE", "LEVEL_5")
        )
        cursor.execute(
            """INSERT INTO users (username, password, role, account_status, clearance, created_at) 
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            ("guest", DEFAULT_GUEST_HASH, "GUEST", "ACTIVE", "LEVEL_1")
        )

        obj_ids = []
        active_obj_ids = []
        active_obj_details = {}

        # ====================================================================
        # SCENARIUSZ 1: Satelita skazany na zderzenie w bazie za 2 minuty
        # ====================================================================
        print("Wstrzykiwanie scenariusza 1: Satelita skazany na zderzenie (Precyzyjny SGP4)...")
        doomed_cat_id = "77777"
        doomed_name = "SAT-DOOMED-1"
        doomed_alt = 400.0
        doomed_t_min = 2.0
        
        tca_doomed_utc = ts.from_datetime(now + timedelta(minutes=doomed_t_min))
        
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
        
        # Fizyczny DEBRIS lecący z naprzeciwka (czołowo) na tej samej wysokości
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
        
        tca_match_utc = ts.from_datetime(now + timedelta(minutes=5.0))
        anom_match = solve_initial_anomaly(match_sat_cat_id, 51.6418, 24.7563, 420.0, tca_match_utc, now)
        tle_match_1, tle_match_2 = generate_keplerian_tle(match_sat_cat_id, 51.6418, 24.7563, 0.0, anom_match, 420.0, now)
        
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
        tle_match_deb1, tle_match_deb2 = generate_keplerian_tle(match_deb_cat_id, 51.6418, 24.7563, 0.0, 150.0, 420.0, now)
        
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, %s, %s, %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
            (match_deb_cat_id, match_deb_name, "DEBRIS", "DECAYED", tle_match_deb1, tle_match_deb2, 420.0)
        )
        obj_ids.append(cursor.fetchone()[0])

        # ====================================================================
        # NOWE: SCENARIUSZ 3: Satelita TEST-SAT-03 na sztywno, wybuch w 3 minuty
        # ====================================================================
        print("Wstrzykiwanie scenariusza 3: Satelita TEST-SAT-03 (Zderzenie czołowe za 3 minuty)...")
        test03_cat_id = "33333"
        test03_name = "TEST-SAT-03"
        test03_alt = 410.0
        test03_t_min = 3.0
        
        tca_test03_utc = ts.from_datetime(now + timedelta(minutes=test03_t_min))
        
        # Wyznaczamy TLE dla TEST-SAT-03
        inc_test03 = 51.6
        raan_test03 = 80.0
        anom_test03 = solve_initial_anomaly(test03_cat_id, inc_test03, raan_test03, test03_alt, tca_test03_utc, now)
        tle1_test03, tle2_test03 = generate_keplerian_tle(test03_cat_id, inc_test03, raan_test03, 0.0, anom_test03, test03_alt, now)
        
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, %s, %s, %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
            (test03_cat_id, test03_name, "SATELLITE", "ONLINE", tle1_test03, tle2_test03, test03_alt)
        )
        test03_id = cursor.fetchone()[0]
        obj_ids.append(test03_id)
        active_obj_ids.append(test03_id)
        active_obj_details[test03_id] = {"catalog_id": test03_cat_id, "name": test03_name, "inc": inc_test03, "raan": raan_test03, "alt": test03_alt}
        
        # Tworzymy fizyczny DEBRIS lecący czołowo
        test03_threat_cat = "93333"
        test03_threat_name = "CRITICAL SHRAPNEL (TEST-SAT-03 THREAT)"
        inc_threat_test03 = 180.0 - inc_test03
        raan_threat_test03 = raan_test03
        anom_threat_test03 = solve_initial_anomaly(test03_threat_cat, inc_threat_test03, raan_threat_test03, test03_alt, tca_test03_utc, now)
        tle1_threat_test03, tle2_threat_test03 = generate_keplerian_tle(test03_threat_cat, inc_threat_test03, raan_threat_test03, 0.0, anom_threat_test03, test03_alt, now)
        
        cursor.execute(
            """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
               VALUES (%s, %s, %s, %s, %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
            (test03_threat_cat, test03_threat_name, "DEBRIS", "DECAYED", tle1_threat_test03, tle2_threat_test03, test03_alt)
        )
        test03_thr_id = cursor.fetchone()[0]
        obj_ids.append(test03_thr_id)
        
        # Telemetria dla TEST-SAT-03 i śmiecia
        cursor.execute("""INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) VALUES (%s, 0.0, 0.0, %s, 100.0, NOW())""", (test03_id, test03_alt))
        cursor.execute("""INSERT INTO telemetry (space_object_id, latitude, longitude, altitude, battery_percent, timestamp) VALUES (%s, 0.0, 0.0, %s, 0.0, NOW())""", (test03_thr_id, test03_alt))
        
        # Alerty kolizyjne
        cursor.execute(
            """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
               VALUES (%s, %s, %s, %s, NOW() + INTERVAL '3 minutes', 0.01, 99.9, 'CRITICAL', false)""",
            ("CAS-STATIC-TEST-03", test03_id, test03_threat_cat, test03_threat_name)
        )

        print(f"Zasilanie bazy danych {len(scenarios)*2} obiektami o idealnej zgodności fizycznej...")
        for sc in scenarios:
            cursor.execute(
                """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
                   VALUES (%s, %s, %s, 'ONLINE', %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
                (sc["base_cat_id"], sc["name"], sc["type"], sc["tle1_act"], sc["tle2_act"], sc["alt"])
            )
            act_id = cursor.fetchone()[0]

            cursor.execute(
                """INSERT INTO space_objects (catalog_id, name, object_type, status, tle_line1, tle_line2, latitude, longitude, altitude, last_update) 
                   VALUES (%s, %s, %s, %s, %s, %s, 0.0, 0.0, %s, NOW()) RETURNING id""",
                (sc["threat_cat_id"], sc["threat_desc"], "DEBRIS", "DECAYED", sc["tle1_thr"], sc["tle2_thr"], sc["alt"])
            )
            thr_id = cursor.fetchone()[0]
            
            obj_ids.extend([act_id, thr_id])

            cursor.execute(
                """INSERT INTO collision_events (event_id, our_satellite_id, threat_catalog_id, threat_description, time_of_closest_approach_utc, miss_distance_km, collision_probability, risk_level, is_handled) 
                   VALUES (%s, %s, %s, %s, NOW() + %s::interval, %s, %s, 'CRITICAL', false)""",
                (f"CAS-TEST-{sc['id']:03d}", act_id, sc["threat_cat_id"], sc["threat_desc"], sc["time_str"])
            )

        # ====================================================================
        # GENEROWANIE TELEMETRII POCZĄTKOWEJ DLA POZOSTAŁYCH OBIEKTÓW
        # ====================================================================
        print("Generowanie telemetrii początkowej...")
        for obj_id in obj_ids:
            if obj_id not in [doomed_id, doomed_thr_id, match_sat_id, test03_id, test03_thr_id]:
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

        conn.commit()
        cursor.close()
        conn.close()
        print(f"Sukces! Wygenerowano {len(obj_ids)} obiektów, anomalie, 50 kolizji z debris oraz stały przypadek TEST-SAT-03.")

    except Exception as e:
        print("❌ [BŁĄD] Nie udało się połączyć lub zapisać danych.")
        safe_error = str(e).encode('ascii', 'ignore').decode('ascii')
        print("Szczegóły błędu:", safe_error)

if __name__ == "__main__":
    generate()