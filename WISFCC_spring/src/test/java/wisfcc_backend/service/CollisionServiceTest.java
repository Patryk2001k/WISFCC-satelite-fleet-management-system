package wisfcc_backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;
import wisfcc_backend.dto.CasDashboardResponseDTO;
import wisfcc_backend.entity.CollisionEventEntity;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.enums.ObjectStatus;
import wisfcc_backend.enums.ObjectType;
import wisfcc_backend.enums.RiskLevel;
import wisfcc_backend.repository.CollisionEventRepository;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.security.JwtService;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CollisionServiceTest {

    @Mock private CollisionEventRepository collisionRepository;
    @Mock private SpaceObjectRepository spaceObjectRepository;
    @Mock private RestTemplate restTemplate;
    @Mock private JwtService jwtService;
    @InjectMocks private CollisionService collisionService;

    @Test
    void getCasDashboardData_ShouldReturnCorrectStats_WhenAlertsExist() {
        // Arrange
        SpaceObjectEntity sat = new SpaceObjectEntity();
        sat.setId(1L);
        sat.setName("SAT-1");

        CollisionEventEntity criticalEvent = new CollisionEventEntity();
        criticalEvent.setEventId("CAS-001");
        criticalEvent.setRiskLevel(RiskLevel.CRITICAL);
        criticalEvent.setOurSatellite(sat);

        when(collisionRepository.findByTimeOfClosestApproachUtcAfterAndIsHandledFalseOrderByTimeOfClosestApproachUtcAsc(any()))
                .thenReturn(List.of(criticalEvent));
        when(spaceObjectRepository.count()).thenReturn(100L);

        // Act
        CasDashboardResponseDTO response = collisionService.getCasDashboardData();

        // Assert
        assertEquals(100, response.stats().activeTracks());
        assertEquals(1, response.stats().criticalThreats());
        assertEquals(1, response.alerts().size());
        assertEquals("CRITICAL", response.alerts().get(0).riskLevel());
    }

    @Test
    void executePendingCollisions_ShouldDestroySatellite_WhenTCAPassed() {
        // Arrange
        SpaceObjectEntity targetSat = new SpaceObjectEntity();
        targetSat.setId(2L);
        targetSat.setName("SAT-DOOMED");
        targetSat.setStatus(ObjectStatus.ONLINE);
        targetSat.setObjectType(ObjectType.SATELLITE);

        CollisionEventEntity pastEvent = new CollisionEventEntity();
        pastEvent.setOurSatellite(targetSat);
        pastEvent.setIsHandled(false);

        when(collisionRepository.findByTimeOfClosestApproachUtcBeforeAndIsHandledFalse(any()))
                .thenReturn(List.of(pastEvent));

        // Act
        collisionService.executePendingCollisions();

        // Assert
        assertEquals(ObjectStatus.DESTROYED, targetSat.getStatus());
        assertEquals(ObjectType.DEBRIS, targetSat.getObjectType());
        assertTrue(targetSat.getName().contains("(DEBRIS)"));
        assertTrue(pastEvent.getIsHandled());
        
        verify(spaceObjectRepository, times(1)).save(targetSat);
        verify(collisionRepository, times(1)).save(pastEvent);
    }
}