import api from './axios';

export const getDashboardStats       = ()  => api.get('/dashboard/stats');
export const getDashboardRevenue     = ()  => api.get('/dashboard/revenue-chart');
export const getDashboardAttendance  = ()  => api.get('/dashboard/attendance-chart');
export const getDashboardActivity    = ()  => api.get('/dashboard/recent-activity');
