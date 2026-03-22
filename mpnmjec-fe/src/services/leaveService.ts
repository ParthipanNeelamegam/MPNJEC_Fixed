import axiosInstance from '../axios/axiosInstance';

// ========================
// TYPES
// ========================

export interface ApprovalInfo {
  status: 'Pending' | 'Approved' | 'Rejected' | 'N/A';
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  approverName?: string;
}

export interface LeaveRequest {
  id: string;
  applicantRole: 'student' | 'faculty' | 'hod';
  name?: string;
  email?: string;
  rollNumber?: string;
  empId?: string;
  department?: string;
  year?: number;
  section?: string;
  designation?: string;
  leaveType: 'sick' | 'casual' | 'emergency' | 'personal' | 'academic' | 'other';
  fromDate: string;
  toDate: string;
  reason: string;
  finalStatus: 'Pending' | 'Approved' | 'Rejected';
  facultyApproval?: ApprovalInfo;
  hodApproval?: ApprovalInfo;
  principalApproval?: ApprovalInfo;
  appliedAt: string;
  updatedAt?: string;
}

export interface ApplyLeaveData {
  leaveType?: 'sick' | 'casual' | 'emergency' | 'personal' | 'academic' | 'other';
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface LeaveFilters {
  status?: string;
  applicantRole?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export interface ApproveRejectData {
  remarks?: string;
}

export interface LeaveStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

// ========================
// API CALLS
// ========================

// Apply for leave (student, faculty, hod)
export const applyForLeave = async (data: ApplyLeaveData) => {
  return axiosInstance.post('/api/leave/apply', data);
};

// Get my leave requests (any authenticated user)
export const getMyLeaveRequests = async (filters?: { status?: string; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/leave/my-requests${queryString}`);
};

// Get pending leave requests (role-based filtering)
export const getPendingLeaveRequests = async (filters?: { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/leave/pending${queryString}`);
};

// Approve leave
export const approveLeaveRequest = async (id: string, data?: ApproveRejectData) => {
  return axiosInstance.put(`/api/leave/approve/${id}`, data || {});
};

// Reject leave
export const rejectLeaveRequest = async (id: string, data?: ApproveRejectData) => {
  return axiosInstance.put(`/api/leave/reject/${id}`, data || {});
};

// Get leave details
export const getLeaveDetails = async (id: string) => {
  return axiosInstance.get(`/api/leave/details/${id}`);
};

// Get all leaves (admin/principal only)
export const getAllLeaveRequests = async (filters?: LeaveFilters) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.applicantRole) params.append('applicantRole', filters.applicantRole);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/leave/all${queryString}`);
};

// Get leave stats
export const getLeaveStats = async (): Promise<{ data: { stats: LeaveStats } }> => {
  return axiosInstance.get('/api/leave/stats');
};

// ========================
// HELPER FUNCTIONS
// ========================

export const getLeaveTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    sick: 'Sick Leave',
    casual: 'Casual Leave',
    emergency: 'Emergency Leave',
    personal: 'Personal Leave',
    academic: 'Academic Leave',
    other: 'Other',
  };
  return labels[type] || type;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'N/A': 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    student: 'Student',
    faculty: 'Faculty',
    hod: 'HOD',
  };
  return labels[role] || role;
};

export const formatDateRange = (fromDate: string, toDate: string): string => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  };
  
  if (from.getTime() === to.getTime()) {
    return from.toLocaleDateString('en-IN', options);
  }
  
  return `${from.toLocaleDateString('en-IN', options)} - ${to.toLocaleDateString('en-IN', options)}`;
};

export const calculateLeaveDuration = (fromDate: string, toDate: string): number => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};