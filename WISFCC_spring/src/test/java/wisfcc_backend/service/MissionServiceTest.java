package wisfcc_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wisfcc_backend.dto.CreateMissionRequestDTO;
import wisfcc_backend.dto.MissionJobDTO;
import wisfcc_backend.entity.MissionJobEntity;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.enums.CommandType;
import wisfcc_backend.enums.MissionStatus;
import wisfcc_backend.repository.MissionJobRepository;
import wisfcc_backend.repository.SpaceObjectRepository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MissionServiceTest {

    @Mock private MissionJobRepository missionRepository;
    @Mock private SpaceObjectRepository spaceObjectRepository;
    @Mock private ObjectMapper objectMapper;
    @InjectMocks private MissionService missionService;

    @Test
    void createMission_ShouldThrowException_WhenSatelliteDoesNotExist() {
        // Arrange
        CreateMissionRequestDTO request = new CreateMissionRequestDTO(99L, "SLEEP_MODE", Map.of(), Instant.now());
        when(spaceObjectRepository.existsById(99L)).thenReturn(false);

        // Act & Assert
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> missionService.createMission(request, "admin")
        );

        assertTrue(exception.getMessage().contains("nie istnieje"));
        verify(missionRepository, never()).save(any());
    }

    @Test
    void createMission_ShouldSavePendingMission_WhenSatelliteExists() throws JsonProcessingException {
        // Arrange
        CreateMissionRequestDTO request = new CreateMissionRequestDTO(1L, "SLEEP_MODE", Map.of(), Instant.now());
        
        when(spaceObjectRepository.existsById(1L)).thenReturn(true);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        
        MissionJobEntity savedJob = new MissionJobEntity();
        savedJob.setJobId("JOB-123");
        savedJob.setTargetSpaceObjectId(1L);
        savedJob.setCommandType(CommandType.SLEEP_MODE);
        savedJob.setStatus(MissionStatus.PENDING);
        
        when(missionRepository.save(any(MissionJobEntity.class))).thenReturn(savedJob);

        SpaceObjectEntity mockSat = new SpaceObjectEntity();
        mockSat.setName("SAT-TEST");
        when(spaceObjectRepository.findById(1L)).thenReturn(Optional.of(mockSat));

        // Act
        MissionJobDTO response = missionService.createMission(request, "admin");

        // Assert
        assertEquals("JOB-123", response.jobId());
        assertEquals("PENDING", response.status());
        verify(missionRepository, times(1)).save(any(MissionJobEntity.class));
    }
}