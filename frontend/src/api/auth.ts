import { api, setAuthToken } from './client.js';
import type { User, LoginResponse } from '../types/auth.js';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', credentials);
    setAuthToken(res.data.accessToken);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },
};
