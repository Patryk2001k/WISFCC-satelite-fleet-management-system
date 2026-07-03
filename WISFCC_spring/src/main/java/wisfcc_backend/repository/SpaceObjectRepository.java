package wisfcc_backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.enums.ObjectType; 

import java.util.List;
import java.util.Optional;

public interface SpaceObjectRepository extends JpaRepository<SpaceObjectEntity, Long> {

    Optional<SpaceObjectEntity> findByCatalogId(String catalogId);

    
    List<SpaceObjectEntity> findByObjectTypeNot(ObjectType type);

    List<SpaceObjectEntity> findByObjectType(ObjectType type);
}