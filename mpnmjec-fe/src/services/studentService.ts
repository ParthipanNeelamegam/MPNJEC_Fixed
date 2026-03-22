import axiosInstance from '../axios/axiosInstance';

// ========================
// LEAVE MANAGEMENT
// ========================

export interface LeaveData {
  date: string;
  reason: string;
}

export const applyLeave = async (data: LeaveData) => {
  return axiosInstance.post('/api/student/leave', data);
};

export const getLeaves = async () => {
  return axiosInstance.get('/api/student/leave');
};

// ========================
// PROFILE
// ========================

export const getProfile = async () => {
  return axiosInstance.get('/api/student/profile');
};

export const updateProfile = async (data: { address?: string; email?: string; mobile?: string }) => {
  return axiosInstance.put('/api/student/profile', data);
};

// ========================
// ACADEMICS
// ========================

export const getAcademics = async () => {
  return axiosInstance.get('/api/student/academics');
};

// ========================
// ATTENDANCE
// ========================

export const getAttendance = async () => {
  return axiosInstance.get('/api/student/attendance');
};

// ========================
// FEES
// ========================

export const getFeesSummary = async () => {
  return axiosInstance.get('/api/student/fees/summary');
};

export const getFeesHistory = async () => {
  return axiosInstance.get('/api/student/fees/history');
};

export const payFees = async (amount: number) => {
  return axiosInstance.post('/api/student/fees/pay', { amount });
};

export const getStudentFeeStructure = async () => {
  return axiosInstance.get('/api/student/fees/structure');
};

export const getPaymentHistory = async () => {
  return axiosInstance.get('/api/student/fees/history');
};

export const getReceiptDetails = async (receiptId: string) => {
  return axiosInstance.get(`/api/student/fees/receipt/${receiptId}`);
};