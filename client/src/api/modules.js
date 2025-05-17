import api from './axios';

export const getModules = (params) => api.get('/modules', { params });
export const getModule = (id) => api.get(`/modules/${id}`);
export const createModule = (data) => api.post('/modules', data);
export const updateModule = (id, data) => api.put(`/modules/${id}`, data);
export const deleteModule = (id) => api.delete(`/modules/${id}`);
