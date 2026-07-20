import api from './client';

export interface PropertyType {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  children?: PropertyType[];
}

export const getPropertyTypes = async (): Promise<PropertyType[]> => {
  const response = await api.get('/property-types');
  return response.data;
};

export const createPropertyType = async (data: { name: string; parentId?: string }): Promise<PropertyType> => {
  const response = await api.post('/property-types', data);
  return response.data;
};

export const togglePropertyTypeActive = async (id: string): Promise<PropertyType> => {
  const response = await api.patch(`/property-types/${id}/toggle-active`);
  return response.data;
};
