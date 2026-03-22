import axiosInstance from '../axios/axiosInstance';

// ========================
// COMPLETION STATUS
// ========================

export interface CourseCompletion {
  courseId: string;
  code: string;
  name: string;
  filled: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

export interface CompletionStatus {
  department: string;
  year?: number;
  section?: string | null;
  semester: number;
  totalStudents: number;
  totalCourses: number;
  filledCount: number;
  totalRequired: number;
  isComplete: boolean;
  completionPercentage: number;
  courseCompletion?: CourseCompletion[];
  classes?: ClassCompletion[];
}

export interface ClassCompletion {
  year: number;
  section: string | null;
  totalStudents: number;
  totalCourses: number;
  filledCount: number;
  totalRequired: number;
  isComplete: boolean;
  completionPercentage: number;
  courseCompletion?: CourseCompletion[];
}

export const getCompletionStatus = async (params: {
  semester: number;
  department?: string;
  year?: number;
  section?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append('semester', params.semester.toString());
  if (params.department) searchParams.append('department', params.department);
  if (params.year) searchParams.append('year', params.year.toString());
  if (params.section) searchParams.append('section', params.section);

  return axiosInstance.get<CompletionStatus>(`/api/result-analysis/completion-status?${searchParams.toString()}`);
};

// ========================
// DETAILED ANALYSIS (Type 1)
// ========================

export interface SubjectMark {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  internal1: number;
  internal2: number;
  modelExam: number;
  finalExam: number;
  total: number;
  grade: string;
  isPassed: boolean;
}

export interface StudentResult {
  studentId: string;
  name: string;
  rollNumber: string;
  section: string;
  subjects: SubjectMark[];
  totalMarks: number;
  percentage: number;
  passedSubjects: number;
  failedSubjects: number;
  isAllClear: boolean;
  rank: number;
}

export interface SubjectStat {
  courseId: string;
  courseCode: string;
  courseName: string;
  totalStudents: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
  avgMark: number;
  maxMark: number;
  minMark: number;
}

export interface GradeDistItem {
  courseCode: string;
  courseName: string;
  distribution: {
    O: number;
    'A+': number;
    A: number;
    B: number;
    C: number;
    F: number;
  };
}

export interface DetailedAnalysis {
  type: 'detailed';
  department: string;
  year: number;
  section: string | null;
  semester: number;
  classSummary: {
    totalStudents: number;
    allClearCount: number;
    failCount: number;
    passPercentage: number;
    classAverage: number;
    totalSubjects: number;
  };
  toppers: {
    rank: number;
    name: string;
    rollNumber: string;
    totalMarks: number;
    percentage: number;
  }[];
  studentResults: StudentResult[];
  subjectStats: SubjectStat[];
  gradeDistribution: GradeDistItem[];
}

export const getDetailedAnalysis = async (params: {
  semester: number;
  year?: number;
  section?: string;
  department?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append('semester', params.semester.toString());
  if (params.year) searchParams.append('year', params.year.toString());
  if (params.section) searchParams.append('section', params.section);
  if (params.department) searchParams.append('department', params.department);

  return axiosInstance.get<DetailedAnalysis>(`/api/result-analysis/detailed?${searchParams.toString()}`);
};

// ========================
// SEMI-DETAILED ANALYSIS (Type 2)
// ========================

export interface SemiDetailedAnalysis {
  type: 'semi-detailed';
  department: string;
  year: number;
  section: string | null;
  semester: number;
  classSummary: {
    totalStudents: number;
    allClearCount: number;
    failCount: number;
    passPercentage: number;
    classAverage: number;
    totalSubjects: number;
  };
  subjectWise: {
    courseCode: string;
    courseName: string;
    credits: number;
    totalStudents: number;
    passCount: number;
    failCount: number;
    passPercentage: number;
    avgMark: number;
    maxMark: number;
    minMark: number;
  }[];
  topPerformers: {
    rank: number;
    name: string;
    rollNumber: string;
    totalMarks: number;
    percentage: number;
    isAllClear: boolean;
  }[];
  gradeDistribution: {
    O: number;
    'A+': number;
    A: number;
    B: number;
    C: number;
    F: number;
  };
  arrearDistribution: {
    0: number;
    1: number;
    2: number;
    '3+': number;
  };
  bestSubject: { name: string; code: string; passPercentage: number } | null;
  worstSubject: { name: string; code: string; passPercentage: number } | null;
}

export const getSemiDetailedAnalysis = async (params: {
  semester: number;
  year?: number;
  section?: string;
  department?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append('semester', params.semester.toString());
  if (params.year) searchParams.append('year', params.year.toString());
  if (params.section) searchParams.append('section', params.section);
  if (params.department) searchParams.append('department', params.department);

  return axiosInstance.get<SemiDetailedAnalysis>(`/api/result-analysis/semi-detailed?${searchParams.toString()}`);
};

// ========================
// OVERVIEW ANALYSIS (Type 3)
// ========================

export interface ClassOverview {
  year: number;
  section: string | null;
  department?: string;
  totalStudents: number;
  passCount: number;
  failCount?: number;
  passPercentage: number;
  averageMark: number;
  toppers?: { studentId: string; name: string; rollNumber: string; totalMarks: number; average: number }[];
}

export interface DepartmentOverview {
  department: string;
  totalStudents: number;
  passCount: number;
  failCount: number;
  passPercentage: number;
  averageMark?: number;
  classes: ClassOverview[];
}

export interface OverviewAnalysis {
  type: 'overview';
  scope: 'class' | 'department' | 'institution';
  department?: string;
  semester: number;
  classes?: ClassOverview[];
  departments?: DepartmentOverview[];
  summary: {
    totalStudents: number;
    totalPassed: number;
    totalFailed: number;
    passPercentage: number;
    averageMark?: number;
    totalDepartments?: number;
  };
}

export const getOverviewAnalysis = async (params: {
  semester: number;
  department?: string;
  year?: number;
  section?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append('semester', params.semester.toString());
  if (params.department) searchParams.append('department', params.department);
  if (params.year) searchParams.append('year', params.year.toString());
  if (params.section) searchParams.append('section', params.section);

  return axiosInstance.get<OverviewAnalysis>(`/api/result-analysis/overview?${searchParams.toString()}`);
};
