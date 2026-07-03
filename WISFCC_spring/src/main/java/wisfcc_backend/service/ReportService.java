package wisfcc_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import wisfcc_backend.dto.AnomalyIncidentDTO;
import wisfcc_backend.dto.ReportGenerateRequestDTO;
import wisfcc_backend.dto.ReportMetricsDTO;
import wisfcc_backend.entity.AnomalyIncidentEntity;
import wisfcc_backend.entity.MissionJobEntity;
import wisfcc_backend.entity.SpaceObjectEntity;
import wisfcc_backend.entity.TelemetryEntity;
import wisfcc_backend.enums.MissionStatus;
import wisfcc_backend.enums.ObjectStatus;
import wisfcc_backend.enums.ObjectType;
import wisfcc_backend.repository.AnomalyIncidentRepository;
import wisfcc_backend.repository.MissionJobRepository;
import wisfcc_backend.repository.SpaceObjectRepository;
import wisfcc_backend.repository.TelemetryRepository;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final MissionJobRepository missionRepository;
    private final SpaceObjectRepository spaceObjectRepository;
    private final TelemetryRepository telemetryRepository;
    private final AnomalyIncidentRepository anomalyRepository;
    private final ObjectMapper objectMapper;

    public ReportService(MissionJobRepository missionRepository,
                         SpaceObjectRepository spaceObjectRepository,
                         TelemetryRepository telemetryRepository,
                         AnomalyIncidentRepository anomalyRepository,
                         ObjectMapper objectMapper) {
        this.missionRepository = missionRepository;
        this.spaceObjectRepository = spaceObjectRepository;
        this.telemetryRepository = telemetryRepository;
        this.anomalyRepository = anomalyRepository;
        this.objectMapper = objectMapper;
    }

    
    
    
    public ReportMetricsDTO getMetrics() {
        long totalMissions = missionRepository.count();
        long failedMissions = missionRepository.findAll().stream()
                .filter(m -> m.getStatus() == MissionStatus.FAILED).count();

        double successRate = totalMissions > 0
                ? Math.round(((totalMissions - failedMissions) / (double) totalMissions) * 1000.0) / 10.0
                : 100.0;

        
        long activeSats = spaceObjectRepository.findByObjectTypeNot(ObjectType.DEBRIS).stream()
                .filter(sat -> sat.getStatus() != ObjectStatus.DESTROYED).count();
        int bandwidth = (int) Math.min(98, 45 + (activeSats * 4));

        
        long runningMissions = missionRepository.findByStatus(MissionStatus.EXECUTING).size();
        int cpu = (int) Math.min(100, 30 + (runningMissions * 15) + (activeSats * 2));

        
        double avgEnergy = spaceObjectRepository.findByObjectTypeNot(ObjectType.DEBRIS).stream()
                .filter(sat -> sat.getStatus() != ObjectStatus.DESTROYED)
                .map(sat -> telemetryRepository.findTopBySpaceObjectOrderByTimestampDesc(sat)
                        .map(TelemetryEntity::getBatteryPercent)
                        .orElse(92.0)) 
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(92.0);

        avgEnergy = Math.round(avgEnergy * 10.0) / 10.0;

        return new ReportMetricsDTO(totalMissions, failedMissions, successRate, bandwidth, cpu, avgEnergy);
    }

    
    
    
    public List<AnomalyIncidentDTO> getAnomalies(Long satelliteId) {
        Instant sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        List<AnomalyIncidentEntity> entities;

        if (satelliteId != null) {
            entities = anomalyRepository.findByTimestampAfterAndSpaceObjectIdOrderByTimestampDesc(sevenDaysAgo, satelliteId);
        } else {
            entities = anomalyRepository.findByTimestampAfterOrderByTimestampDesc(sevenDaysAgo);
        }

        return entities.stream().map(this::mapToAnomalyDTO).collect(Collectors.toList());
    }

    
    
    
    public byte[] generateReport(ReportGenerateRequestDTO req) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        
        if ("JSON".equalsIgnoreCase(req.format())) {
            Object dataToSerialize = getReportRawData(req);
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(dataToSerialize);
        }

        
        if ("CSV".equalsIgnoreCase(req.format())) {
            return generateCsvReport(req);
        }

        
        if ("PDF".equalsIgnoreCase(req.format())) {
            return generatePdfReport(req);
        }

        throw new IllegalArgumentException("Nieobsługiwany format raportu: " + req.format());
    }

    

    private Object getReportRawData(ReportGenerateRequestDTO req) {
        if ("ANOMALY_LOGS".equalsIgnoreCase(req.reportType())) {
            return getAnomalies(req.targetSatelliteId());
        } else if ("MISSION_SUMMARY".equalsIgnoreCase(req.reportType())) {
            return missionRepository.findAll().stream()
                    .filter(m -> req.targetSatelliteId() == null || m.getTargetSpaceObjectId().equals(req.targetSatelliteId()))
                    .collect(Collectors.toList());
        } else {
            
            if (req.targetSatelliteId() != null) {
                return telemetryRepository.findBySpaceObjectIdOrderByTimestampDesc(req.targetSatelliteId());
            } else {
                return telemetryRepository.findAll();
            }
        }
    }

    private byte[] generateCsvReport(ReportGenerateRequestDTO req) {
        StringBuilder csv = new StringBuilder();

        if ("ANOMALY_LOGS".equalsIgnoreCase(req.reportType())) {
            csv.append("IncidentId,TimestampUtc,SatelliteId,SatelliteName,AnomalyType,Severity,Status\n");
            List<AnomalyIncidentDTO> anomalies = getAnomalies(req.targetSatelliteId());
            for (AnomalyIncidentDTO a : anomalies) {
                csv.append(String.format("%s,%s,%d,%s,%s,%s,%s\n",
                        a.incidentId(), a.timestampUtc(), a.satelliteId(), a.satelliteName(), a.anomalyType(), a.severity(), a.status()));
            }
        } else if ("MISSION_SUMMARY".equalsIgnoreCase(req.reportType())) {
            csv.append("JobId,TargetSatelliteId,CommandType,ScheduledTime,Status,OrderedBy\n");
            List<MissionJobEntity> missions = missionRepository.findAll().stream()
                    .filter(m -> req.targetSatelliteId() == null || m.getTargetSpaceObjectId().equals(req.targetSatelliteId()))
                    .toList();
            for (MissionJobEntity m : missions) {
                csv.append(String.format("%s,%d,%s,%s,%s,%s\n",
                        m.getJobId(), m.getTargetSpaceObjectId(), m.getCommandType(), m.getScheduledTimeUtc(), m.getStatus(), m.getOrderedBy()));
            }
        } else {
            
            csv.append("TelemetryId,SatelliteId,Latitude,Longitude,Altitude,BatteryPercent,Timestamp\n");

            
            List<TelemetryEntity> telemetries = req.targetSatelliteId() != null
                    ? telemetryRepository.findBySpaceObjectIdOrderByTimestampDesc(req.targetSatelliteId())
                    : telemetryRepository.findAllByOrderBySpaceObjectIdAscTimestampDesc();

            for (TelemetryEntity t : telemetries) {
                
                double lat = t.getLatitude() != null ? t.getLatitude() : 0.0;
                double lon = t.getLongitude() != null ? t.getLongitude() : 0.0;
                double alt = t.getAltitude() != null ? t.getAltitude() : 0.0;
                double bat = t.getBatteryPercent() != null ? t.getBatteryPercent() : 0.0;

                csv.append(String.format("%d,%d,%.4f,%.4f,%.2f,%.1f,%s\n",
                        t.getId(), t.getSpaceObject().getId(), lat, lon, alt, bat, t.getTimestamp()));
            }
        }
        return csv.toString().getBytes();
    }

    private byte[] generatePdfReport(ReportGenerateRequestDTO req) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter.getInstance(document, baos);
        document.open();

        
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.DARK_GRAY);
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.BLUE);
        Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);

        
        Paragraph title = new Paragraph("WISFCC SYSTEM ANALYTICS REPORT", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(new Paragraph("Generated at: " + Instant.now() + " (UTC)\n\n", textFont));

        if ("ANOMALY_LOGS".equalsIgnoreCase(req.reportType())) {
            document.add(new Paragraph("System Anomalies Log (Last 7 Days)", sectionFont));
            document.add(new Paragraph("\n"));

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            String[] headers = {"ID", "Satellite", "Type", "Severity", "Status", "Timestamp"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Paragraph(h, headerFont));
                cell.setBackgroundColor(Color.GRAY);
                table.addCell(cell);
            }

            List<AnomalyIncidentDTO> anomalies = getAnomalies(req.targetSatelliteId());
            for (AnomalyIncidentDTO a : anomalies) {
                table.addCell(new Paragraph(a.incidentId(), textFont));
                table.addCell(new Paragraph(a.satelliteName(), textFont));
                table.addCell(new Paragraph(a.anomalyType(), textFont));
                table.addCell(new Paragraph(a.severity(), textFont));
                table.addCell(new Paragraph(a.status(), textFont));
                table.addCell(new Paragraph(a.timestampUtc().toString(), textFont));
            }
            document.add(table);

        } else if ("MISSION_SUMMARY".equalsIgnoreCase(req.reportType())) {
            document.add(new Paragraph("Mission Execution Summary", sectionFont));
            document.add(new Paragraph("\n"));

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            String[] headers = {"Job ID", "Command Type", "Scheduled Time", "Status", "Ordered By"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Paragraph(h, headerFont));
                cell.setBackgroundColor(Color.GRAY);
                table.addCell(cell);
            }

            List<MissionJobEntity> missions = missionRepository.findAll().stream()
                    .filter(m -> req.targetSatelliteId() == null || m.getTargetSpaceObjectId().equals(req.targetSatelliteId()))
                    .toList();
            for (MissionJobEntity m : missions) {
                table.addCell(new Paragraph(m.getJobId(), textFont));
                table.addCell(new Paragraph(m.getCommandType().name(), textFont));
                table.addCell(new Paragraph(m.getScheduledTimeUtc().toString(), textFont));
                table.addCell(new Paragraph(m.getStatus().name(), textFont));
                table.addCell(new Paragraph(m.getOrderedBy(), textFont));
            }
            document.add(table);

        } else {
            
            document.add(new Paragraph("Fleet Telemetry Readings Report", sectionFont));
            document.add(new Paragraph("\n"));

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            String[] headers = {"Sat ID", "Coordinates (Lat/Lon)", "Altitude (km)", "Battery", "Timestamp"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Paragraph(h, headerFont));
                cell.setBackgroundColor(Color.GRAY);
                table.addCell(cell);
            }

            
            List<TelemetryEntity> telemetries = req.targetSatelliteId() != null
                    ? telemetryRepository.findBySpaceObjectIdOrderByTimestampDesc(req.targetSatelliteId())
                    : telemetryRepository.findAllByOrderBySpaceObjectIdAscTimestampDesc();

            for (TelemetryEntity t : telemetries) {
                table.addCell(new Paragraph(t.getSpaceObject().getId().toString(), textFont));

                
                String coords = (t.getLatitude() != null && t.getLongitude() != null)
                        ? String.format("%.2f / %.2f", t.getLatitude(), t.getLongitude())
                        : "N/A";
                String alt = t.getAltitude() != null ? String.format("%.2f", t.getAltitude()) : "N/A";
                String bat = t.getBatteryPercent() != null ? String.format("%.1f%%", t.getBatteryPercent()) : "N/A";

                table.addCell(new Paragraph(coords, textFont));
                table.addCell(new Paragraph(alt, textFont));
                table.addCell(new Paragraph(bat, textFont));
                table.addCell(new Paragraph(t.getTimestamp().toString(), textFont));
            }
            document.add(table);
        }

        document.close();
        return baos.toByteArray();
    }

    private AnomalyIncidentDTO mapToAnomalyDTO(AnomalyIncidentEntity entity) {
        return new AnomalyIncidentDTO(
                entity.getIncidentId(),
                entity.getTimestamp(),
                entity.getSpaceObject().getId(),
                entity.getSpaceObject().getName(),
                entity.getAnomalyType(),
                entity.getSeverity(),
                entity.getStatus()
        );
    }
}