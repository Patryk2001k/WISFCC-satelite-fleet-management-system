package wisfcc_backend.dto;

public record ReportMetricsDTO(
        long totalMissions,
        long failedMissions,
        double successRatePercent,
        int groundStationBandwidthPercent,
        int mainframeCpuPercent,
        double fleetAvgEnergyPercent
) {}