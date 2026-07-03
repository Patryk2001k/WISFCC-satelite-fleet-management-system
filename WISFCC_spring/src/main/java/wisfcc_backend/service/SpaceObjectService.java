package wisfcc_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wisfcc_backend.dto.CreateFleetRequestDTO;
import wisfcc_backend.dto.SpaceObjectDTO;
import wisfcc_backend.dto.UpdateFleetRequestDTO;
import wisfcc_backend.dto.TelemetryDTO;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.enums.ObjectStatus;
import wisfcc_backend.enums.ObjectType;
import wisfcc_backend.repository.*;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpaceObjectService {

    private final SpaceObjectRepository repository;
    private final TelemetryRepository telemetryRepository;
    private final MissionJobRepository missionJobRepository;
    private final AnomalyIncidentRepository anomalyRepository; 
    private final CollisionEventRepository collisionRepository; 

    public SpaceObjectService(SpaceObjectRepository repository,
                              TelemetryRepository telemetryRepository,
                              MissionJobRepository missionJobRepository,
                              AnomalyIncidentRepository anomalyRepository, 
                              CollisionEventRepository collisionRepository) { 
        this.repository = repository;
        this.telemetryRepository = telemetryRepository;
        this.missionJobRepository = missionJobRepository;
        this.anomalyRepository = anomalyRepository;
        this.collisionRepository = collisionRepository;
    }

    public List<SpaceObjectDTO> getFleet() {
        return repository.findByObjectTypeNot(ObjectType.DEBRIS)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public SpaceObjectDTO createObject(CreateFleetRequestDTO req) {
        SpaceObjectEntity entity = new SpaceObjectEntity();

        entity.setName(req.name());
        entity.setCatalogId(req.catalogId());
        entity.setObjectType(ObjectType.valueOf(req.type().toUpperCase()));
        entity.setStatus(ObjectStatus.valueOf(req.status().toUpperCase()));

        entity.setLatitude(req.latitude());
        entity.setLongitude(req.longitude());
        entity.setAltitude(req.altitude());
        entity.setTleLine1(req.tleLine1());
        entity.setTleLine2(req.tleLine2());

        return mapToDTO(repository.save(entity));
    }

    @Transactional
    public SpaceObjectDTO updateObject(Long id, UpdateFleetRequestDTO req) {
        SpaceObjectEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono obiektu o ID: " + id));

        entity.setName(req.name());
        entity.setCatalogId(req.catalogId());
        entity.setObjectType(ObjectType.valueOf(req.type().toUpperCase()));
        entity.setStatus(ObjectStatus.valueOf(req.status().toUpperCase()));

        entity.setLatitude(req.latitude());
        entity.setLongitude(req.longitude());
        entity.setAltitude(req.altitude());
        entity.setTleLine1(req.tleLine1());
        entity.setTleLine2(req.tleLine2());

        return mapToDTO(repository.save(entity));
    }

    @Transactional
    public void deleteObject(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Nie znaleziono obiektu o ID: " + id);
        }

        
        missionJobRepository.deleteByTargetSpaceObjectId(id);
        telemetryRepository.deleteBySpaceObjectId(id);
        anomalyRepository.deleteBySpaceObjectId(id);        
        collisionRepository.deleteByOurSatelliteId(id);     

        
        repository.deleteById(id);
    }


    public List<SpaceObjectDTO> getAllObjectsWithLatestPosition() {
        return repository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<TelemetryDTO> getObjectTelemetryHistory(Long id) {
        return telemetryRepository.findBySpaceObjectIdOrderByTimestampDesc(id)
                .stream()
                .map(t -> new TelemetryDTO(
                        t.getLatitude(),
                        t.getLongitude(),
                        t.getAltitude(),
                        t.getBatteryPercent(),
                        t.getTimestamp()
                ))
                .toList();
    }

    private SpaceObjectDTO mapToDTO(SpaceObjectEntity obj) {
        return new SpaceObjectDTO(
                obj.getId(),
                obj.getCatalogId(),
                obj.getName(),
                obj.getObjectType() != null ? obj.getObjectType().name() : "SATELLITE",
                obj.getStatus() != null ? obj.getStatus().name() : "OFFLINE",
                obj.getTleLine1(),
                obj.getTleLine2(),
                obj.getLatitude() != null ? obj.getLatitude() : 0.0,
                obj.getLongitude() != null ? obj.getLongitude() : 0.0,
                obj.getAltitude() != null ? obj.getAltitude() : 0.0,
                100.0, 
                obj.getLastUpdate(),
                obj.getOriginalStatus() != null ? obj.getOriginalStatus().name() : null
        );
    }
}