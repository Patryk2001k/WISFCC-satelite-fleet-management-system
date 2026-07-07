package wisfcc_backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import wisfcc_backend.dto.TleResponseDTO;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.repository.TelemetryRepository;
import wisfcc_backend.security.JwtService;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SpaceObjectUpdaterServiceTest {

    @Mock private SpaceObjectRepository spaceObjectRepository;
    @Mock private TelemetryRepository telemetryRepository;
    @Mock private RestTemplate restTemplate;
    @Mock private JwtService jwtService;

    @InjectMocks private SpaceObjectUpdaterService updaterService;

    @BeforeEach
    void setUp() {
        // Wstrzykiwanie zmiennej @Value, która w testach jednostkowych domyślnie jest null
        ReflectionTestUtils.setField(updaterService, "pythonServiceUrl", "http://localhost:8000/api/calculate-batch");
    }

    @Test
    void updateAllSatellitesInBatch_ShouldSaveTelemetry_WhenPythonReturnsData() {
        // Arrange
        SpaceObjectEntity sat = new SpaceObjectEntity();
        sat.setId(1L);
        sat.setTleLine1("Line1");
        sat.setTleLine2("Line2");

        when(spaceObjectRepository.findAll()).thenReturn(List.of(sat));
        when(jwtService.generateInternalToken()).thenReturn("mockedToken");

        TleResponseDTO pythonResponse = new TleResponseDTO(
                "1", 50.0, 20.0, 400.0, "NewLine1", "NewLine2", "2026-07-02T10:00:00Z"
        );
        TleResponseDTO[] responseArray = {pythonResponse};

        // Zmieniliśmy any() na precyzyjny URL, który wstrzyknęliśmy wyżej
        when(restTemplate.postForEntity(eq("http://localhost:8000/api/calculate-batch"), any(HttpEntity.class), eq(TleResponseDTO[].class)))
                .thenReturn(ResponseEntity.ok(responseArray));

        // Act
        updaterService.updateAllSatellitesInBatch();

        // Assert
        assertEquals("NewLine1", sat.getTleLine1()); // Ensure Entity was updated
        assertEquals(400.0, sat.getAltitude());
        verify(spaceObjectRepository, times(1)).saveAll(any());
        verify(telemetryRepository, times(1)).saveAll(any());
    }
}