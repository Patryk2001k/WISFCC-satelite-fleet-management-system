package wisfcc_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import wisfcc_backend.dto.CreateFleetRequestDTO;
import wisfcc_backend.dto.SpaceObjectDTO;
import wisfcc_backend.dto.UpdateFleetRequestDTO;
import wisfcc_backend.service.SpaceObjectService;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/fleet")
public class FleetController {

    private final SpaceObjectService spaceObjectService;

    public FleetController(SpaceObjectService spaceObjectService) {
        this.spaceObjectService = spaceObjectService;
    }

    
    @GetMapping
    public ResponseEntity<List<SpaceObjectDTO>> getFleet(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(spaceObjectService.getFleet());
    }

    
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<SpaceObjectDTO> createFleetObject(@RequestBody CreateFleetRequestDTO request) {
        return ResponseEntity.ok(spaceObjectService.createObject(request));
    }

    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<SpaceObjectDTO> updateFleetObject(
            @PathVariable Long id,
            @RequestBody UpdateFleetRequestDTO request) {

        return ResponseEntity.ok(spaceObjectService.updateObject(id, request));
    }

    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFleetObject(@PathVariable Long id, Authentication auth) {
        spaceObjectService.deleteObject(id);
        return ResponseEntity.noContent().build(); 
    }
}