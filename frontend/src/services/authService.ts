import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3666';

const client = axios.create({
  baseURL: `${API_URL}/api/v1/auth`,
  headers: { 'Content-Type': 'application/json' }
});

export interface AuthUser {
  id: string;
  organizationId: string;
  role: 'admin' | 'client' | 'student';
  email: string;
  fullName: string;
}

export const authStorage = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string) => localStorage.setItem('auth_token', token),
  clearToken: () => localStorage.removeItem('auth_token')
};

export const authService = {
  async login(email: string, password: string) {
    const response = await client.post('/login', { email, password });
    return response.data as { success: boolean; data: { token: string; user: AuthUser } };
  },

  async me(token: string) {
    const response = await client.get('/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data as { success: boolean; data: AuthUser };
  }
};

