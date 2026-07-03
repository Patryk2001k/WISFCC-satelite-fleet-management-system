package wisfcc_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import wisfcc_backend.entity.TelemetryEntity;
import wisfcc_backend.entity.SpaceObjectEntity;

import java.util.List;
import java.util.Optional;

public interface TelemetryRepository extends JpaRepository<TelemetryEntity, Long> {

    Optional<TelemetryEntity> findTopBySpaceObjectOrderByTimestampDesc(SpaceObjectEntity spaceObject);

    List<TelemetryEntity> findBySpaceObjectIdOrderByTimestampDesc(Long spaceObjectId);

    void deleteBySpaceObjectId(Long spaceObjectId);

    
    List<TelemetryEntity> findAllByOrderBySpaceObjectIdAscTimestampDesc();
}