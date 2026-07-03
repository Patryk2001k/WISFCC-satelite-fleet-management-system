
import { apiClient } from '../../../services/apiClient';


export interface LoginCredentials {
  username: string;
  password: string;
}


export interface LoginResponse {
  token: string; 
  message: string;
  role: string;  
}


export const loginRequest = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
  return response.data;
};