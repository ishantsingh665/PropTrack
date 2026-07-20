import api from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
  preferredGfaUnit?: 'sqft' | 'sqm';
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (data: { email: string; name: string; password?: string; role: string }) => {
  const response = await api.post('/users', data);
  return response.data;
};

export const updateUserRole = async (id: string, role: string) => {
  const response = await api.patch(`/users/${id}/role`, { role });
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};
