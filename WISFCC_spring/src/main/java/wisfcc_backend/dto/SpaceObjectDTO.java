package wisfcc_backend.dto;

import java.time.Instant;

public record SpaceObjectDTO(
        Long id,
        String catalogId,
        String name,
        String type,
        String status,    
        String tleLine1,
        String tleLine2,
        Double latitude,
        Double longitude,
        Double altitude,
        Double batteryLevel, 
        Instant lastUpdatedUtc,
        String originalStatus
) {}