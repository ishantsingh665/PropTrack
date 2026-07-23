import api from './client';

export interface Snapshot {
  id: string;
  snapshotNumber: number;
  name: string;
  year: number;
  companiesIncluded: number;
  propertiesIncluded: number;
  totalGfaSqft: number;
  createdAt: string;
  createdBy: string;
}

export interface SnapshotDetail extends Omit<Snapshot, 'companiesIncluded' | 'propertiesIncluded' | 'totalGfaSqft'> {
  companies: SnapshotCompany[];
}

export interface SnapshotCompany {
  snapshotCompanyUid: string;
  originalCompanyId: string;
  name: string;
  isin: string | null;
  status: string;
  reportPropertyCount: number | null;
  totalPropertyCount: number;
  totalGfaSqft: number;
  properties: SnapshotProperty[];
}

export interface SnapshotProperty {
  snapshotPropertyUid: string;
  originalPropertyId: string;
  name: string;
  addressLine1: string;
  city: string;
  gfaSqft: number | null;
  propertyLevel: string;
}

export interface SnapshotPreview {
  companiesCount: number;
  propertiesCount: number;
  totalGfaSqft: number;
}

export const getSnapshots = async (year?: number): Promise<Snapshot[]> => {
  const response = await api.get('/snapshots', { params: { year } });
  return response.data;
};

export const getSnapshotYears = async (): Promise<number[]> => {
  const response = await api.get('/snapshots/years');
  return response.data.years;
};

export const getSnapshotPreview = async (): Promise<SnapshotPreview> => {
  const response = await api.get('/snapshots/preview');
  return response.data;
};

export const createSnapshot = async (name: string, year: number): Promise<Snapshot> => {
  const response = await api.post('/snapshots', { name, year });
  return response.data;
};

export const getSnapshotDetail = async (id: string): Promise<SnapshotDetail> => {
  const response = await api.get(`/snapshots/${id}`);
  return response.data;
};

export const updateSnapshotCompany = async (snapshotId: string, snapshotCompanyId: string, data: Partial<SnapshotCompany>) => {
  const response = await api.patch(`/snapshots/${snapshotId}/companies/${snapshotCompanyId}`, data);
  return response.data;
};

export const updateSnapshotProperty = async (snapshotId: string, snapshotPropertyId: string, data: Partial<SnapshotProperty>) => {
  const response = await api.patch(`/snapshots/${snapshotId}/properties/${snapshotPropertyId}`, data);
  return response.data;
};

// --- Legacy / Dashboard API ---
export const getDashboardData = async (companyId: string, month?: string) => {
  const response = await api.get(`/dashboard/${companyId}`, { params: { month } });
  return response.data;
};

export const getGateStatus = async (): Promise<{ isOpen: boolean }> => {
  const response = await api.get('/snapshots/gate-status');
  return response.data;
};
