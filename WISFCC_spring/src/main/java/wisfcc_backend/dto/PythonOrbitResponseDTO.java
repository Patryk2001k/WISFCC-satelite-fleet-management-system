package wisfcc_backend.dto;

public record PythonOrbitResponseDTO(
        String newTle1,
        String newTle2,
        double newAltitude
) {}