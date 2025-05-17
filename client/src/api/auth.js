import api from './axios';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const logout = () => api.post('/auth/logout');
export const changePassword = (current_password, new_password) => api.post('/auth/change-password', { current_password, new_password });
