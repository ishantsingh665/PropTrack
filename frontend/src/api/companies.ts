import api from './client';

export interface Company {
  id: string;
  name: string;
  registrationNumber: string | null;
  countryCode: string;
  isin: string | null;
  status: 'active' | 'inactive';
  snapshotsEnabled: boolean;
  indexListed: boolean;
  reportPropertyCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUpdateInput {
  name?: string;
  registrationNumber?: string | null;
  countryCode?: string;
  isin?: string | null;
  status?: 'active' | 'inactive';
  snapshotsEnabled?: boolean;
  indexListed?: boolean;
  reportPropertyCount?: number | null;
}

export const getCompanies = async (params: { after?: string; limit?: number; search?: string }) => {
  const response = await api.get('/companies', { params });
  return response.data;
};

export const getCompany = async (id: string): Promise<Company> => {
  const response = await api.get(`/companies/${id}`);
  return response.data;
};

export const createCompany = async (data: CompanyUpdateInput) => {
  const response = await api.post('/companies', data);
  return response.data;
};

export const updateCompany = async (id: string, data: CompanyUpdateInput) => {
  const response = await api.put(`/companies/${id}`, data);
  return response.data;
};

export const deleteCompany = async (id: string) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};
