import api from './axios';

export const getTeachers = () => api.get('/teachers');
export const getTeacher = (id) => api.get(`/teachers/${id}`);
export const createTeacher = (data) => api.post('/teachers', data);
export const updateTeacher = (id, data) => api.put(`/teachers/${id}`, data);
export const deleteTeacher = (id) => api.delete(`/teachers/${id}`);

export const addAssignment = (id, data) => api.post(`/teachers/${id}/assignments`, data);
export const removeAssignment = (id, assignmentId) => api.delete(`/teachers/${id}/assignments/${assignmentId}`);

export const setRateOverride = (id, data) => api.post(`/teachers/${id}/rates`, data);

export const getTeacherAccount = (id) => api.get(`/teachers/${id}/account`);
export const createTeacherAccount = (id) => api.post(`/teachers/${id}/account`);
export const resetTeacherPassword = (id) => api.post(`/teachers/${id}/reset-password`);
