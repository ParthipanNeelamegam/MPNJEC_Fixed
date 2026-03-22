import axiosInstance from '../axios/axiosInstance';

// ========================
// DASHBOARD
// ========================

export const getDepartmentStats = async () => {
  return axiosInstance.get('/api/hod/stats');
};

export const getFacultyWorkload = async () => {
  return axiosInstance.get('/api/hod/faculty-workload');
};

export const getFacultyList = async () => {
  return axiosInstance.get('/api/hod/faculty-list');
};

export const getSubjectsList = async () => {
  return axiosInstance.get('/api/hod/subjects');
};

export const getClassesList = async () => {
  return axiosInstance.get('/api/hod/classes');
};

// ========================
// CLASS & ADVISOR TYPES
// ========================

export interface ClassAdvisorInfo {
  _id: string;
  name: string;
  email: string;
  empId: string;
  designation?: string;
}

export interface ClassInfo {
  _id: string;
  department: string;
  year: number;
  section: string | null;
  displayName: string;
  studentCount: number;
  hasAdvisor: boolean;
  advisor: ClassAdvisorInfo | null;
}

export interface FacultyWithAdvisorStatus {
  id: string;
  userId: string;
  name: string;
  email: string;
  empId: string;
  designation?: string;
  experience?: number;
  status: string;
  isClassAdvisor: boolean;
  advisorFor: {
    department: string;
    year: number;
    section: string | null;
  } | null;
}

export interface TimetableSlot {
  faculty: string;
  subject: string;
  class: string;
}

// Enhanced Timetable Entry interface (multi-year/section)
export interface TimetableEntry {
  id: string;
  department: string;
  year: number;
  section: string;
  dayOfWeek: string;
  period: number;
  faculty: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    code: string;
    name: string;
  } | null;
  subject: string | null;
  classroom: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface TimetableGridSlot {
  id: string;
  faculty: string;
  facultyId: string;
  subject: string;
  subjectCode: string | null;
  courseId: string | null;
  classroom: string | null;
  year: number;
  section: string;
}

export interface TimetableGrid {
  [day: string]: {
    [period: number]: TimetableGridSlot | null;
  };
}

// ========================
// TIMETABLE CRUD (Multi-Year/Section)
// ========================

export interface CreateTimetableData {
  year: number;
  section: string;
  dayOfWeek: string;
  period: number;
  facultyId: string;
  courseId?: string;
  subject?: string;
  classroom?: string;
  conflictOverride?: boolean;
}

export interface TimetableFilters {
  year?: number;
  section?: string;
}

// Get timetable for year/section with grid format
export const getTimetable = async (filters?: TimetableFilters) => {
  const params = new URLSearchParams();
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.section) params.append('section', filters.section);
  
  const queryString = params.toString();
  return axiosInstance.get(`/api/hod/timetable${queryString ? `?${queryString}` : ''}`);
};

// Get single timetable entry by ID (for View Details popup)
export const getTimetableById = async (id: string) => {
  return axiosInstance.get(`/api/hod/timetable/${id}`);
};

// Create new timetable entry with conflict detection
export const saveTimetable = async (data: CreateTimetableData) => {
  return axiosInstance.post('/api/hod/timetable', data);
};

// Update timetable entry
export const updateTimetable = async (id: string, data: Partial<CreateTimetableData>) => {
  return axiosInstance.put(`/api/hod/timetable/${id}`, data);
};

// Delete timetable entry
export const deleteTimetableEntry = async (id: string) => {
  return axiosInstance.delete(`/api/hod/timetable/${id}`);
};

// Legacy saveTimetable for backward compatibility
export const saveTimetableSlot = async (data: { day: string; period: number; slot: TimetableSlot }) => {
  return axiosInstance.post('/api/hod/timetable', data);
};

// ========================
// DEPARTMENT USERS
// ========================

export const getDepartmentFaculty = async () => {
  return axiosInstance.get('/api/hod/faculty');
};

export const getFacultyDetails = async (facultyId: string) => {
  return axiosInstance.get(`/api/hod/faculty/${facultyId}`);
};

export const getFacultySchedule = async (facultyId: string, params?: { year?: number; section?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.append('year', params.year.toString());
  if (params?.section) searchParams.append('section', params.section);
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/hod/faculty/${facultyId}/schedule${queryString ? `?${queryString}` : ''}`);
};

export const getDepartmentStudents = async (params?: { year?: number; section?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.append('year', params.year.toString());
  if (params?.section) searchParams.append('section', params.section);
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/hod/students${queryString ? `?${queryString}` : ''}`);
};

// ========================
// STUDENT DEEP VIEW
// ========================

export interface StudentDeepView {
  student: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: number;
    section: string;
    semester: number;
    fatherName?: string;
    motherName?: string;
    dob?: string;
    mobile?: string;
    parentMobile?: string;
    address?: string;
    admissionYear?: number;
  };
  attendance: {
    overall: {
      totalClasses: number;
      presentCount: number;
      percentage: number;
    };
    bySubject: {
      courseId: string;
      courseName: string;
      courseCode: string;
      totalClasses: number;
      presentCount: number;
      absentCount: number;
      leaveCount: number;
      percentage: number;
    }[];
  };
  marks: {
    bySemester: {
      [semester: string]: {
        semester: number;
        courseId: string;
        courseName: string;
        courseCode: string;
        credits: number;
        internal1: number;
        internal2: number;
        modelExam: number;
        finalExam: number;
        total: number;
        grade: string;
        isPassed: boolean;
        status: string;
      }[];
    };
    semesterGPA: { [semester: string]: number };
    cgpa: number;
    arrearCount: number;
  };
  summary: {
    cgpa: number;
    attendancePercentage: number;
    totalSubjects: number;
    passedSubjects: number;
    arrearCount: number;
  };
}

// Get full student academic profile (deep view)
export const getStudentDeepView = async (studentId: string) => {
  return axiosInstance.get<StudentDeepView>(`/api/hod/student/${studentId}`);
};

// ========================
// ATTENDANCE REVIEW
// ========================

export const getAttendanceForReview = async (params?: { date?: string; courseId?: string; approved?: boolean }) => {
  const searchParams = new URLSearchParams();
  if (params?.date) searchParams.append('date', params.date);
  if (params?.courseId) searchParams.append('courseId', params.courseId);
  if (params?.approved !== undefined) searchParams.append('approved', params.approved.toString());
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/hod/attendance${queryString ? `?${queryString}` : ''}`);
};

export const getAttendanceSummary = async (params?: { startDate?: string; endDate?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  
  const queryString = searchParams.toString();
  return axiosInstance.get(`/api/hod/attendance-summary${queryString ? `?${queryString}` : ''}`);
};

export interface UpdateAttendanceData {
  status?: 'present' | 'absent' | 'leave';
  approve?: boolean;
  remarks?: string;
}

export const updateAttendance = async (id: string, data: UpdateAttendanceData) => {
  return axiosInstance.put(`/api/hod/attendance/${id}`, data);
};

// ========================
// LEAVE REVIEW
// ========================

export const getLeaveRequests = async (status?: 'pending' | 'approved' | 'rejected') => {
  const params = status ? `?status=${status}` : '';
  return axiosInstance.get(`/api/hod/leave${params}`);
};

export interface UpdateLeaveData {
  status: 'approved' | 'rejected';
  remarks?: string;
}

export const updateLeave = async (id: string, data: UpdateLeaveData) => {
  return axiosInstance.put(`/api/hod/leave/${id}`, data);
};

// ========================
// ANALYTICS
// ========================

export const getAttendanceAnalytics = async (months?: number) => {
  const params = months ? `?months=${months}` : '';
  return axiosInstance.get(`/api/hod/analytics/attendance${params}`);
};

export const getPerformanceAnalytics = async () => {
  return axiosInstance.get('/api/hod/analytics/performance');
};

export const getWorkloadAnalytics = async () => {
  return axiosInstance.get('/api/hod/analytics/workload');
};

export const getSubjectAnalytics = async () => {
  return axiosInstance.get('/api/hod/analytics/subjects');
};

// ========================
// REPORTS
// ========================

export interface ReportFilters {
  type?: string;
  page?: number;
  limit?: number;
}

export const getReports = async (filters?: ReportFilters) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/hod/reports${queryString}`);
};

export interface GenerateReportData {
  type: 'attendance' | 'performance' | 'fee' | 'academic';
  category?: string;
  year?: number;
  section?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
}

export const generateReport = async (data: GenerateReportData) => {
  return axiosInstance.post('/api/hod/reports', data);
};

export const getReportById = async (id: string) => {
  return axiosInstance.get(`/api/hod/reports/${id}`);
};

// ========================
// ATTENDANCE TAKING (Uses faculty endpoints which allow HOD role)
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

export const getTodaySchedule = async () => {
  return axiosInstance.get('/api/hod/timetable/today');
};

export const getMyCourses = async () => {
  return axiosInstance.get('/api/faculty/my-courses');
};

export const getStudentsByCourse = async (courseId: string) => {
  return axiosInstance.get(`/api/faculty/students?courseId=${courseId}`);
};

export const getCurrentPeriod = async () => {
  return axiosInstance.get('/api/faculty/current-period');
};

// ========================
// COURSE MANAGEMENT
// ========================

export interface CourseData {
  code: string;
  name: string;
  semester: number;
  year?: number;
  section?: string;
  credits?: number;
}

export const getDepartmentCourses = async () => {
  return axiosInstance.get('/api/hod/courses');
};

export const createCourse = async (data: CourseData) => {
  return axiosInstance.post('/api/hod/courses', data);
};

export const updateCourse = async (id: string, data: Partial<CourseData & { status: string }>) => {
  return axiosInstance.put(`/api/hod/courses/${id}`, data);
};

export const assignCoursesToFaculty = async (facultyId: string, courseIds: string[]) => {
  return axiosInstance.post(`/api/hod/faculty/${facultyId}/assign-courses`, { courseIds });
};

export const removeCourseFromFaculty = async (facultyId: string, courseId: string) => {
  return axiosInstance.delete(`/api/hod/faculty/${facultyId}/courses/${courseId}`);
};

// ========================
// SCHEDULING ENGINE (Conflict-Free)
// ========================

export interface ScheduleEntryData {
  facultyId: string;
  courseId?: string;
  dayOfWeek: string;
  period: number;
  subject?: string;
  className?: string;
  section?: string;
  classroom?: string;
}

export interface ScheduleConflict {
  type: 'faculty' | 'classroom' | 'permission' | 'duplicate';
  message: string;
  details?: {
    department?: string;
    subject?: string;
    className?: string;
    classroom?: string;
  };
}

export interface FacultyAvailability {
  period: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBreak: boolean;
  booking: {
    department: string;
    subject: string;
    className: string;
    classroom: string;
  } | null;
}

// Create schedule entry with conflict detection
export const createScheduleEntry = async (data: ScheduleEntryData) => {
  return axiosInstance.post('/api/hod/schedule', data);
};

// Get department schedule (optional day filter)
export const getDepartmentSchedule = async (day?: string) => {
  const params = day ? `?day=${day}` : '';
  return axiosInstance.get(`/api/hod/schedule${params}`);
};

// Update schedule entry
export const updateScheduleEntry = async (id: string, data: Partial<ScheduleEntryData>) => {
  return axiosInstance.put(`/api/hod/schedule/${id}`, data);
};

// Delete schedule entry
export const deleteScheduleEntry = async (id: string) => {
  return axiosInstance.delete(`/api/hod/schedule/${id}`);
};

// Get faculty availability for a specific day
export const getFacultyDayAvailability = async (facultyId: string, day: string) => {
  return axiosInstance.get(`/api/hod/faculty-availability?facultyId=${facultyId}&day=${day}`);
};

// Get available faculty for a specific slot
export const getAvailableFacultyForSlot = async (day: string, period: number) => {
  return axiosInstance.get(`/api/hod/faculty-availability?day=${day}&period=${period}`);
};

// Get all department faculty with availability summary
export const getDepartmentFacultyAvailability = async () => {
  return axiosInstance.get('/api/hod/faculty-availability');
};

// Add secondary department permission for faculty
export const addFacultySecondaryDepartment = async (facultyId: string, department: string) => {
  return axiosInstance.post(`/api/hod/faculty/${facultyId}/secondary-departments`, { department });
};

// Remove secondary department permission from faculty
export const removeFacultySecondaryDepartment = async (facultyId: string, department: string) => {
  return axiosInstance.delete(`/api/hod/faculty/${facultyId}/secondary-departments/${department}`);
};

// Helper: Check if slot is available before scheduling
export const checkSlotAvailability = async (facultyId: string, day: string, period: number) => {
  const response = await getFacultyDayAvailability(facultyId, day);
  const availability = response.data.availability;
  return availability[period]?.isAvailable ?? false;
};

// ========================
// MARKS ANALYSIS & VERIFICATION
// ========================

export interface AnalysisFilters {
  semester?: number;
  year?: number;
  section?: string;
}

// Get department-wide result analysis
export const getDepartmentAnalysis = async (filters: AnalysisFilters) => {
  const params = new URLSearchParams();
  if (filters.semester) params.append('semester', filters.semester.toString());
  if (filters.year) params.append('year', filters.year.toString());
  if (filters.section) params.append('section', filters.section);
  
  return axiosInstance.get(`/api/hod/analysis?${params.toString()}`);
};

// Full Department Analysis interface
export interface FullDepartmentAnalysis {
  department: string;
  filters: {
    year: string;
    section: string;
    semester: string;
  };
  analysis: {
    totalStudents: number;
    passPercentage: number;
    averageMarks: number;
    averageAttendance: number;
    arrearCount: number;
    topper: {
      studentId: string;
      name: string;
      rollNumber: string;
      year: number;
      section: string;
      avgMarks: number;
      totalSubjects: number;
    } | null;
    topPerformers: {
      studentId: string;
      name: string;
      rollNumber: string;
      year: number;
      section: string;
      avgMarks: number;
      totalSubjects: number;
    }[];
    subjectPerformance: {
      courseId: string;
      courseName: string;
      courseCode: string;
      totalStudents: number;
      passedCount: number;
      passPercentage: number;
      avgMarks: number;
      maxMarks: number;
      minMarks: number;
    }[];
  };
}

// Get full department analysis with pass %, avg marks, topper, arrear count, subject-wise performance
export const getFullDepartmentAnalysis = async (filters?: AnalysisFilters) => {
  const params = new URLSearchParams();
  if (filters?.semester) params.append('semester', filters.semester.toString());
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.section) params.append('section', filters.section);
  
  const queryString = params.toString();
  return axiosInstance.get<FullDepartmentAnalysis>(`/api/hod/analysis/full${queryString ? `?${queryString}` : ''}`);
};

// Get class advisors in department
export const getClassAdvisors = async () => {
  return axiosInstance.get('/api/hod/class-advisors');
};

// Assign class advisor (only one advisor per class, one class per faculty)
export const assignClassAdvisor = async (facultyId: string, year: number, section?: string | null) => {
  return axiosInstance.put('/api/hod/assign-advisor', { facultyId, year, section });
};

// Remove class advisor assignment
export const removeClassAdvisor = async (facultyId: string) => {
  return axiosInstance.delete(`/api/hod/remove-advisor/${facultyId}`);
};

// Helper: Check if faculty can be assigned as advisor (not already advisor of another class)
export const canAssignAsAdvisor = (faculty: FacultyWithAdvisorStatus): boolean => {
  return !faculty.isClassAdvisor;
};

// Helper: Check if class needs an advisor
export const classNeedsAdvisor = (classInfo: ClassInfo): boolean => {
  return !classInfo.hasAdvisor;
};

// Get unverified marks
export const getUnverifiedMarks = async (semester?: number, year?: number) => {
  const params = new URLSearchParams();
  if (semester) params.append('semester', semester.toString());
  if (year) params.append('year', year.toString());
  
  return axiosInstance.get(`/api/hod/unverified-marks?${params.toString()}`);
};

// Verify single marks entry
export const verifyMarks = async (marksId: string) => {
  return axiosInstance.put(`/api/hod/verify-marks/${marksId}`);
};

// Bulk verify marks
export const bulkVerifyMarks = async (marksIds: string[]) => {
  return axiosInstance.put('/api/hod/verify-marks-bulk', { marksIds });
};

// Lock semester marks
export const lockSemesterMarks = async (semester: number, year?: number, section?: string) => {
  return axiosInstance.put('/api/hod/lock-semester', { semester, year, section });
};