import api from './axios';

// date = 'YYYY-MM-DD' for daily view, week_start for weekly view
export const getSessions = (params) => api.get('/sessions', { params });
export const getSession = (id) => api.get(`/sessions/${id}`);
export const createSession = (data) => api.post('/sessions', data);
export const updateSession = (id, data) => api.put(`/sessions/${id}`, data);
export const deleteSession = (id, also_recurring = false) =>
  api.delete(`/sessions/${id}`, { params: { also_recurring } });
