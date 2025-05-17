import api from './axios';

export const getSessionAttendance = (sessionId) => api.get(`/attendance/session/${sessionId}`);
export const scanQr = (qr_code, session_id) => api.post('/attendance/scan', { qr_code, session_id });
export const openAttendance = (sessionId) => api.post(`/attendance/open/${sessionId}`);
export const closeAttendance = (sessionId) => api.post(`/attendance/close/${sessionId}`);
export const setAttendanceStatus = (sessionId, studentId, status) =>
  api.patch(`/attendance/session/${sessionId}/student/${studentId}`, { status });
