import api from './client';

export interface GeocodeJob {
  id: string;
  propertyId: string;
  attempts: number;
  lastError: string | null;
  nextRunAt: string;
  createdAt: string;
  property: {
    id: string;
    name: string | null;
    addressLine1: string;
    city: string;
    countryCode: string;
  } | null;
}

export const getGeocodeQueue = async (): Promise<GeocodeJob[]> => {
  const response = await api.get('/geocoding/queue');
  return response.data;
};

export const retryGeocodeJob = async (id: string) => {
  const response = await api.post(`/geocoding/queue/${id}/retry`);
  return response.data;
};

export const processGeocodeQueue = async () => {
  const response = await api.post('/geocoding/process');
  return response.data;
};
