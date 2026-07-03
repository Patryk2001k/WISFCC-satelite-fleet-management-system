package wisfcc_backend.controller;

import org.springframework.web.bind.annotation.*;
import wisfcc_backend.dto.SpaceObjectDTO;
import wisfcc_backend.dto.TelemetryDTO;
import wisfcc_backend.service.SpaceObjectService;
import java.util.List;

@RestController
@RequestMapping("/api/space-objects")
public class SpaceObjectController {

    private final SpaceObjectService spaceObjectService;

    public SpaceObjectController(SpaceObjectService spaceObjectService) {
        this.spaceObjectService = spaceObjectService;
    }

    @GetMapping
    public List<SpaceObjectDTO> getAll() {
        return spaceObjectService.getAllObjectsWithLatestPosition();
    }

    
    @GetMapping("/{id}/telemetry")
    public List<TelemetryDTO> getTelemetry(@PathVariable Long id) {
        return spaceObjectService.getObjectTelemetryHistory(id);
    }
}