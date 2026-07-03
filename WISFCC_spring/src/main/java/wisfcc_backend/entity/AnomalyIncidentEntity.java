package wisfcc_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "system_anomalies")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AnomalyIncidentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String incidentId; 

    @Column(nullable = false)
    private Instant timestamp;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "space_object_id", nullable = false)
    private SpaceObjectEntity spaceObject;

    @Column(nullable = false)
    private String anomalyType; 

    @Column(nullable = false)
    private String severity; 

    @Column(nullable = false)
    private String status; 
}