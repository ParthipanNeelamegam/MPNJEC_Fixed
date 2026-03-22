import axiosInstance from '../axios/axiosInstance';

// ========================
// ADVISOR PROFILE
// ========================

export const getAdvisorProfile = async () => {
  return axiosInstance.get('/api/advisor/profile');
};

// ========================
// STUDENTS
// ========================

export interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export const getAdvisorStudents = async (filters?: StudentFilters) => {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.search) params.append('search', filters.search);
  
  return axiosInstance.get(`/api/advisor/students?${params.toString()}`);
};

export const getStudentDetails = async (studentId: string) => {
  return axiosInstance.get(`/api/advisor/student/${studentId}`);
};

// ========================
// COURSES
// ========================

export const getAdvisorCourses = async (semester?: number) => {
  const params = semester ? `?semester=${semester}` : '';
  return axiosInstance.get(`/api/advisor/courses${params}`);
};

// ========================
// MARKS MANAGEMENT
// ========================

export interface MarksData {
  studentId: string;
  courseId: string;
  semester: number;
  internal1?: number;
  internal2?: number;
  modelExam?: number;
  finalExam?: number;
  reason?: string;
}

export interface BulkMarksEntry {
  studentId: string;
  internal1?: number;
  internal2?: number;
  modelExam?: number;
  finalExam?: number;
}

export interface BulkMarksData {
  courseId: string;
  semester: number;
  marksData: BulkMarksEntry[];
}

export const getMarks = async (courseId: string, semester: number) => {
  return axiosInstance.get(`/api/advisor/marks?courseId=${courseId}&semester=${semester}`);
};

export const addOrUpdateMarks = async (data: MarksData) => {
  return axiosInstance.post('/api/advisor/marks', data);
};

export const bulkAddMarks = async (data: BulkMarksData) => {
  return axiosInstance.post('/api/advisor/marks/bulk', data);
};

// ========================
// RESULT ANALYSIS
// ========================

export const getResultAnalysis = async (semester: number) => {
  return axiosInstance.get(`/api/advisor/result-analysis?semester=${semester}`);
};

export const getSemesterComparison = async () => {
  return axiosInstance.get('/api/advisor/semester-comparison');
};

// ========================
// HELPER TYPES
// ========================

export interface StudentResult {
  _id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  section: string;
  semester: number;
}

export interface MarksEntry {
  _id: string;
  course: {
    _id: string;
    code: string;
    name: string;
  };
  internal1: number;
  internal2: number;
  modelExam: number;
  finalExam: number;
  total: number;
  grade: string;
  isPassed: boolean;
  status: string;
  isLocked: boolean;
}

export interface ClassAnalysis {
  department: string;
  year: number;
  section: string;
  semester: number;
  totalStudents: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
  averageMark: number;
  toppers: {
    studentId: string;
    name: string;
    rollNumber: string;
    totalMarks: number;
    average: number;
  }[];
  subjectWise: {
    courseId: string;
    courseName: string;
    courseCode: string;
    totalStudents: number;
    passCount: number;
    passPercentage: number;
    avgMark: number;
    maxMark: number;
    minMark: number;
  }[];
}
