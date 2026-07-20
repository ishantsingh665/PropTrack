import api from './client';

export interface SearchResults {
  properties: any[];
  companies: any[];
}

export const globalSearch = async (query: string): Promise<SearchResults> => {
  const response = await api.get('/search', { params: { query } });
  return response.data;
};
