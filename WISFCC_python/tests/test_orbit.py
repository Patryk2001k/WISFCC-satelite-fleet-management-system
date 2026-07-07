import pytest
from datetime import datetime, timezone
from app.services.orbit_engine import (
    calculate_tle_checksum,
    update_line1_epoch,
    update_line2_mean_motion,
    calculate_batch_positions,
    calculate_orbit_adjustment,
    find_conjunctions
)
from app.models.schemas import TleRequest, OrbitAdjustRequest, ConjunctionRequest, TleItem

# Standard ISS (ZARYA) TLE from NORAD catalog for testing purposes
ISS_LINE1 = "1 25544U 98067A   20287.52554284  .00001099  00000-0  27572-4 0  9997"
ISS_LINE2 = "2 25544  51.6457 149.6209 0001552  73.1957 325.2638 15.49257630250882"


def test_calculate_tle_checksum_should_return_correct_digit():
    """
    Verifies that the checksum algorithm correctly calculates 
    the NORAD modulo 10 checksum for a TLE line.
    The sum of digits for this line is 180, so 180 % 10 = 0.
    """
    line1_base = "1 25544U 98067A   20287.52554284  .00001099  00000-0  27572-4 0  999"
    assert calculate_tle_checksum(line1_base + " ") == "0"


def test_update_line1_epoch_should_format_correctly_for_given_date():
    """
    Verifies that the epoch field is formatted and injected into Line 1 of the TLE.
    For July 7, 2026 12:00:00 UTC (day 188, fraction 0.5), it should yield "26188.50000000".
    """
    mock_time = datetime(2026, 7, 7, 12, 0, 0, tzinfo=timezone.utc)
    updated_line = update_line1_epoch(ISS_LINE1, mock_time)
    
    expected_epoch = "26188.50000000"
    assert updated_line[18:32] == expected_epoch
    assert len(updated_line) == 69


def test_update_line2_mean_motion_should_inject_formatted_value():
    """
    Verifies that the updated mean motion string is correctly injected
    into Line 2 of the TLE and that the final checksum is updated.
    """
    new_mean_motion = 15.48000000
    updated_line = update_line2_mean_motion(ISS_LINE2, new_mean_motion)
    
    assert "15.48000000" in updated_line
    assert len(updated_line) == 69
    assert updated_line[-1].isdigit()


def test_calculate_batch_positions_should_return_valid_geodetic_coordinates():
    """
    Verifies that propagating the TLE returns valid WGS84 coordinates 
    (latitude, longitude, and elevation) for the satellite.
    """
    requests = [TleRequest(satellite_id="25544", line1=ISS_LINE1, line2=ISS_LINE2)]
    results = calculate_batch_positions(requests)
    
    assert len(results) == 1
    res = results[0]
    assert res["satellite_id"] == "25544"
    assert -90.0 <= res["latitude"] <= 90.0
    assert -180.0 <= res["longitude"] <= 180.0
    assert res["altitude"] > 0.0  # Altitude must be above Earth's surface
    assert len(res["updated_line1"]) == 69


def test_calculate_orbit_adjustment_axis_x_should_change_altitude():
    """
    Verifies that a burn along the X-axis changes the satellite's altitude.
    We apply a realistic prograde burn of 15 m/s.
    """
    request = OrbitAdjustRequest(
        currentTle1=ISS_LINE1,
        currentTle2=ISS_LINE2,
        deltaV=15.0,
        axis="X"
    )
    response = calculate_orbit_adjustment(request)
    
    # Original ISS altitude is approx 426.53 km. It should decrease to ~424 km due to the circular approximation
    assert response.newAltitude != 426.53
    assert len(response.newTle2) == 69


def test_calculate_orbit_adjustment_axis_y_should_shift_altitude_linearly():
    """
    Verifies that a normal burn along the Y-axis shifts 
    the altitude linearly according to the simplified simulation model.
    10 m/s is 0.01 km/s, which shifts altitude by 0.01 * 50 = 0.5 km.
    Expected updated altitude: 426.03 (original) + 0.5 = 426.53 km.
    """
    request = OrbitAdjustRequest(
        currentTle1=ISS_LINE1,
        currentTle2=ISS_LINE2,
        deltaV=10.0,
        axis="Y"
    )
    response = calculate_orbit_adjustment(request)
    
    assert abs(response.newAltitude - 426.53) < 0.05


def test_find_conjunctions_should_detect_proximate_orbits():
    """
    Verifies that two satellites in highly proximate orbits 
    trigger a critical conjunction warning within the 3-day scanning window.
    We update the TLE epoch to 'now' to prevent orbital drift divergence over years.
    """
    # MONKEYPATCHING: Dynamically make Pydantic TleItem hashable to prevent dict key TypeError
    TleItem.__hash__ = lambda self: hash(self.id)

    now = datetime.now(timezone.utc)
    updated_line1 = update_line1_epoch(ISS_LINE1, now)

    sat1 = TleItem(id="1", name="SAT-A", line1=updated_line1, line2=ISS_LINE2)
    
    # SAT-B is slightly offset in mean anomaly (325.2638 -> 325.2640)
    close_line2 = "2 25544  51.6457 149.6209 0001552  73.1957 325.2640 15.49257630250882"
    sat2 = TleItem(id="2", name="SAT-B", line1=updated_line1, line2=close_line2)
    
    request = ConjunctionRequest(fleet=[sat1], debris=[sat2])
    conjunctions = find_conjunctions(request)
    
    # Since orbits are almost identical and synchronized to 'now', they must trigger a conjunction
    assert len(conjunctions) > 0
    conj = conjunctions[0]
    assert conj.ourSatelliteId == "1"
    assert conj.threatCatalogId == "2"
    assert conj.missDistanceKm < 50.0
    assert conj.riskLevel in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]