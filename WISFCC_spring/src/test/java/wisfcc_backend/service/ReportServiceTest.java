package wisfcc_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wisfcc_backend.dto.ReportMetricsDTO;
import wisfcc_backend.entity.MissionJobEntity;
import wisfcc_backend.enums.MissionStatus;
import wisfcc_backend.repository.AnomalyIncidentRepository;
import wisfcc_backend.repository.MissionJobRepository;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.repository.TelemetryRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ReportServiceTest {

    @Mock private MissionJobRepository missionRepository;
    @Mock private SpaceObjectRepository spaceObjectRepository;
    @Mock private TelemetryRepository telemetryRepository;
    @Mock private AnomalyIncidentRepository anomalyRepository;
    @Mock private ObjectMapper objectMapper;
    @InjectMocks private ReportService reportService;

    @Test
    void getMetrics_ShouldCalculate100PercentSuccessRate_WhenNoMissionsExist() {
        // Arrange
        when(missionRepository.count()).thenReturn(0L);
        when(missionRepository.findAll()).thenReturn(List.of());

        // Act
        ReportMetricsDTO metrics = reportService.getMetrics();

        // Assert
        assertEquals(0, metrics.totalMissions());
        assertEquals(0, metrics.failedMissions());
        assertEquals(100.0, metrics.successRatePercent()); // Guard against division by zero!
    }

    @Test
    void getMetrics_ShouldCalculateCorrectSuccessRate_WhenFailedMissionsExist() {
        // Arrange
        MissionJobEntity failedJob = new MissionJobEntity();
        failedJob.setStatus(MissionStatus.FAILED);
        MissionJobEntity successJob = new MissionJobEntity();
        successJob.setStatus(MissionStatus.COMPLETED);

        when(missionRepository.count()).thenReturn(2L);
        when(missionRepository.findAll()).thenReturn(List.of(failedJob, successJob));

        // Act
        ReportMetricsDTO metrics = reportService.getMetrics();

        // Assert
        assertEquals(2, metrics.totalMissions());
        assertEquals(1, metrics.failedMissions());
        assertEquals(50.0, metrics.successRatePercent()); 
    }
}