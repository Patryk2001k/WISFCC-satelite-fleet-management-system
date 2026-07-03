package wisfcc_backend.dto;

public record PythonOrbitRequestDTO(
        String currentTle1,
        String currentTle2,
        double deltaV,
        String axis
) {}