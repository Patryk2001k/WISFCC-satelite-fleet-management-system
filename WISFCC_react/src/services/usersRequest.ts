
import { apiClient } from './apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

export interface UserDTO {
  id: string;
  username: string;
  role: 'ADMIN' | 'OPERATOR';
  clearance: 'LEVEL_5' | 'LEVEL_3' | 'LEVEL_1';
  status: 'ACTIVE' | 'SUSPENDED';
  lastLogin: string;
}

export interface CreateUserPayload {
  username: string;
  role: 'ADMIN' | 'OPERATOR';
  clearance: 'LEVEL_5' | 'LEVEL_3' | 'LEVEL_1';
  tempPassword?: string;
}

const ENDPOINT = '/api/users';


export const useUsersCache = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserDTO[]> => {
      const response = await apiClient.get(ENDPOINT);
      return response.data;
    },
  });
};


export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const response = await apiClient.post(ENDPOINT, payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('NEW PERSONNEL ENLISTED IN CENTRAL REGISTRY.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      message.error('REGISTRATION ERROR: ' + (error.response?.data?.message || 'Connection timeout'));
    }
  });
};


export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) => {
      const response = await apiClient.put(`${ENDPOINT}/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      message.warning(`ACCOUNT STATUS CHANGED TO: ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      message.error('STATUS CHANGE ERROR: ' + (error.response?.data?.message || 'Connection timeout'));
    }
  });
};


export const useResetUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`${ENDPOINT}/${id}/reset-password`);
      return response.data; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      message.error('PASSWORD GENERATION ERROR: ' + (error.response?.data?.message || 'Network error'));
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${ENDPOINT}/${id}`);
    },
    onSuccess: () => {
      message.success('USER ACCOUNT PERMANENTLY REMOVED.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      message.error('PERSONNEL DELETION ERROR: ' + (error.response?.data?.message || 'Connection timeout'));
    }
  });
};