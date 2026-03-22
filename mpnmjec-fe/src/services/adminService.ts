import axiosInstance from '../axios/axiosInstance';

// ========================
// STUDENT MANAGEMENT
// ========================

export interface StudentData {
  name: string;
  email: string;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  aadhaar?: string;
  mobile?: string;
  parentMobile?: string;
  address?: string;
  rollNumber: string;
  department: string;
  year: number;
  section?: string;
  admissionYear?: number;
}

export interface StudentCreateResponse {
  success: boolean;
  message: string;
  student: {
    id: string;
    userId: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: number;
    section: string;
  };
  credentials: {
    username: string;
    password: string;
  };
}

export interface StudentUpdateData {
  name?: string;
  email?: string;
  rollNumber?: string;
  department?: string;
  year?: number;
  section?: string;
  cgpa?: number;
  attendance?: number;
  status?: 'active' | 'inactive';
}

export const createStudent = async (data: StudentData): Promise<{ data: StudentCreateResponse }> => {
  return axiosInstance.post('/api/admin/students', data);
};

export const getStudents = async () => {
  return axiosInstance.get('/api/admin/students');
};

export const updateStudent = async (id: string, data: StudentUpdateData) => {
  return axiosInstance.put(`/api/admin/students/${id}`, data);
};

export const deleteStudent = async (id: string) => {
  return axiosInstance.delete(`/api/admin/students/${id}`);
};

// ========================
// FACULTY MANAGEMENT
// ========================

export interface FacultyData {
  name: string;
  email?: string;
  username?: string;
  password?: string;
  empId: string;
  department: string;
  designation?: string;
  experience?: number;
}

export interface FacultyUpdateData {
  name?: string;
  email?: string;
  empId?: string;
  department?: string;
  designation?: string;
  experience?: number;
  status?: 'active' | 'inactive';
}

export const createFaculty = async (data: FacultyData) => {
  return axiosInstance.post('/api/admin/faculty', data);
};

export const getFaculty = async () => {
  return axiosInstance.get('/api/admin/faculty');
};

export const updateFaculty = async (id: string, data: FacultyUpdateData) => {
  return axiosInstance.put(`/api/admin/faculty/${id}`, data);
};

export const deleteFaculty = async (id: string) => {
  return axiosInstance.delete(`/api/admin/faculty/${id}`);
};

export const assignCoursesToFaculty = async (id: string, courseIds: string[]) => {
  return axiosInstance.post(`/api/admin/faculty/${id}/assign-courses`, { courseIds });
};

export const removeCourseFromFaculty = async (facultyId: string, courseId: string) => {
  return axiosInstance.delete(`/api/admin/faculty/${facultyId}/courses/${courseId}`);
};

// ========================
// COURSE MANAGEMENT
// ========================

export interface CourseData {
  code: string;
  name: string;
  department: string;
  semester: number;
  year?: number;
  section?: string;
  credits?: number;
}

export interface CourseUpdateData {
  code?: string;
  name?: string;
  department?: string;
  semester?: number;
  year?: number;
  section?: string;
  credits?: number;
  status?: 'active' | 'inactive';
}

export const createCourse = async (data: CourseData) => {
  return axiosInstance.post('/api/admin/courses', data);
};

export const getCourses = async (department?: string) => {
  const params = department ? `?department=${department}` : '';
  return axiosInstance.get(`/api/admin/courses${params}`);
};

export const updateCourse = async (id: string, data: CourseUpdateData) => {
  return axiosInstance.put(`/api/admin/courses/${id}`, data);
};

// ========================
// HOD MANAGEMENT
// ========================

export interface HODData {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  department: string;
  facultyId?: string;
  status?: 'active' | 'inactive';
}

export const createHOD = async (data: HODData) => {
  return axiosInstance.post('/api/admin/hod', data);
};

export const getHODs = async (includeInactive: boolean = true) => {
  const params = includeInactive ? '?includeInactive=true' : '';
  return axiosInstance.get(`/api/admin/hod${params}`);
};

export const updateHOD = async (id: string, data: Partial<HODData>) => {
  return axiosInstance.put(`/api/admin/hod/${id}`, data);
};

export const deleteHOD = async (id: string) => {
  return axiosInstance.delete(`/api/admin/hod/${id}`);
};

// ========================
// PRINCIPAL MANAGEMENT
// ========================

export interface PrincipalData {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  userId?: string;
  status?: 'active' | 'inactive';
}

export const createPrincipal = async (data: PrincipalData) => {
  return axiosInstance.post('/api/admin/principal', data);
};

export const getPrincipal = async () => {
  return axiosInstance.get('/api/admin/principal');
};

export const updatePrincipal = async (id: string, data: Partial<PrincipalData>) => {
  return axiosInstance.put(`/api/admin/principal/${id}`, data);
};

export const deletePrincipal = async (id: string) => {
  return axiosInstance.delete(`/api/admin/principal/${id}`);
};

// ========================
// USER MANAGEMENT
// ========================

export interface UserFilters {
  role?: 'student' | 'faculty' | 'hod' | 'principal' | 'admin';
  department?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export const getAllUsers = async (filters?: UserFilters) => {
  const params = new URLSearchParams();
  if (filters?.role) params.append('role', filters.role);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/admin/users${queryString}`);
};

export const getUserById = async (id: string) => {
  return axiosInstance.get(`/api/admin/users/${id}`);
};

// ========================
// DASHBOARD
// ========================

export const getDashboardStats = async () => {
  return axiosInstance.get('/api/admin/dashboard/stats');
};

export const getDashboardChartData = async () => {
  return axiosInstance.get('/api/admin/dashboard/chart-data');
};

// ========================
// FEE MANAGEMENT
// ========================

export interface FeeFilters {
  department?: string;
  status?: 'pending' | 'partial' | 'paid' | 'overdue';
  academicYear?: string;
  page?: number;
  limit?: number;
}

export const getFeeRecords = async (filters?: FeeFilters) => {
  const params = new URLSearchParams();
  if (filters?.department) params.append('department', filters.department);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.academicYear) params.append('academicYear', filters.academicYear);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/admin/fees${queryString}`);
};

export const getFeeSummary = async () => {
  return axiosInstance.get('/api/admin/fees/summary');
};

export interface FeeData {
  studentId: string;
  academicYear: string;
  semester: number;
  feeStructure?: { name: string; amount: number }[];
  totalAmount: number;
  dueDate: string;
}

export const createFeeRecord = async (data: FeeData) => {
  return axiosInstance.post('/api/admin/fees', data);
};

export const updateFeeRecord = async (id: string, data: Partial<FeeData>) => {
  return axiosInstance.put(`/api/admin/fees/${id}`, data);
};

export interface PaymentData {
  amount: number;
  method?: 'online' | 'cash' | 'cheque' | 'dd';
  transactionId?: string;
  remarks?: string;
}

export const recordPayment = async (feeId: string, data: PaymentData) => {
  return axiosInstance.post(`/api/admin/fees/${feeId}/payment`, data);
};

// ========================
// CERTIFICATE MANAGEMENT
// ========================

export interface CertificateFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'processing' | 'ready' | 'collected';
  type?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export const getCertificateRequests = async (filters?: CertificateFilters) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/admin/certificates${queryString}`);
};

export const updateCertificateStatus = async (id: string, data: { status: string; remarks?: string }) => {
  return axiosInstance.put(`/api/admin/certificates/${id}`, data);
};

export const getCertificateStats = async () => {
  return axiosInstance.get('/api/admin/certificates/stats');
};

// ========================
// LIBRARIAN MANAGEMENT
// ========================

export interface LibrarianData {
  name: string;
  email?: string;
  username?: string;
  password?: string;
  empId: string;
}

export interface LibrarianUpdateData {
  name?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

export const createLibrarian = async (data: LibrarianData) => {
  return axiosInstance.post('/api/admin/librarian', data);
};

export const getLibrarians = async () => {
  return axiosInstance.get('/api/admin/librarian');
};

export const updateLibrarian = async (id: string, data: LibrarianUpdateData) => {
  return axiosInstance.put(`/api/admin/librarian/${id}`, data);
};

export const deleteLibrarian = async (id: string) => {
  return axiosInstance.delete(`/api/admin/librarian/${id}`);
};