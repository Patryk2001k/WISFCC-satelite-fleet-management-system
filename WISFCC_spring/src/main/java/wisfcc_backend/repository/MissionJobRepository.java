package wisfcc_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import wisfcc_backend.entity.MissionJobEntity;
import wisfcc_backend.enums.MissionStatus;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

@Repository
public interface MissionJobRepository extends JpaRepository<MissionJobEntity, Long> {
    List<MissionJobEntity> findByStatus(MissionStatus status);
    List<MissionJobEntity> findByStatusAndScheduledTimeUtcBefore(MissionStatus status, Instant time);
    @Modifying
    @Query("DELETE FROM MissionJobEntity m WHERE m.targetSpaceObjectId = :satelliteId")
    void deleteByTargetSpaceObjectId(@Param("satelliteId") Long satelliteId);
}