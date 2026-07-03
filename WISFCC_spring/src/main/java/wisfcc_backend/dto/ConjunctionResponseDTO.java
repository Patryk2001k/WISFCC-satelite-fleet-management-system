package wisfcc_backend.dto;
import java.time.Instant;
public record ConjunctionResponseDTO(
        Long ourSatelliteId, String threatCatalogId, String threatName,
        Instant timeOfClosestApproach, Double missDistanceKm, Double collisionProbability, String riskLevel
) {}