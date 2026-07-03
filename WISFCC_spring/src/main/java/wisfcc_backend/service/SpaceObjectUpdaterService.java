package wisfcc_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import wisfcc_backend.dto.TleRequestDTO;
import wisfcc_backend.dto.TleResponseDTO;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.entity.TelemetryEntity;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.repository.TelemetryRepository;
import wisfcc_backend.security.JwtService;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SpaceObjectUpdaterService {

    private final SpaceObjectRepository spaceObjectRepository;
    private final TelemetryRepository telemetryRepository;
    private final RestTemplate restTemplate;
    private final JwtService jwtService;

    
    @Value("${python.service.url}")
    private String pythonServiceUrl;

    public SpaceObjectUpdaterService(
            SpaceObjectRepository spaceObjectRepository,
            TelemetryRepository telemetryRepository,
            RestTemplate restTemplate,
            JwtService jwtService) {
        this.spaceObjectRepository = spaceObjectRepository;
        this.telemetryRepository = telemetryRepository;
        this.restTemplate = restTemplate;
        this.jwtService = jwtService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        System.out.println("[STARTUP] Inicjalizacja hurtowej aktualizacji TLE i telemetrii...");
        updateAllSatellitesInBatch();
    }

    @Transactional
    public void updateAllSatellitesInBatch() {
        List<SpaceObjectEntity> allEntities = spaceObjectRepository.findAll();
        if (allEntities.isEmpty()) return;

        List<TleRequestDTO> requests = allEntities.stream()
                .map(obj -> new TleRequestDTO(
                        obj.getId().toString(),
                        obj.getTleLine1(),
                        obj.getTleLine2()))
                .toList();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String token = jwtService.generateInternalToken();
        headers.setBearerAuth(token);

        HttpEntity<List<TleRequestDTO>> entity = new HttpEntity<>(requests, headers);

        try {
            
            ResponseEntity<TleResponseDTO[]> responseEntity = restTemplate.postForEntity(
                    pythonServiceUrl, entity, TleResponseDTO[].class);

            TleResponseDTO[] responses = responseEntity.getBody();
            System.out.printf(Arrays.toString(responses));
            if (responses != null) {
                Map<String, TleResponseDTO> responseMap = Arrays.stream(responses)
                        .collect(Collectors.toMap(TleResponseDTO::satelliteId, r -> r));

                List<TelemetryEntity> telemetryToSave = new ArrayList<>();
                Instant now = Instant.now();

                for (SpaceObjectEntity obj : allEntities) {
                    TleResponseDTO res = responseMap.get(obj.getId().toString());
                    if (res != null) {
                        
                        obj.setTleLine1(res.updatedLine1());
                        obj.setTleLine2(res.updatedLine2());
                        obj.setLatitude(res.latitude());
                        obj.setLongitude(res.longitude());
                        obj.setAltitude(res.altitude());
                        obj.setLastUpdate(now);

                        
                        TelemetryEntity t = new TelemetryEntity();
                        t.setSpaceObject(obj);
                        t.setLatitude(res.latitude());
                        t.setLongitude(res.longitude());
                        t.setAltitude(res.altitude());
                        t.setBatteryPercent(75.0 + Math.random() * 25);
                        

                        telemetryToSave.add(t);
                    }
                }

                spaceObjectRepository.saveAll(allEntities);
                telemetryRepository.saveAll(telemetryToSave);

                System.out.println("[BATCH] Pomyślnie zsynchronizowano " + responses.length + " obiektów.");
            }
        } catch (Exception e) {
            System.err.println("[BATCH] Błąd komunikacji z Pythonem: " + e.getMessage());
        }
    }

    @Scheduled(fixedRate = 3600000)
    public void runPeriodically() {
        System.out.println("[CYKL] Aktualizacja okresowa...");
        updateAllSatellitesInBatch();
    }
}