import api from './client';

export interface Attachment {
  id: string;
  noteId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
}

export interface Note {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export const getCompanyNotes = async (companyId: string): Promise<Note[]> => {
  const response = await api.get(`/companies/${companyId}/notes`);
  return response.data;
};

export const createNote = async (companyId: string, data: { title: string; content: string }): Promise<Note> => {
  const response = await api.post(`/companies/${companyId}/notes`, data);
  return response.data;
};

export const updateNote = async (companyId: string, noteId: string, data: { title: string; content: string }): Promise<Note> => {
  const response = await api.put(`/companies/${companyId}/notes/${noteId}`, data);
  return response.data;
};

export const deleteNote = async (companyId: string, noteId: string): Promise<void> => {
  await api.delete(`/companies/${companyId}/notes/${noteId}`);
};

export const uploadAttachment = async (noteId: string, file: File): Promise<Attachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/notes/${noteId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getDownloadUrl = async (noteId: string, attachmentId: string): Promise<string> => {
  const response = await api.get(`/notes/${noteId}/attachments/${attachmentId}/download`);
  return response.data.downloadUrl;
};

export const deleteAttachment = async (noteId: string, attachmentId: string): Promise<void> => {
  await api.delete(`/notes/${noteId}/attachments/${attachmentId}`);
};
