package wisfcc_backend.dto;

import java.time.Instant;

public record CasAlertDTO(
        String alertId,
        Long ourSatelliteId,
        String ourSatelliteName,
        String threatCatalogId,
        String threatName,
        Instant timeOfClosestApproach,
        Double missDistanceKm,
        Double collisionProbability,
        String riskLevel
) {}