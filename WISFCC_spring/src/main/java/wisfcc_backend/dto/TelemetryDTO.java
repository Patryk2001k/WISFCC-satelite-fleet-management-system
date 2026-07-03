package wisfcc_backend.dto;

import java.time.Instant;

public record TelemetryDTO(
        Double latitude,
        Double longitude,
        Double altitude,
        Double batteryPercent,
        Instant timestamp
) {}