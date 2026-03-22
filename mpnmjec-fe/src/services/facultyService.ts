import axiosInstance from '../axios/axiosInstance';

// ========================
// PERIOD MANAGEMENT
// ========================

export interface PeriodInfo {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  canEdit: boolean;
}

export interface CurrentPeriodResponse {
  currentPeriod: number | null;
  editablePeriods: number[];
  allPeriods: PeriodInfo[];
  serverTime: string;
  currentTimeFormatted: string;
}

export const getCurrentPeriod = async (): Promise<{ data: CurrentPeriodResponse }> => {
  return axiosInstance.get('/api/faculty/current-period');
};

// ========================
// COURSE MANAGEMENT
// ========================

export const getMyCourses = async () => {
  return axiosInstance.get('/api/faculty/my-courses');
};

export const getFacultyCourses = async (facultyId: string) => {
  return axiosInstance.get(`/api/faculty/${facultyId}/courses`);
};

// ========================
// ATTENDANCE MANAGEMENT
// ========================

export interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent';
}

export interface TakeAttendanceData {
  courseId: string;
  date: string;
  period: number;
  students: AttendanceRecord[];
}

export const takeAttendance = async (data: TakeAttendanceData) => {
  return axiosInstance.post('/api/faculty/attendance', data);
};

export const getAttendance = async (params?: { courseId?: string; date?: string; period?: number }) => {
  const searchParams = new URLSearchParams();
  if (params?.courseId) searchParams.append('courseId', params.courseId);
  if (params?.date) searchParams.append('date', params.date);
  if (params?.period) searchParams.append('period', params.period.toString());
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/faculty/attendance${queryString ? `?${queryString}` : ''}`);
};

// ========================
// STUDENTS
// ========================

export interface StudentFilters {
  courseId?: string;
  year?: number;
  section?: string;
}

export const getStudentsByCourse = async (courseId?: string, filters?: StudentFilters) => {
  const searchParams = new URLSearchParams();
  if (courseId) searchParams.append('courseId', courseId);
  if (filters?.year) searchParams.append('year', filters.year.toString());
  if (filters?.section) searchParams.append('section', filters.section);
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/faculty/students${queryString ? `?${queryString}` : ''}`);
};

export const getDepartmentStudents = async (filters?: { year?: number; section?: string }) => {
  const searchParams = new URLSearchParams();
  if (filters?.year) searchParams.append('year', filters.year.toString());
  if (filters?.section) searchParams.append('section', filters.section);
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/faculty/students${queryString ? `?${queryString}` : ''}`);
};

// ========================
// LEAVE MANAGEMENT
// ========================

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  department: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  remarks?: string;
}

export const getLeaveRequests = async (status?: 'pending' | 'approved' | 'rejected') => {
  const params = status ? `?status=${status}` : '';
  return axiosInstance.get(`/api/faculty/leave${params}`);
};

export interface UpdateLeaveData {
  status: 'approved' | 'rejected';
  remarks?: string;
}

export const updateLeave = async (leaveId: string, data: UpdateLeaveData) => {
  return axiosInstance.put(`/api/faculty/leave/${leaveId}`, data);
};

// ========================
// DASHBOARD
// ========================

export const getFacultyDashboardStats = async () => {
  return axiosInstance.get('/api/faculty/dashboard/stats');
};

export const getTodaySchedule = async () => {
  return axiosInstance.get('/api/faculty/timetable/today');
};

// ========================
// MATERIALS
// ========================

export interface MaterialFilters {
  courseId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const getMaterials = async (filters?: MaterialFilters) => {
  const params = new URLSearchParams();
  if (filters?.courseId) params.append('courseId', filters.courseId);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/faculty/materials${queryString}`);
};

export interface MaterialData {
  title: string;
  description?: string;
  courseId?: string;
  subject: string;
  type?: 'notes' | 'pdf' | 'video' | 'assignment' | 'question_paper' | 'syllabus' | 'other';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  externalLink?: string;
  tags?: string[];
}

export const uploadMaterial = async (data: MaterialData | FormData) => {
  const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  return axiosInstance.post('/api/faculty/materials', data, { headers });
};

export const updateMaterial = async (id: string, data: Partial<MaterialData>) => {
  return axiosInstance.put(`/api/faculty/materials/${id}`, data);
};

export const deleteMaterial = async (id: string) => {
  return axiosInstance.delete(`/api/faculty/materials/${id}`);
};

// ========================
// MARKS ENTRY
// ========================

export interface MarksFilters {
  courseId: string;
  year?: number;
  section?: string;
  semester?: number;
}

export const getMarksForCourse = async (filters: MarksFilters) => {
  const params = new URLSearchParams();
  params.append('courseId', filters.courseId);
  if (filters.year) params.append('year', filters.year.toString());
  if (filters.section) params.append('section', filters.section);
  if (filters.semester) params.append('semester', filters.semester.toString());
  
  return axiosInstance.get(`/api/faculty/marks?${params.toString()}`);
};

export interface MarksData {
  courseId: string;
  studentId: string;
  semester: number;
  internal1?: number;
  internal2?: number;
  modelExam?: number;
  finalExam?: number;
  academicYear?: string;
}

export const enterMarks = async (data: MarksData) => {
  return axiosInstance.post('/api/faculty/marks', data);
};

export interface BulkMarksData {
  courseId: string;
  semester: number;
  academicYear?: string;
  marksData: Array<{
    studentId: string;
    internal1?: number;
    internal2?: number;
    modelExam?: number;
    finalExam?: number;
  }>;
}

export const bulkEnterMarks = async (data: BulkMarksData) => {
  return axiosInstance.post('/api/faculty/marks/bulk', data);
};
