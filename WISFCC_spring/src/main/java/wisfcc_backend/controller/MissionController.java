package wisfcc_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import wisfcc_backend.dto.CreateMissionRequestDTO;
import wisfcc_backend.dto.MissionJobDTO;
import wisfcc_backend.service.MissionService;

import java.util.List;

@RestController
@RequestMapping("/api/missions")
public class MissionController {

    private final MissionService missionService;

    public MissionController(MissionService missionService) {
        this.missionService = missionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<List<MissionJobDTO>> getAllMissions() {
        return ResponseEntity.ok(missionService.getAllMissions());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<MissionJobDTO> createMission(
            @RequestBody CreateMissionRequestDTO request,
            Authentication auth) { 
        String username = auth.getName();
        return ResponseEntity.ok(missionService.createMission(request, username));
    }
}