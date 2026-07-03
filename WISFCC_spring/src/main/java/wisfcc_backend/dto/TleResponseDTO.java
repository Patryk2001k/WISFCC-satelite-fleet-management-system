package wisfcc_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TleResponseDTO(
        @JsonProperty("satellite_id") String satelliteId,
        Double latitude,
        Double longitude,
        Double altitude,
        @JsonProperty("updated_line1") String updatedLine1,
        @JsonProperty("updated_line2") String updatedLine2,
        @JsonProperty("timestamp_utc") String timestampUtc
) {}