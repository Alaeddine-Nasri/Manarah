import api from './axios';

export const getSchoolInfo   = ()     => api.get('/schools/info');
export const updateSchoolInfo = (data) => api.patch('/schools/info', data);
