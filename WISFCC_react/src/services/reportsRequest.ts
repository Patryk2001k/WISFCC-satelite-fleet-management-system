import { apiClient } from './apiClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { message } from 'antd';

export interface ReportsMetricsDTO {
  totalMissions: number;
  failedMissions: number;
  successRatePercent: number;
  groundStationBandwidthPercent: number;
  mainframeCpuPercent: number;
  fleetAvgEnergyPercent: number;
}

export interface AnomalyRecordDTO {
  incidentId: string;
  timestampUtc: string;
  satelliteId: number;
  satelliteName: string;
  anomalyType: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'RESOLVED' | 'INVESTIGATING';
}

export interface GenerateReportRequest {
  targetSatelliteId: number | null; 
  reportType: 'FLEET_TELEMETRY' | 'ANOMALY_LOGS' | 'MISSION_SUMMARY';
  format: 'PDF' | 'CSV' | 'JSON';
}


export const useReportsMetricsCache = () => {
  return useQuery({
    queryKey: ['reports-metrics'],
    queryFn: async (): Promise<ReportsMetricsDTO> => {
      const response = await apiClient.get('/api/reports/metrics');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, 
  });
};


export const useAnomaliesCache = (satelliteId: number | null) => {
  return useQuery({
    queryKey: ['reports-anomalies', satelliteId],
    queryFn: async (): Promise<AnomalyRecordDTO[]> => {
      const url = satelliteId 
        ? `/api/reports/anomalies?satelliteId=${satelliteId}`
        : '/api/reports/anomalies';
      const response = await apiClient.get(url);
      return response.data;
    },
  });
};


export const useGenerateReport = () => {
  return useMutation({
    mutationFn: async (payload: GenerateReportRequest) => {
      
      const response = await apiClient.post('/api/reports/generate', payload, {
        responseType: 'blob'
      });
      return { data: response.data, payload };
    },
    onSuccess: (result) => {
      const { data, payload } = result;
      
      
      let mimeType = 'application/pdf';
      if (payload.format === 'CSV') mimeType = 'text/csv';
      if (payload.format === 'JSON') mimeType = 'application/json';

      const blob = new Blob([data], { type: mimeType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      
      const fileExt = payload.format.toLowerCase();
      link.download = `WISFCC_REPORT_${payload.reportType}_${new Date().toISOString().slice(0, 10)}.${fileExt}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(`REPORT GENERATED AND DOWNLOADED: ${link.download}`);
    },
    onError: (error: any) => {
      console.error("Report generation error:", error);
      message.error("FAILED TO COMPILE REPORT DATA.");
    }
  });
};