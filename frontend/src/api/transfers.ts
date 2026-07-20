import api from './client';

export interface TransferLeg {
  propertyId: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  ownershipPct: number;
}

export interface TransferEvent {
  id: string;
  type: 'transfer' | 'swap' | 'reversal';
  notes?: string;
  createdAt: string;
  reversedBy?: string | null;
  legs: {
    id: string;
    direction: 'in' | 'out';
    propertyCompany: {
      property: {
        id: string;
        name: string;
        address_line1: string;
      };
      company: {
        id: string;
        name: string;
      };
      ownershipPct: number;
    };
  }[];
}

export const getTransfers = async (after?: string, limit = 50) => {
  const response = await api.get('/transfers', {
    params: { after, limit },
  });
  return response.data;
};

export const getTransfer = async (id: string) => {
  const response = await api.get(`/transfers/${id}`);
  return response.data;
};

export const createTransfer = async (data: {
  type: 'transfer' | 'swap';
  legs: TransferLeg[];
  notes?: string;
}) => {
  const response = await api.post('/transfers', data);
  return response.data;
};

export const reverseTransfer = async (id: string, notes?: string) => {
  const response = await api.post(`/transfers/${id}/reverse`, { notes });
  return response.data;
};
