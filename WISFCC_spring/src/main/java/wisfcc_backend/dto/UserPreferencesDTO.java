package wisfcc_backend.dto;

public record UserPreferencesDTO(
        boolean audioAlertsEnabled,
        boolean desktopNotificationsEnabled,
        boolean showDebrisEnabled
) {}