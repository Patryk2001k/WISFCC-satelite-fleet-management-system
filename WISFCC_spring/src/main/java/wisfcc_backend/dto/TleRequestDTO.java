package wisfcc_backend.dto;

public record TleRequestDTO(
        String satellite_id,
        String line1,
        String line2
) {}