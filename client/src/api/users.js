import api from './axios';

export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });
export const setUserPassword = (id, password) => api.patch(`/users/${id}/password`, { password });
export const removeUser = (id) => api.delete(`/users/${id}`);
