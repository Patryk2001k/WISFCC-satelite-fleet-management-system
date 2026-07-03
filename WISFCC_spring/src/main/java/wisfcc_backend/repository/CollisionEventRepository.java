package wisfcc_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import wisfcc_backend.entity.CollisionEventEntity;
import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CollisionEventRepository extends JpaRepository<CollisionEventEntity, Long> {
    
    List<CollisionEventEntity> findByTimeOfClosestApproachUtcAfterOrderByTimeOfClosestApproachUtcAsc(Instant now);

    List<CollisionEventEntity> findByTimeOfClosestApproachUtcAfterAndIsHandledFalseOrderByTimeOfClosestApproachUtcAsc(Instant now);

    
    List<CollisionEventEntity> findByTimeOfClosestApproachUtcBeforeAndIsHandledFalse(Instant now);

    
    List<CollisionEventEntity> findByOurSatelliteIdAndIsHandledFalse(Long satelliteId);

    @Modifying
    @Query("DELETE FROM CollisionEventEntity c WHERE c.ourSatellite.id = :satelliteId")
    void deleteByOurSatelliteId(@Param("satelliteId") Long satelliteId);

    boolean existsByThreatCatalogIdAndOurSatelliteIdAndIsHandledFalse(String threatCatalogId, Long ourSatelliteId);

    List<CollisionEventEntity> findByThreatCatalogIdAndIsHandledFalse(String threatCatalogId);

}