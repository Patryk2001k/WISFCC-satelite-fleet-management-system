import { apiClient } from './apiClient';
import { useQuery } from '@tanstack/react-query';



export interface CasAlertDTO {
  alertId: string;
  ourSatelliteId: number;
  ourSatelliteName: string;
  threatCatalogId: string;
  threatName: string;
  timeOfClosestApproach: string; 
  missDistanceKm: number;
  collisionProbability: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CasDashboardResponseDTO {
  stats: {
    activeTracks: number;
    criticalThreats: number;
  };
  alerts: CasAlertDTO[];
}

const ENDPOINT = '/api/cas/alerts';


export const useCasAlertsCache = () => {
  return useQuery({
    queryKey: ['cas-alerts'],
    queryFn: async (): Promise<CasDashboardResponseDTO> => {
      const response = await apiClient.get(ENDPOINT);
      return response.data;
    },
    
    refetchInterval: 15000, 
  });
};