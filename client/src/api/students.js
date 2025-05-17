import api from './axios';

export const getStudents = (params) => api.get('/students', { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);

export const promoteStudent = (id, year_id) => api.patch(`/students/${id}/promote`, { year_id });
export const transferStudent = (id, group_id) => api.patch(`/students/${id}/transfer`, { group_id });
export const setStudentStatus = (id, status) => api.patch(`/students/${id}/status`, { status });
export const uploadStudentPhoto = (id, file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post(`/students/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
