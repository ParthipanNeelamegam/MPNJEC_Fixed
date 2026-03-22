import axiosInstance from '../axios/axiosInstance';

export const fetchStudentProfile = async () => {
  return axiosInstance.get('/api/student/profile');
};

export const updateStudentProfile = async (data: any) => {
  return axiosInstance.put('/api/student/profile', data);
};

export const fetchStudentAcademics = async () => {
  return axiosInstance.get('/api/student/academics');
};

export const fetchStudentAttendance = async () => {
  return axiosInstance.get('/api/student/attendance');
};

export const fetchStudentFeesSummary = async () => {
  return axiosInstance.get('/api/student/fees/summary');
};

export const fetchStudentFeesHistory = async () => {
  return axiosInstance.get('/api/student/fees/history');
};

// Leave Management
export interface LeaveApplication {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  remarks?: string;
}

export const applyLeave = async (date: string, reason: string) => {
  return axiosInstance.post('/api/student/leave', { date, reason });
};

export const getMyLeaves = async () => {
  return axiosInstance.get('/api/student/leave');
};


interface PayFeesRequest {
    amount: number;
}

interface PayFeesResponse {
    success: boolean;
    transactionId: string;
    message: string;
}

export const payStudentFees = async (amount: number): Promise<PayFeesResponse> => {
    return axiosInstance.post('/api/student/fees/pay', { amount } as PayFeesRequest);
};

// ========================
// MATERIALS
// ========================

export interface MaterialFilters {
  type?: string;
  subject?: string;
  page?: number;
  limit?: number;
}

export const getStudentMaterials = async (filters?: MaterialFilters) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.subject) params.append('subject', filters.subject);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/student/materials${queryString}`);
};

export const downloadMaterial = async (id: string) => {
  return axiosInstance.post(`/api/student/materials/${id}/download`);
};

// ========================
// CERTIFICATES
// ========================

export const getCertificateTypes = async () => {
  return axiosInstance.get('/api/student/certificates/types');
};

export const getStudentCertificates = async (status?: string) => {
  const params = status ? `?status=${status}` : '';
  return axiosInstance.get(`/api/student/certificates${params}`);
};

export interface CertificateApplication {
  type: string;
  purpose: string;
  copies?: number;
}

export const applyCertificate = async (data: CertificateApplication) => {
  return axiosInstance.post('/api/student/certificates', data);
};

export const payCertificateFee = async (id: string) => {
  return axiosInstance.post(`/api/student/certificates/${id}/pay`);
};

// ========================
// RECEIPTS
// ========================

export const getFeeReceipt = async (id: string) => {
  return axiosInstance.get(`/api/student/receipts/${id}`);
};