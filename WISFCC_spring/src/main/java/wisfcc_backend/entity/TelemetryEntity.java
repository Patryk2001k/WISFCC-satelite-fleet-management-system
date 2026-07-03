package wisfcc_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "telemetry")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "space_object_id", nullable = false) 
    private SpaceObjectEntity spaceObject; 

    
    private Double posX;
    private Double posY;
    private Double posZ;

    private Double latitude;
    private Double longitude;
    private Double altitude;

    
    private Double batteryPercent;

    
    @CreationTimestamp
    @Column(updatable = false)
    private Instant timestamp;
}