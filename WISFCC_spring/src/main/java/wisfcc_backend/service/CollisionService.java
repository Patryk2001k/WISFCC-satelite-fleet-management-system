package wisfcc_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import wisfcc_backend.dto.*;
import wisfcc_backend.entity.CollisionEventEntity;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.enums.ObjectStatus;
import wisfcc_backend.enums.ObjectType;
import wisfcc_backend.enums.RiskLevel;
import wisfcc_backend.repository.CollisionEventRepository;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.security.JwtService;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CollisionService {

    private final CollisionEventRepository collisionRepository;
    private final SpaceObjectRepository spaceObjectRepository;
    private final RestTemplate restTemplate;
    private final JwtService jwtService;

    @Value("${python.physics.conjunctions.url}")
    private String pythonConjunctionsUrl;

    public CollisionService(CollisionEventRepository collisionRepository,
                            SpaceObjectRepository spaceObjectRepository,
                            RestTemplate restTemplate,
                            JwtService jwtService) {
        this.collisionRepository = collisionRepository;
        this.spaceObjectRepository = spaceObjectRepository;
        this.restTemplate = restTemplate;
        this.jwtService = jwtService;
    }
    
    public CasDashboardResponseDTO getCasDashboardData() {
        List<CollisionEventEntity> upcoming = collisionRepository
                .findByTimeOfClosestApproachUtcAfterAndIsHandledFalseOrderByTimeOfClosestApproachUtcAsc(Instant.now());

        long criticalCount = upcoming.stream()
                .filter(e -> e.getRiskLevel() == RiskLevel.CRITICAL)
                .count();

        List<CasAlertDTO> alerts = upcoming.stream().map(event -> new CasAlertDTO(
                event.getEventId(),
                event.getOurSatellite().getId(),
                event.getOurSatellite().getName(),
                event.getThreatCatalogId(),
                event.getThreatDescription(),
                event.getTimeOfClosestApproachUtc(),
                event.getMissDistanceKm(),
                event.getCollisionProbability(),
                event.getRiskLevel().name()
        )).collect(Collectors.toList());

        int totalObjectsInDb = (int) spaceObjectRepository.count();

        return new CasDashboardResponseDTO(new CasStatsDTO(totalObjectsInDb, (int) criticalCount), alerts);
    }

    @Scheduled(fixedRate = 300000)
    @Transactional
    public void scanForNewCollisions() {
        System.out.println("[CAS] Rozpoczynam radarowe skanowanie kolizji...");

        
        List<TleItemDTO> fleet = spaceObjectRepository.findByObjectTypeNot(ObjectType.DEBRIS).stream()
                .filter(sat -> sat.getStatus() != ObjectStatus.DESTROYED)
                .map(sat -> new TleItemDTO(
                        sat.getId().toString(),
                        sat.getName(),
                        sat.getTleLine1(),
                        sat.getTleLine2()
                ))
                .collect(Collectors.toList());

        
        List<TleItemDTO> debris = spaceObjectRepository.findByObjectType(ObjectType.DEBRIS).stream()
                .map(sat -> new TleItemDTO(
                        sat.getCatalogId(),
                        sat.getName(),
                        sat.getTleLine1(),
                        sat.getTleLine2()
                ))
                .collect(Collectors.toList());

        if (fleet.isEmpty() || debris.isEmpty()) {
            System.out.println("[CAS] Brak wystarczających danych do przeprowadzenia analizy (flota lub debris są puste).");
            return;
        }

        ConjunctionRequestDTO request = new ConjunctionRequestDTO(fleet, debris);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(jwtService.generateInternalToken());

        HttpEntity<ConjunctionRequestDTO> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<ConjunctionResponseDTO[]> response = restTemplate.postForEntity(
                    pythonConjunctionsUrl, entity, ConjunctionResponseDTO[].class);

            ConjunctionResponseDTO[] results = response.getBody();
            if (results != null) {
                for (ConjunctionResponseDTO res : results) {
                    SpaceObjectEntity ourSat = spaceObjectRepository.findById(res.ourSatelliteId()).orElse(null);
                    if (ourSat == null) {
                        continue;
                    }

                    
                    
                    boolean exists = collisionRepository.existsByThreatCatalogIdAndOurSatelliteIdAndIsHandledFalse(
                            res.threatCatalogId(), ourSat.getId());

                    if (!exists) {
                        CollisionEventEntity newEvent = new CollisionEventEntity();
                        newEvent.setEventId("CAS-" + Instant.now().getEpochSecond() + "-" + res.threatCatalogId());
                        newEvent.setOurSatellite(ourSat);
                        newEvent.setThreatCatalogId(res.threatCatalogId());
                        newEvent.setThreatDescription(res.threatName());
                        newEvent.setTimeOfClosestApproachUtc(res.timeOfClosestApproach());
                        newEvent.setMissDistanceKm(res.missDistanceKm());
                        newEvent.setCollisionProbability(res.collisionProbability());
                        newEvent.setRiskLevel(RiskLevel.valueOf(res.riskLevel()));
                        newEvent.setIsHandled(false);

                        collisionRepository.save(newEvent);
                        System.out.println("[CAS ALERT] Nowe zagrożenie! " + ourSat.getName() + " <=> " + res.threatName() + " | TCA: " + res.timeOfClosestApproach());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[CAS] Błąd połączenia z Pythonem w trakcie skanowania: " + e.getMessage());
        }
    }

    
    
    
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void executePendingCollisions() {
        Instant now = Instant.now();
        List<CollisionEventEntity> pastCollisions = collisionRepository
                .findByTimeOfClosestApproachUtcBeforeAndIsHandledFalse(now);

        for (CollisionEventEntity event : pastCollisions) {
            SpaceObjectEntity sat = event.getOurSatellite();

            if (sat.getObjectType() != ObjectType.DEBRIS && sat.getStatus() != ObjectStatus.DESTROYED) {
                System.out.println("[CAS CORRELATION] Nastąpiło zderzenie orbitalne! " + sat.getName() + " uderzył w " + event.getThreatDescription());

                sat.setOriginalStatus(sat.getStatus());

                sat.setStatus(ObjectStatus.DESTROYED);
                sat.setObjectType(ObjectType.DEBRIS);
                sat.setName(sat.getName() + " (DEBRIS)");

                spaceObjectRepository.save(sat);
            }

            event.setIsHandled(true);
            collisionRepository.save(event);
        }
    }
}