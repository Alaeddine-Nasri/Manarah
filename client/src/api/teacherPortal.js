import api from './axios';

export const getTeacherSessions = () => api.get('/teacher-portal/sessions');
export const getTeacherPayments = () => api.get('/teacher-portal/payments');
export const getTeacherSummary  = () => api.get('/teacher-portal/summary');
