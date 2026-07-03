package wisfcc_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import wisfcc_backend.dto.CreateMissionRequestDTO;
import wisfcc_backend.dto.MissionJobDTO;
import wisfcc_backend.dto.PythonOrbitRequestDTO;
import wisfcc_backend.dto.PythonOrbitResponseDTO;
import wisfcc_backend.entity.MissionJobEntity;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.enums.CommandType;
import wisfcc_backend.enums.MissionStatus;
import wisfcc_backend.repository.CollisionEventRepository;
import wisfcc_backend.repository.MissionJobRepository;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.security.JwtService;
import org.springframework.scheduling.TaskScheduler;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MissionService {

    private final MissionJobRepository missionRepository;
    private final SpaceObjectRepository spaceObjectRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final JwtService jwtService;
    private final TaskScheduler taskScheduler; 
    private final CollisionEventRepository collisionRepository;

    @Value("${python.mission.orbit-adjust.url}")
    private String pythonOrbitAdjustUrl;

    
    public MissionService(MissionJobRepository missionRepository,
                          SpaceObjectRepository spaceObjectRepository,
                          ObjectMapper objectMapper,
                          RestTemplate restTemplate,
                          JwtService jwtService,
                          TaskScheduler taskScheduler,
                          CollisionEventRepository collisionRepository) {
        this.missionRepository = missionRepository;
        this.spaceObjectRepository = spaceObjectRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplate;
        this.jwtService = jwtService;
        this.taskScheduler = taskScheduler;
        this.collisionRepository = collisionRepository;
    }

    
    @Transactional
    public MissionJobDTO createMission(CreateMissionRequestDTO req, String username) {
        if (!spaceObjectRepository.existsById(req.targetSpaceObjectId())) {
            throw new RuntimeException("Satelita o ID " + req.targetSpaceObjectId() + " nie istnieje!");
        }

        MissionJobEntity job = new MissionJobEntity();
        job.setTargetSpaceObjectId(req.targetSpaceObjectId());
        job.setCommandType(CommandType.valueOf(req.commandType().toUpperCase()));
        job.setScheduledTimeUtc(req.scheduledTimeUtc());
        job.setStatus(MissionStatus.PENDING);
        job.setOrderedBy(username);

        try {
            job.setParametersJson(objectMapper.writeValueAsString(req.parameters()));
        } catch (JsonProcessingException e) {
            job.setParametersJson("{}");
        }

        return mapToDTO(missionRepository.save(job));
    }

    
    public List<MissionJobDTO> getAllMissions() {
        return missionRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    
    
    
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void executePendingMissions() {
        List<MissionJobEntity> pendingJobs = missionRepository.findByStatusAndScheduledTimeUtcBefore(
                MissionStatus.PENDING, Instant.now()
        );

        for (MissionJobEntity job : pendingJobs) {
            System.out.println("Uruchamiam misję: " + job.getJobId());
            job.setStatus(MissionStatus.EXECUTING);
            missionRepository.save(job);

            try {
                switch (job.getCommandType()) {
                    case ORBIT_ADJUST -> executeOrbitAdjust(job);
                    case SENSOR_CALIBRATION -> executeSensorCalibration(job);
                    case TRANSMITTER_POWER -> executeTransmitterPower(job);
                    case SLEEP_MODE -> executeSleepMode(job);
                }
            } catch (Exception e) {
                job.setStatus(MissionStatus.FAILED);
                job.setExecutionLogs("Błąd krytyczny wykonania: " + e.getMessage());
                missionRepository.save(job);
            }
        }
    }

    

    private void executeOrbitAdjust(MissionJobEntity job) {
        try {
            SpaceObjectEntity sat = spaceObjectRepository.findById(job.getTargetSpaceObjectId())
                    .orElseThrow(() -> new RuntimeException("Nie znaleziono statku o ID: " + job.getTargetSpaceObjectId()));

            Map<String, Object> params = objectMapper.readValue(job.getParametersJson(), new TypeReference<>() {});
            double deltaV = Double.parseDouble(params.getOrDefault("deltaV", "0.0").toString());
            String axis = params.getOrDefault("axis", "X").toString(); 

            PythonOrbitRequestDTO requestToPython = new PythonOrbitRequestDTO(
                    sat.getTleLine1(),
                    sat.getTleLine2(),
                    deltaV,
                    axis 
            );

            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(jwtService.generateInternalToken());

            HttpEntity<PythonOrbitRequestDTO> entity = new HttpEntity<>(requestToPython, headers);

            System.out.println("-> Zlecam obliczenia fizyczne M2M dla misji: " + job.getJobId());

            
            ResponseEntity<PythonOrbitResponseDTO> responseEntity = restTemplate.postForEntity(
                    pythonOrbitAdjustUrl, entity, PythonOrbitResponseDTO.class);

            PythonOrbitResponseDTO responseFromPython = responseEntity.getBody();

            
            if (responseFromPython != null) {
                sat.setTleLine1(responseFromPython.newTle1());
                sat.setTleLine2(responseFromPython.newTle2());
                sat.setAltitude(responseFromPython.newAltitude());
                spaceObjectRepository.save(sat);

                
                List<wisfcc_backend.entity.CollisionEventEntity> pendingAsVictim =
                        collisionRepository.findByOurSatelliteIdAndIsHandledFalse(sat.getId());

                for (wisfcc_backend.entity.CollisionEventEntity evt : pendingAsVictim) {
                    evt.setIsHandled(true);
                    evt.setThreatDescription(evt.getThreatDescription() + " [AVOIDED]");
                    collisionRepository.save(evt);
                    System.out.println("[CAS] Zagrożenie odwołane! Nasz statek uciekł.");
                }

                
                List<wisfcc_backend.entity.CollisionEventEntity> pendingAsThreat =
                        collisionRepository.findByThreatCatalogIdAndIsHandledFalse(sat.getCatalogId());

                for (wisfcc_backend.entity.CollisionEventEntity evt : pendingAsThreat) {
                    evt.setIsHandled(true);
                    evt.setThreatDescription(evt.getThreatDescription() + " [AVOIDED BY TARGET]");
                    collisionRepository.save(evt);
                    System.out.println("[CAS] Zagrożenie dla innego statku zażegnane! Uciekliśmy mu z kursu kolizyjnego.");
                }
                job.setStatus(MissionStatus.COMPLETED);
                job.setExecutionLogs("Sukces M2M: Orbita przeliczona. Nowa wysokość: " + responseFromPython.newAltitude() + " km. Zagrożenia kolizyjne zażegnane.");
            } else {
                throw new RuntimeException("Python zwrócił pustą odpowiedź.");
            }

        } catch (Exception e) {
            job.setStatus(MissionStatus.FAILED);
            job.setExecutionLogs("Błąd M2M (Python): " + e.getMessage());
        }

        missionRepository.save(job);
    }

    private void executeSensorCalibration(MissionJobEntity job) {
        job.setStatus(MissionStatus.COMPLETED);
        job.setExecutionLogs("Skanowanie optyczne zakończone. Sensory zasilone. Status: W normie.");
        missionRepository.save(job);
    }

    private void executeTransmitterPower(MissionJobEntity job) {
        job.setStatus(MissionStatus.COMPLETED);
        job.setExecutionLogs("Moc nadajnika zaktualizowana pomyślnie.");
        missionRepository.save(job);
    }

    private void executeSleepMode(MissionJobEntity job) {
        SpaceObjectEntity sat = spaceObjectRepository.findById(job.getTargetSpaceObjectId())
                .orElseThrow(() -> new RuntimeException("Nie znaleziono statku o ID: " + job.getTargetSpaceObjectId()));

        
        if (sat.getStatus() != wisfcc_backend.enums.ObjectStatus.OFFLINE) {
            sat.setPreviousStatus(sat.getStatus());
        }

        
        sat.setStatus(wisfcc_backend.enums.ObjectStatus.OFFLINE);
        spaceObjectRepository.save(sat);

        
        
        Instant wakeUpTime = Instant.now().plus(1, ChronoUnit.MINUTES);
        taskScheduler.schedule(() -> wakeUpSatellite(sat.getId()), wakeUpTime);

        job.setStatus(MissionStatus.COMPLETED);
        job.setExecutionLogs("Statek wprowadzony w tryb uśpienia. Wybudzenie zaplanowano na: " + wakeUpTime.toString());
        missionRepository.save(job);
    }

    
    
    
    @Transactional
    public void wakeUpSatellite(Long targetId) {
        spaceObjectRepository.findById(targetId).ifPresent(target -> {
            if (target.getPreviousStatus() != null) {
                System.out.println(">>> BUDZENIE SATELITY ID: " + targetId + " | Powrót do statusu: " + target.getPreviousStatus() + " <<<");

                
                target.setStatus(target.getPreviousStatus());

                
                target.setPreviousStatus(null);

                spaceObjectRepository.save(target);
            }
        });
    }

    

    private MissionJobDTO mapToDTO(MissionJobEntity job) {
        String satName = spaceObjectRepository.findById(job.getTargetSpaceObjectId())
                .map(SpaceObjectEntity::getName)
                .orElse("Nieznany statek");

        Map<String, Object> params = Map.of();
        try {
            params = objectMapper.readValue(job.getParametersJson(), new TypeReference<>() {});
        } catch (Exception e) {
            e.printStackTrace();
        }

        return new MissionJobDTO(
                job.getJobId(), job.getTargetSpaceObjectId(), satName,
                job.getCommandType().name(), params, job.getScheduledTimeUtc(),
                job.getStatus().name(), job.getOrderedBy(), job.getExecutionLogs()
        );
    }
}