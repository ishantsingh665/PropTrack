import api from './client';

export interface DuplicatePair {
  id: string;
  property1Id: string;
  property2Id: string;
  status: 'pending' | 'duplicate' | 'not_duplicate' | 'merged';
  scope: 'same_company' | 'cross_company' | 'no_shared_ownership';
  matchLevel: 'building' | 'unit' | 'cross_level';
  confidenceScore: number;
  property1: any;
  property2: any;
  createdAt: string;
}

export const getDuplicates = async (params: { 
  status?: string; 
  scope?: string; 
  matchLevel?: string; 
}) => {
  const response = await api.get('/duplicates', { params });
  return response.data;
};

export const scanDuplicates = async () => {
  const response = await api.post('/duplicates/scan');
  return response.data;
};

export const updateDuplicateStatus = async (id: string, status: string) => {
  const response = await api.patch(`/duplicates/${id}`, { status });
  return response.data;
};

export const mergeDuplicates = async (id: string, keepId: string, removeId: string) => {
  const response = await api.post(`/duplicates/${id}/merge`, { keepId, removeId });
  return response.data;
};
