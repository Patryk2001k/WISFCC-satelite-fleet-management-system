package wisfcc_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import wisfcc_backend.entity.AnomalyIncidentEntity;
import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnomalyIncidentRepository extends JpaRepository<AnomalyIncidentEntity, Long> {

    
    List<AnomalyIncidentEntity> findByTimestampAfterOrderByTimestampDesc(Instant threshold);

    
    List<AnomalyIncidentEntity> findByTimestampAfterAndSpaceObjectIdOrderByTimestampDesc(Instant threshold, Long satelliteId);

    @Modifying
    @Query("DELETE FROM AnomalyIncidentEntity a WHERE a.spaceObject.id = :spaceObjectId")
    void deleteBySpaceObjectId(@Param("spaceObjectId") Long spaceObjectId);

}