package wisfcc_backend.dto;

import java.time.Instant;
import java.util.Map;

public record MissionJobDTO(
        String jobId,
        Long targetSpaceObjectId,
        String targetSatelliteName,
        String commandType,
        Map<String, Object> parameters,
        Instant scheduledTimeUtc,
        String status,
        String orderedBy,
        String executionLogs
) {}