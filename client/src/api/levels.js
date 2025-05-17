import api from './axios';

export const getLevels = () => api.get('/levels');
export const createLevel = (data) => api.post('/levels', data);
export const updateLevel = (id, data) => api.put(`/levels/${id}`, data);
export const deleteLevel = (id) => api.delete(`/levels/${id}`);

export const createYear = (levelId, data) => api.post(`/levels/${levelId}/years`, data);
export const updateYear = (id, data) => api.put(`/levels/years/${id}`, data);
export const deleteYear = (id) => api.delete(`/levels/years/${id}`);

export const createGroup = (yearId, data) => api.post(`/levels/years/${yearId}/groups`, data);
export const updateGroup = (id, data) => api.put(`/levels/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/levels/groups/${id}`);

export const getGroupStudents = (id) => api.get(`/levels/groups/${id}/students`);
export const addStudentToGroup = (groupId, student_id) => api.post(`/levels/groups/${groupId}/students`, { student_id });
export const removeStudentFromGroup = (groupId, studentId) => api.delete(`/levels/groups/${groupId}/students/${studentId}`);
