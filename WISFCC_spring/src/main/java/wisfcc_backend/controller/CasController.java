package wisfcc_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import wisfcc_backend.dto.CasDashboardResponseDTO;
import wisfcc_backend.service.CollisionService;

@RestController
@RequestMapping("/api/cas")
public class CasController {

    private final CollisionService collisionService;

    public CasController(CollisionService collisionService) {
        this.collisionService = collisionService;
    }

    @GetMapping("/alerts")
    public ResponseEntity<CasDashboardResponseDTO> getAlerts() {
        return ResponseEntity.ok(collisionService.getCasDashboardData());
    }
}