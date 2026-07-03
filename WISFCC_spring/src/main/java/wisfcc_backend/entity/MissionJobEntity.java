package wisfcc_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import wisfcc_backend.enums.CommandType;
import wisfcc_backend.enums.MissionStatus;

import java.time.Instant;

@Entity
@Table(name = "mission_jobs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MissionJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String jobId; 

    @Column(nullable = false)
    private Long targetSpaceObjectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommandType commandType;

    @Column(columnDefinition = "TEXT")
    private String parametersJson; 

    @Column(nullable = false)
    private Instant scheduledTimeUtc;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MissionStatus status;

    private String orderedBy;

    @Column(columnDefinition = "TEXT")
    private String executionLogs;

    @Column(updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        
        if (this.jobId == null) {
            this.jobId = "JOB-" + Instant.now().getEpochSecond();
        }
    }
}