package wisfcc_backend.dto;

import java.util.List;

public record CasDashboardResponseDTO(
        CasStatsDTO stats,
        List<CasAlertDTO> alerts
) {}