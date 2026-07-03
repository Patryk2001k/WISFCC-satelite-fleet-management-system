package wisfcc_backend.dto;

public record UpdateFleetRequestDTO(
        String name,
        String catalogId,
        String type,
        String status,
        Double latitude,
        Double longitude,
        Double altitude,
        String tleLine1,
        String tleLine2
) {}