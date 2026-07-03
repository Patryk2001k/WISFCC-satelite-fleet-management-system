package wisfcc_backend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import wisfcc_backend.dto.AnomalyIncidentDTO;
import wisfcc_backend.dto.ReportGenerateRequestDTO;
import wisfcc_backend.dto.ReportMetricsDTO;
import wisfcc_backend.service.ReportService;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    
    @GetMapping("/metrics")
    @PreAuthorize("hasRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<ReportMetricsDTO> getMetrics() {
        return ResponseEntity.ok(reportService.getMetrics());
    }

    
    @GetMapping("/anomalies")
    @PreAuthorize("hasRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<List<AnomalyIncidentDTO>> getAnomalies(
            @RequestParam(required = false) Long satelliteId) {
        return ResponseEntity.ok(reportService.getAnomalies(satelliteId));
    }

    
    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<byte[]> generateReportFile(@RequestBody ReportGenerateRequestDTO request) {
        try {
            byte[] fileBytes = reportService.generateReport(request);

            
            MediaType mediaType;
            String fileExtension;

            if ("PDF".equalsIgnoreCase(request.format())) {
                mediaType = MediaType.APPLICATION_PDF;
                fileExtension = "pdf";
            } else if ("CSV".equalsIgnoreCase(request.format())) {
                mediaType = MediaType.TEXT_PLAIN;
                fileExtension = "csv";
            } else {
                mediaType = MediaType.APPLICATION_JSON;
                fileExtension = "json";
            }

            String filename = String.format("wisfcc_report_%s_%d.%s",
                    request.reportType().toLowerCase(),
                    Instant.now().getEpochSecond(),
                    fileExtension);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(mediaType)
                    .body(fileBytes);

        } catch (Exception e) {
            System.err.println("[REPORTS] Błąd w generowaniu pliku raportu: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}