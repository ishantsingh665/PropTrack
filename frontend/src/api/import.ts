import api from './client';

export interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filename: string;
  totalRows: number | null;
  processedRows: number | null;
  errorCount: number | null;
  errors: any;
  createdAt: string;
}

export const uploadCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('csv', file);

  const response = await api.post('/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getImportStatus = async (jobId: string): Promise<ImportJob> => {
  const response = await api.get(`/import/${jobId}`);
  return response.data;
};
