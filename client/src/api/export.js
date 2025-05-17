import api from './axios';

async function downloadPdf(path, filename, params = {}) {
  const res = await api.get(path, { responseType: 'blob', params });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const exportStudentsPdf  = (filters = {})  => downloadPdf('/export/students', 'students.pdf', filters);
export const exportPaymentsPdf  = (params = {})   => downloadPdf('/export/payments', `payments-${params.month || 'all'}.pdf`, params);
export const exportReceiptPdf   = (paymentId)     => downloadPdf(`/export/receipt/payment/${paymentId}`, `receipt-${paymentId}.pdf`);
export const exportPayrollPdf   = (teacherId, month) => downloadPdf(`/export/receipt/teacher/${teacherId}`, `payroll-${teacherId}-${month}.pdf`, { month });
