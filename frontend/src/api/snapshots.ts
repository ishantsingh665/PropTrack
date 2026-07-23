import api from './client';

export interface Snapshot {
  id: string;
  companyId: string;
  month: string;
  propertyCount: number;
  totalGfaSqft: number;
  activeStakeCount: number;
  createdAt: string;
}

export interface DashboardData {
  current: Snapshot | null;
  previous: Snapshot | null;
  trends: {
    propertyCountDelta: number;
    gfaDelta: number;
    stakesDelta: number;
  };
}

export const takeSnapshot = async () => {
  const response = await api.post('/snapshots');
  return response.data;
};

export const getCompanySnapshots = async (companyId: string): Promise<Snapshot[]> => {
  const response = await api.get(`/snapshots/${companyId}`);
  return response.data;
};

export const getDashboardData = async (companyId: string, month?: string): Promise<DashboardData> => {
  const response = await api.get(`/dashboard/${companyId}`, { params: { month } });
  return response.data;
};

export const getGateStatus = async (): Promise<{ isOpen: boolean }> => {
  const response = await api.get('/snapshots/gate-status');
  return response.data;
};
