import api from './client';

export const getCompanies = async (params: { after?: string; limit?: number; search?: string }) => {
  const response = await api.get('/companies', { params });
  return response.data;
};

export const getCompany = async (id: string) => {
  const response = await api.get(`/companies/${id}`);
  return response.data;
};

export const createCompany = async (data: { name: string; registrationNumber?: string; countryCode: string }) => {
  const response = await api.post('/companies', data);
  return response.data;
};

export const updateCompany = async (id: string, data: { name: string; registrationNumber?: string; countryCode: string }) => {
  const response = await api.put(`/companies/${id}`, data);
  return response.data;
};

export const deleteCompany = async (id: string) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};
