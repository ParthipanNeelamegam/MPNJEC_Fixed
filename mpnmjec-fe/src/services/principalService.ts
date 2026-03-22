import axiosInstance from '../axios/axiosInstance';

// ========================
// DASHBOARD
// ========================

export const getDashboardStats = async () => {
  return axiosInstance.get('/api/principal/dashboard/stats');
};

export const getApprovalsSummary = async () => {
  return axiosInstance.get('/api/principal/approvals/summary');
};

// ========================
// DEPARTMENTS
// ========================

export const getDepartments = async () => {
  return axiosInstance.get('/api/principal/departments');
};

// ========================
// APPROVALS
// ========================

export interface ApprovalFilters {
  type?: 'leave' | 'certificate';
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
}

export const getApprovals = async (filters?: ApprovalFilters) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/principal/approvals${queryString}`);
};

export interface UpdateApprovalData {
  type: 'leave' | 'certificate';
  status: 'approved' | 'rejected';
  remarks?: string;
}

export const updateApproval = async (id: string, data: UpdateApprovalData) => {
  return axiosInstance.put(`/api/principal/approvals/${id}`, data);
};

// ========================
// ACHIEVEMENTS
// ========================

export interface AchievementFilters {
  type?: string;
  category?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export const getAchievements = async (filters?: AchievementFilters) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/principal/achievements${queryString}`);
};

export interface AchievementData {
  title: string;
  description?: string;
  type: 'academic' | 'sports' | 'cultural' | 'technical' | 'research' | 'placement' | 'award' | 'other';
  category?: 'student' | 'faculty' | 'department' | 'institution';
  department?: string;
  achievedByName: string;
  achievedByRole?: string;
  date: string;
  venue?: string;
  award?: string;
  prize?: string;
  isHighlighted?: boolean;
}

export const addAchievement = async (data: AchievementData) => {
  return axiosInstance.post('/api/principal/achievements', data);
};

export const updateAchievement = async (id: string, data: Partial<AchievementData>) => {
  return axiosInstance.put(`/api/principal/achievements/${id}`, data);
};

export const deleteAchievement = async (id: string) => {
  return axiosInstance.delete(`/api/principal/achievements/${id}`);
};

// ========================
// REPORTS
// ========================

export interface ReportFilters {
  type?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export const getReports = async (filters?: ReportFilters) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return axiosInstance.get(`/api/principal/reports${queryString}`);
};

export interface GenerateReportData {
  type: 'attendance' | 'faculty' | 'student' | 'department';
  title?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
}

export const generateReport = async (data: GenerateReportData) => {
  return axiosInstance.post('/api/principal/reports', data);
};

export const getReportById = async (id: string) => {
  return axiosInstance.get(`/api/principal/reports/${id}`);
};

// ========================
// RESULT ANALYSIS (Read-Only)
// ========================

// Get college-wide final analysis
export const getFinalAnalysis = async (semester: number) => {
  return axiosInstance.get(`/api/principal/final-analysis?semester=${semester}`);
};

// Get class-wise analysis for a department
export const getClassAnalysis = async (department: string, semester: number, year?: number) => {
  const params = new URLSearchParams();
  params.append('department', department);
  params.append('semester', semester.toString());
  if (year) params.append('year', year.toString());
  
  return axiosInstance.get(`/api/principal/class-analysis?${params.toString()}`);
};

// Get semester performance trends
export const getSemesterTrends = async (department?: string) => {
  const params = department ? `?department=${department}` : '';
  return axiosInstance.get(`/api/principal/semester-trends${params}`);
};

// Get year-wise performance comparison
export const getYearComparison = async (semester: number) => {
  return axiosInstance.get(`/api/principal/year-comparison?semester=${semester}`);
};

// ========================
// ANALYSIS TYPES
// ========================

export interface CollegeSummary {
  totalStudents: number;
  totalPassed: number;
  totalFailed: number;
  overallPassPercentage: number;
  totalDepartments: number;
}

export interface DepartmentAnalysis {
  department: string;
  totalStudents: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
  yearWise: {
    year: number;
    totalStudents: number;
    passCount: number;
    passPercentage: number;
    averageMark: number;
  }[];
}

export interface FinalAnalysisResponse {
  semester: number;
  collegeSummary: CollegeSummary;
  departmentAnalyses: DepartmentAnalysis[];
}