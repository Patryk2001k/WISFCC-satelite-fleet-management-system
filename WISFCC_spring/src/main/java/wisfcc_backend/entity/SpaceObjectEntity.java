package wisfcc_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import wisfcc_backend.enums.ObjectStatus;
import wisfcc_backend.enums.ObjectType;
import java.time.Instant;

@Entity
@Table(name = "space_objects")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SpaceObjectEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String catalogId;

    private String name;

    @Enumerated(EnumType.STRING)
    private ObjectType objectType;

    @Enumerated(EnumType.STRING)
    private ObjectStatus status;

    @Enumerated(EnumType.STRING)
    private ObjectStatus previousStatus;

    
    @Enumerated(EnumType.STRING)
    private ObjectStatus originalStatus;

    private String tleLine1;
    private String tleLine2;

    private Double latitude;
    private Double longitude;
    private Double altitude;

    private Instant lastUpdate;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.lastUpdate = Instant.now();
    }
}