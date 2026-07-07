import pytest
from app.services.orbit_engine import calculate_tle_checksum, update_line2_mean_motion

def test_calculate_tle_checksum_should_return_correct_digit():
    """
    Testuje, czy autorski algorytm poprawnie wylicza rygorystyczną 
    sumę kontrolną modulo 10 dla linii TLE (zgodnie ze standardem NORAD).
    """
    # Arrange: Linia 1 z TLE dla stacji ISS (bez ostatniego znaku, czyli sumy)
    line1_base = "1 25544U 98067A   20287.52554284  .00001099  00000-0  27572-4 0  999"
    
    # Act
    checksum = calculate_tle_checksum(line1_base + " ")
    
    # Assert: Prawidłowa suma kontrolna dla tej linii to '7'
    assert checksum == "7"


def test_update_line2_mean_motion_should_inject_formatted_value():
    """
    Testuje, czy system poprawnie formatuje nowy ruch średni (po manewrze Delta-V)
    i prawidłowo wstrzykuje go w odpowiednie kolumny linii 2 TLE.
    """
    # Arrange: Oryginalna linia 2 dla ISS
    line2_original = "2 25544  51.6457 149.6209 0001552  73.1957 325.2638 15.49257630250882"
    
    # Symulujemy manewr: nowy, wolniejszy ruch średni na wyższej orbicie
    new_mean_motion = 15.48000000 
    
    # Act
    updated_line2 = update_line2_mean_motion(line2_original, new_mean_motion)
    
    # Assert: Sprawdzamy czy nowa wartość znalazła się w dobrym miejscu
    # Oraz czy suma kontrolna na końcu (modulo 10) została zaktualizowana i jest cyfrą!
    assert "15.48000000" in updated_line2
    assert len(updated_line2) == 69
    assert updated_line2[-1].isdigit()