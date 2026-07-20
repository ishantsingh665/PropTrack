import api from './client';

export const getProperties = async (params: { 
  after?: string; 
  limit?: number; 
  companyId?: string; 
  status?: string; 
  countryCode?: string; 
  typeId?: string; 
  search?: string; 
}) => {
  const response = await api.get('/properties', { params });
  return response.data;
};

export const getProperty = async (id: string) => {
  const response = await api.get(`/properties/${id}`);
  return response.data;
};

export const createProperty = async (data: any) => {
  const response = await api.post('/properties', data);
  return response.data;
};

export const updateProperty = async (id: string, data: any) => {
  const response = await api.put(`/properties/${id}`, data);
  return response.data;
};

export const deleteProperty = async (id: string) => {
  const response = await api.delete(`/properties/${id}`);
  return response.data;
};

export const updatePropertyStatus = async (id: string, data: { status: string; companyId: string; reason?: string }) => {
  const response = await api.patch(`/properties/${id}/status`, data);
  return response.data;
};

export const getPropertyHistory = async (id: string) => {
  const response = await api.get(`/properties/${id}/history`);
  return response.data;
};

export const getPropertyOwnership = async (id: string) => {
  const response = await api.get(`/properties/${id}/ownership`);
  return response.data;
};

export const deleteHistoryEntry = async (propertyId: string, logId: string, reason: string) => {
  const response = await api.delete(`/properties/${propertyId}/history/${logId}`, { data: { reason } });
  return response.data;
};
