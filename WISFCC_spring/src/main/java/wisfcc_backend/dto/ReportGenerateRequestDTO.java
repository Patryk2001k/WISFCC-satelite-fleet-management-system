package wisfcc_backend.dto;

public record ReportGenerateRequestDTO(
        Long targetSatelliteId,
        String reportType, 
        String format 
) {}