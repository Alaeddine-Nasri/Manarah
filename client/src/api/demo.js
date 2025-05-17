import api from './axios';

export const loadDemoData = () => api.post('/demo/seed');
