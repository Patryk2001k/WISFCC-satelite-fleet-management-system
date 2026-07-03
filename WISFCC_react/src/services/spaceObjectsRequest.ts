
import { apiClient } from './apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

export interface SpaceObjectDTO {
  id: number;
  name: string;
  catalogId: string;
  type: string;
  tleLine1: string;
  tleLine2: string;
  latitude: number;
  longitude: number;
  altitude: number;
  lastUpdatedUtc: string; 
  status: string;
  batteryLevel: number;
}


const ENDPOINT = '/api/fleet'; 

export const fetchSpaceObjects = async (): Promise<SpaceObjectDTO[]> => {
  const response = await apiClient.get<SpaceObjectDTO[]>('/api/space-objects');
  return response.data;
};

export const useSpaceObjectsCache = () => {
  return useQuery({
    queryKey: ['space-objects'],
    queryFn: fetchSpaceObjects,
    staleTime: 1000 * 60 * 60, 
  });
};


export const fetchSpaceObjectsFleet = async (): Promise<SpaceObjectDTO[]> => {
  const response = await apiClient.get<SpaceObjectDTO[]>(ENDPOINT);
  return response.data;
};


export const useSpaceObjectsFleetCache = () => {
  return useQuery({
    queryKey: ['space-objects', 'fleet'], 
    queryFn: fetchSpaceObjectsFleet,
    staleTime: 1000 * 60 * 60,
  });
};


export const useCreateSpaceObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSat: Partial<SpaceObjectDTO>) => {
      const response = await apiClient.post(ENDPOINT, newSat);
      return response.data;
    },
    onSuccess: () => {
      message.success('NEW ORBITAL ASSET ADDED TO CENTRAL REGISTRY.');
      queryClient.invalidateQueries({ queryKey: ['space-objects'] }); 
    },
    onError: () => message.error('SERVER COMMUNICATION ERROR (POST).')
  });
};


export const useUpdateSpaceObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updatedData }: Partial<SpaceObjectDTO> & { id: number }) => {
      const response = await apiClient.put(`${ENDPOINT}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      message.success('TELEMETRY DATA SUCCESSFULLY UPDATED.');
      queryClient.invalidateQueries({ queryKey: ['space-objects'] });
    },
    onError: () => message.error('SERVER COMMUNICATION ERROR (PUT).')
  });
};


export const useDeleteSpaceObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`${ENDPOINT}/${id}`);
    },
    onSuccess: () => {
      message.success('ORBITAL DECOMMISSIONING COMPLETED.');
      queryClient.invalidateQueries({ queryKey: ['space-objects'] });
    }
  });
};