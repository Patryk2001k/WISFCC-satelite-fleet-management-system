package wisfcc_backend.dto;

import java.time.Instant;

public record CollisionEventDTO(
        String eventId,
        Long ourSatelliteId,
        String ourSatelliteName,
        String threatCatalogId,
        String threatDescription,
        Instant timeOfClosestApproachUtc,
        Double missDistanceKm,
        Double collisionProbability,
        String riskLevel
) {}