package wisfcc_backend.dto;

import java.time.Instant;

public record AnomalyIncidentDTO(
        String incidentId,
        Instant timestampUtc,
        Long satelliteId,
        String satelliteName,
        String anomalyType,
        String severity,
        String status
) {}