// Plik: src/services/settingsRequest.ts
import { apiClient } from './apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

export interface UserProfileDTO {
  username: string;
  role: string;
  clearance: string;
  joinedDate: string;
}

// Zaktualizowany interfejs preferencji (Dodane pole showDebrisEnabled) [1]
export interface UserPreferencesDTO {
  audioAlertsEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  showDebrisEnabled: boolean; 
}

// 1. POBIERANIE DOSSIER
export const useUserProfile = () => {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfileDTO> => {
      const response = await apiClient.get('/api/users/me');
      return response.data;
    },
    staleTime: 1000 * 60 * 30,
  });
};

// 2. POBIERANIE PREFERENCJI
export const useUserPreferences = () => {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferencesDTO> => {
      const response = await apiClient.get('/api/users/me/preferences');
      return response.data;
    },
  });
};

// 3. AKTUALIZACJA PREFERENCJI
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPrefs: UserPreferencesDTO) => {
      const response = await apiClient.put('/api/users/me/preferences', newPrefs);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
    onError: () => {
      message.error("ERROR UPDATING TERMINAL PREFERENCES.");
    }
  });
};

// 4. ZMIANA HASŁA
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.put('/api/users/me/password', {
        oldPassword: payload.oldPassword,
        newPassword: payload.newPassword
      });
      return response.data;
    },
    onSuccess: () => {
      message.success('SECURITY CODES UPDATED. SESSION REMAINS ACTIVE.');
    },
    onError: (error: any) => {
      message.error('ACCESS DENIED: ' + (error.response?.data?.message || 'Invalid current password.'));
    }
  });
};