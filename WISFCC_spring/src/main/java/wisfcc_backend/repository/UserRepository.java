package wisfcc_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import wisfcc_backend.entity.UserEntity;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
}