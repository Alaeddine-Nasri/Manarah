import api from './axios';

export const getPayroll = (params) => api.get('/payroll', { params });
export const getPayrollTeacher = (teacher_id, params) => api.get(`/payroll/${teacher_id}`, { params });
export const markPaid = (teacher_id, month) => api.post(`/payroll/${teacher_id}/mark-paid`, null, { params: { month } });
export const markUnpaid = (teacher_id, month) => api.delete(`/payroll/${teacher_id}/mark-paid`, { params: { month } });
