
import { apiClient } from './apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';


export interface MissionDTO {
  jobId: string;
  targetSpaceObjectId: number;
  targetSatelliteName: string;
  commandType: 'ORBIT_ADJUST' | 'SENSOR_CALIBRATION' | 'TRANSMITTER_POWER' | 'SLEEP_MODE';
  parameters: Record<string, any>; 
  scheduledTimeUtc: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  orderedBy: string;
  executionLogs: string | null;
}


export interface CreateMissionRequestDTO {
  targetSpaceObjectId: number;
  commandType: string;
  parameters: Record<string, any>;
  scheduledTimeUtc: string;
}

const ENDPOINT = '/api/missions';


export const useMissionsCache = () => {
  return useQuery({
    queryKey: ['missions'],
    queryFn: async (): Promise<MissionDTO[]> => {
      const response = await apiClient.get(ENDPOINT);
      return response.data.content ? response.data.content : response.data;
    },
    staleTime: 1000 * 30, 
    refetchInterval: 10000, 
  });
};


export const useCreateMission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newMission: CreateMissionRequestDTO) => {
      const response = await apiClient.post(ENDPOINT, newMission);
      return response.data;
    },
    onSuccess: () => {
      message.success('MISSION REQUEST SENT TO THE SYSTEM.');
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
    onError: (error: any) => {
      console.error("Mission request error:", error);
      message.error('REJECTED: ' + (error.response?.data?.message || 'Błąd serwera'));
    }
  });
};