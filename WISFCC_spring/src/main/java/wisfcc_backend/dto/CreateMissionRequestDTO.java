package wisfcc_backend.dto;

import java.time.Instant;
import java.util.Map;

public record CreateMissionRequestDTO(
        Long targetSpaceObjectId,
        String commandType,
        Map<String, Object> parameters,
        Instant scheduledTimeUtc
) {}