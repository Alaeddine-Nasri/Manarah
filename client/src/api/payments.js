import api from './axios';

export const getPayments = (params) => api.get('/payments', { params });
export const getPaymentsSummary = (month) => api.get('/payments/summary', { params: { month } });
export const getPreviewSplit = (params) => api.get('/payments/preview-split', { params });
export const getPayment = (id) => api.get(`/payments/${id}`);
export const createPayment = (data) => api.post('/payments', data);
export const updatePayment = (id, data) => api.put(`/payments/${id}`, data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);
export const consumeSession = (id) => api.post(`/payments/${id}/consume`);
