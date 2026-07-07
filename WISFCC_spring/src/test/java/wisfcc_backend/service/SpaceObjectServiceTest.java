package wisfcc_backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wisfcc_backend.repository.*;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SpaceObjectServiceTest {

    @Mock private SpaceObjectRepository spaceObjectRepository;
    @Mock private TelemetryRepository telemetryRepository;
    @Mock private MissionJobRepository missionJobRepository;
    @Mock private AnomalyIncidentRepository anomalyRepository;
    @Mock private CollisionEventRepository collisionRepository;
    @InjectMocks private SpaceObjectService spaceObjectService;

    @Test
    void deleteObject_ShouldInvokeCascadingDeletes_WhenObjectExists() {
        // Arrange
        Long targetSatelliteId = 1L;
        when(spaceObjectRepository.existsById(targetSatelliteId)).thenReturn(true);

        // Act
        spaceObjectService.deleteObject(targetSatelliteId);

        // Assert
        verify(missionJobRepository, times(1)).deleteByTargetSpaceObjectId(targetSatelliteId);
        verify(telemetryRepository, times(1)).deleteBySpaceObjectId(targetSatelliteId);
        verify(anomalyRepository, times(1)).deleteBySpaceObjectId(targetSatelliteId);
        verify(collisionRepository, times(1)).deleteByOurSatelliteId(targetSatelliteId);
        verify(spaceObjectRepository, times(1)).deleteById(targetSatelliteId);
    }

    @Test
    void deleteObject_ShouldThrowException_WhenObjectNotFound() {
        // Arrange
        Long missingSatelliteId = 999L;
        when(spaceObjectRepository.existsById(missingSatelliteId)).thenReturn(false);

        // Act & Assert
        assertThrows(
                RuntimeException.class,
                () -> spaceObjectService.deleteObject(missingSatelliteId)
        );

        // Verify cascading deletes are skipped
        verify(missionJobRepository, never()).deleteByTargetSpaceObjectId(anyLong());
        verify(spaceObjectRepository, never()).deleteById(anyLong());
    }
}