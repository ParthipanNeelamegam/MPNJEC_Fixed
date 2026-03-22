import axiosInstance from '../axios/axiosInstance';

export const fetchStudentDashboardSummary = async () => {
  return axiosInstance.get('/api/student/dashboard/summary');
};

export const fetchStudentNotifications = async () => {
  return axiosInstance.get('/api/student/notifications');
};

export const fetchStudentPerformance = async () => {
  return axiosInstance.get('/api/student/performance');
};

export const requestBonafideCertificate = async () => {
  return axiosInstance.post('/api/student/certificates/request', {});
};