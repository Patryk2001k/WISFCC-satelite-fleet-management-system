package wisfcc_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import wisfcc_backend.enums.RiskLevel;
import java.time.Instant;

@Entity
@Table(name = "collision_events")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CollisionEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String eventId; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "our_satellite_id", nullable = false)
    private SpaceObjectEntity ourSatellite;

    private String threatCatalogId; 
    private String threatDescription; 

    private Instant timeOfClosestApproachUtc; 

    private Double missDistanceKm;

    @Column(precision = 6)
    private Double collisionProbability;

    @Enumerated(EnumType.STRING)
    private RiskLevel riskLevel;

    
    
    @Builder.Default
    @Column(nullable = false)
    private Boolean isHandled = false;
}