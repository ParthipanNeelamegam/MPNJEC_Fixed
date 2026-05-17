import { useState, useEffect } from 'react';
import { 
  Home, Users, BookOpen, Calendar, FileText, ClipboardList, GraduationCap,
  Loader2, BarChart3, CheckCircle, XCircle, AlertCircle, TrendingUp, 
  Award, Search, CalendarDays
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getAccessToken } from '../../utils/token';
import {
  getCompletionStatus,
  getDetailedAnalysis,
  getSemiDetailedAnalysis,
  getOverviewAnalysis,
  type CompletionStatus,
  type DetailedAnalysis,
  type SemiDetailedAnalysis,
  type OverviewAnalysis,
  type StudentResult,
} from '../../services/resultAnalysisService';

// Decode token
const decodeToken = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

interface UserInfo {
  id: string;
  name: string;
  role: string;
  department?: string;
  isClassAdvisor?: boolean;
  advisorFor?: { year: number; section?: string; department?: string };
}

const baseNavItems = [
  { icon: Home, label: 'Dashboard', path: '/faculty/dashboard' },
  { icon: Users, label: 'Students', path: '/faculty/students' },
  { icon: BookOpen, label: 'Courses', path: '/faculty/courses' },
  { icon: Calendar, label: 'Attendance', path: '/faculty/attendance' },
  { icon: FileText, label: 'Materials', path: '/faculty/materials' },
  { icon: ClipboardList, label: 'Marks Entry', path: '/faculty/marks' },
  { icon: CalendarDays, label: 'Leave', path: '/faculty/leave' },
];

const advisorNavItems = [
  { icon: GraduationCap, label: 'My Class', path: '/faculty/advisor/class' },
  { icon: BarChart3, label: 'Result Analysis', path: '/faculty/result-analysis' },
];

const getNavItems = (isClassAdvisor: boolean) => {
  if (isClassAdvisor) {
    return [...baseNavItems, ...advisorNavItems];
  }
  return baseNavItems;
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'O': return 'bg-emerald-100 text-emerald-700';
    case 'A+': return 'bg-green-100 text-green-700';
    case 'A': return 'bg-blue-100 text-blue-700';
    case 'B': return 'bg-yellow-100 text-yellow-700';
    case 'C': return 'bg-orange-100 text-orange-700';
    case 'F': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export default function FacultyResultAnalysis() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [activeTab, setActiveTab] = useState('completion');

  const [completion, setCompletion] = useState<CompletionStatus | null>(null);
  const [detailed, setDetailed] = useState<DetailedAnalysis | null>(null);
  const [semiDetailed, setSemiDetailed] = useState<SemiDetailedAnalysis | null>(null);
  const [overview, setOverview] = useState<OverviewAnalysis | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState('');
const [selectedExamType, setSelectedExamType] = useState('');
const [selectedYear, setSelectedYear] = useState('');
const [loadedResults, setFilteredResults] = useState<any[]>([]);

const [loadedStudents, setLoadedStudents] = useState<StudentResult[]>([]);

const [studentStats, setStudentStats] = useState({
  present: 0,
  absent: 0,
  pass: 0,
  fail: 0
});

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUserInfo({
          id: decoded.id,
          name: decoded.name || 'Faculty',
          role: decoded.role,
          department: decoded.department,
          isClassAdvisor: decoded.isClassAdvisor || false,
          advisorFor: decoded.advisorFor || null,
        });

        // Auto-set semester based on advisor year
        if (decoded.advisorFor?.year) {
          const semStart = (decoded.advisorFor.year - 1) * 2 + 1;
          setSelectedSemester(semStart.toString());
        }
      }
    }
    setLoading(false);
  }, []);

  const checkCompletion = async () => {
    if (!selectedSemester) {
      toast.error('Please select a semester');
      return;
    }

    try {
      setAnalysisLoading(true);
      setActiveTab('completion');
      setDetailed(null);
      setSemiDetailed(null);
      setOverview(null);

      const res = await getCompletionStatus({ semester: parseInt(selectedSemester) });
      setCompletion(res.data);

      if (res.data.isComplete) {
        toast.success('All marks are complete! You can now view result analysis.');
      } else {
        toast.info(`Marks completion: ${res.data.completionPercentage}%`);
      }
    } catch (error: any) {
      console.error('Failed to check completion:', error);
      toast.error(error.response?.data?.error || 'Failed to check completion status');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const loadAnalysis = async (type: 'detailed' | 'semi-detailed' | 'overview') => {
    if (!selectedSemester) return;

    try {
      setAnalysisLoading(true);

      const params = { semester: parseInt(selectedSemester) };

      if (type === 'detailed') {
        const res = await getDetailedAnalysis(params);
        setDetailed(res.data);
        setActiveTab('detailed');
      } else if (type === 'semi-detailed') {
        const res = await getSemiDetailedAnalysis(params);
        setSemiDetailed(res.data);
        setActiveTab('semi-detailed');
      } else {
        const res = await getOverviewAnalysis(params);
        setOverview(res.data);
        setActiveTab('overview');
      }
    } catch (error: any) {
      console.error(`Failed to load ${type} analysis:`, error);
      const errMsg = error.response?.data?.error || `Failed to load ${type} analysis`;
      toast.error(errMsg);
    } finally {
      setAnalysisLoading(false);
    }
  };
   const loadStudents = async () => {
  try {
    setAnalysisLoading(true);

   const res = await getDetailedAnalysis({
  semester: Number(selectedSemester),
  year: Number(selectedYear),
});
    const students = res.data.studentResults || [];

const filtered = students.flatMap((student: any) => {

  const matchedSubjects = student.subjects?.filter((sub: any) => {

    const semesterMatch =
      String(sub.semester) === selectedSemester;

    const examMatch =
      sub.examType === selectedExamType;

    return semesterMatch && examMatch;

  }) || [];

  return matchedSubjects.map((sub: any) => ({

    studentId: student.studentId,

    studentName: student.name,

    rollNumber: student.rollNumber,

    year: student.year,

    subjectName: sub.courseName,

    subjectCode: sub.courseCode,

    examType: sub.examType,

    semester: sub.semester,

    totalMarks: sub.total || 0,

    percentage: sub.percentage || 0,

    isPassed: sub.isPassed

  }));

});

const rankedFilteredResults = filtered.sort(
  (a: any, b: any) =>
    Number(b.percentage) - Number(a.percentage)
);

setFilteredResults(rankedFilteredResults);

// Ranking System
students.sort((a: any, b: any) => {

  const perA =
    parseFloat(String(a.percentage).replace('%', '')) || 0;

  const perB =
    parseFloat(String(b.percentage).replace('%', '')) || 0;

  return perB - perA;
});

const rankedStudents = students.map(
  (student: any, index: number) => ({
    ...student,

    rank:
      index + 1 === 1
        ? '1st'
        : index + 1 === 2
        ? '2nd'
        : index + 1 === 3
        ? '3rd'
        : `${index + 1}th`
  })
);

setLoadedStudents(rankedStudents);
    // Statistics
    const presentCount = rankedStudents.filter(
      (s: any) => Number(s.totalMarks) > 0
    ).length;

    const absentCount = rankedStudents.filter(
      (s: any) => Number(s.totalMarks) === 0
    ).length;

    const passCount = rankedStudents.filter(
      (s: any) => s.isAllClear
    ).length;

    const failCount = rankedStudents.filter(
      (s: any) => !s.isAllClear
    ).length;

    setStudentStats({
      present: presentCount,
      absent: absentCount,
      pass: passCount,
      fail: failCount
    });

    toast.success('Students loaded successfully');

  } catch (error) {

    console.error(error);
    toast.error('Failed to load students');

  } finally {

    setAnalysisLoading(false);

  }
};
  const advisorFor = userInfo?.advisorFor;
  const semStart = advisorFor?.year ? (advisorFor.year - 1) * 2 + 1 : 1;
  const semEnd = advisorFor?.year ? semStart + 1 : 8;
  const availableSemesters = [];
  for (let i = semStart; i <= semEnd; i++) availableSemesters.push(i);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={getNavItems(true)} title="Faculty Portal" subtitle="" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={getNavItems(true)} />
      </div>
    );
  }

  if (!userInfo?.isClassAdvisor) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={getNavItems(false)} title="Faculty Portal" subtitle="" />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 text-center max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Class Advisor Access Required</h2>
            <p className="text-gray-600">Result analysis is only available for class advisors. Contact your HOD for class advisor assignment.</p>
          </Card>
        </div>
        <MobileNav items={getNavItems(false)} />
      </div>
    );
  }

  const filteredStudents = detailed?.studentResults?.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar
        items={getNavItems(true)}
        title="Faculty Portal"
        subtitle={userInfo?.department ? `${userInfo.department.toUpperCase()} Department` : ''}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Result Analysis</h1>
              <p className="text-gray-600">
                {advisorFor?.department?.toUpperCase()} • Year {advisorFor?.year}
                {advisorFor?.section ? ` • Section ${advisorFor.section}` : ''}
              </p>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700">
              <GraduationCap className="w-4 h-4 mr-1" />
              Class Advisor
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Semester Selection & Check */}
          {/* Filters & Load Students */}
<Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

   {/* Course */}
<div>
  <Label className="text-sm font-medium text-gray-700">
    Course Name
  </Label>

  <Select
    value={selectedCourse}
    onValueChange={setSelectedCourse}
  >
    <SelectTrigger className="mt-1.5">
      <SelectValue placeholder="Select Course" />
    </SelectTrigger>

    <SelectContent>

      <SelectItem value="Data Structures">
        Data Structures
      </SelectItem>

      <SelectItem value="Database Management System">
        Database Management System
      </SelectItem>

      <SelectItem value="Operating Systems">
        Operating Systems
      </SelectItem>

      <SelectItem value="Computer Networks">
        Computer Networks
      </SelectItem>

      <SelectItem value="Java Programming">
        Java Programming
      </SelectItem>

      <SelectItem value="Python Programming">
        Python Programming
      </SelectItem>

      <SelectItem value="Software Engineering">
        Software Engineering
      </SelectItem>

    </SelectContent>
  </Select>
</div>

    {/* Semester */}
    <div>
      <Label className="text-sm font-medium text-gray-700">
        Semester
      </Label>

      <Select
        value={selectedSemester}
        onValueChange={setSelectedSemester}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder="Select Semester" />
        </SelectTrigger>

       <SelectContent>
  <SelectItem value="1">
    Semester 1
  </SelectItem>

  <SelectItem value="2">
    Semester 2
  </SelectItem>

  <SelectItem value="3">
    Semester 3
  </SelectItem>

  <SelectItem value="4">
    Semester 4
  </SelectItem>

  <SelectItem value="5">
    Semester 5
  </SelectItem>

  <SelectItem value="6">
    Semester 6
  </SelectItem>

  <SelectItem value="7">
    Semester 7
  </SelectItem>

  <SelectItem value="8">
    Semester 8
  </SelectItem>
</SelectContent>
      </Select>
    </div>

    {/* Exam Type */}
    <div>
      <Label className="text-sm font-medium text-gray-700">
        Exam Type
      </Label>

      <Select
        value={selectedExamType}
        onValueChange={setSelectedExamType}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder="Select Exam Type" />
        </SelectTrigger>

        <SelectContent>

  <SelectItem value="Internal 1">
    Internal 1
  </SelectItem>

  <SelectItem value="Internal 2">
    Internal 2
  </SelectItem>

  <SelectItem value="Model Lab Examination">
    Model Lab Examination
  </SelectItem>

  <SelectItem value="Semester Lab Examination">
    Semester Lab Examination
  </SelectItem>

</SelectContent>
      </Select>
    </div>

    {/* Year */}
    <div>
      <Label className="text-sm font-medium text-gray-700">
        Year
      </Label>

      <Select
        value={selectedYear}
        onValueChange={setSelectedYear}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder="Select Year" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="1">1st Year</SelectItem>
          <SelectItem value="2">2nd Year</SelectItem>
          <SelectItem value="3">3rd Year</SelectItem>
          <SelectItem value="4">4th Year</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Check Button */}
<div className="flex items-end">
  <Button
    onClick={loadStudents}
    disabled={
      !selectedCourse ||
      !selectedSemester ||
      !selectedExamType ||
      !selectedYear
    }
    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
  >
    Load Students
  </Button>
</div>
</div>
<Button onClick={checkCompletion}>
  Check Completion
</Button>
</Card>

          {/* Completion Status */}
          {completion && (
            <>
              <Card className={`p-5 mb-6 border-0 shadow-lg ${
                completion.isComplete
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                  : 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {completion.isComplete ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    )}
                    <h3 className="font-bold text-gray-900">
                      {completion.isComplete ? 'Marks Complete - Analysis Ready!' : 'Marks Entry In Progress'}
                    </h3>
                  </div>
                  <Badge className={completion.isComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                    {completion.completionPercentage}% Complete
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      completion.isComplete ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${completion.completionPercentage}%` }}
                  />
                </div>
                

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-2 bg-white/60 rounded-lg">
                    <p className="font-bold text-gray-900">{completion.totalStudents}</p>
                    <p className="text-gray-600">Students</p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded-lg">
                    <p className="font-bold text-gray-900">{completion.totalCourses}</p>
                    <p className="text-gray-600">Subjects</p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded-lg">
                    <p className="font-bold text-gray-900">{completion.filledCount}</p>
                    <p className="text-gray-600">Filled</p>
                  </div>
                  <div className="text-center p-2 bg-white/60 rounded-lg">
                    <p className="font-bold text-gray-900">{completion.totalRequired}</p>
                    <p className="text-gray-600">Required</p>
                  </div>
                </div>

                {/* Course-wise completion */}
                {completion.courseCompletion && completion.courseCompletion.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Subject-wise Completion</h4>
                    {completion.courseCompletion.map(c => (
                      <div key={c.courseId || c.code} className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                        <span className="text-sm font-medium">{c.code} - {c.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${c.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-16 text-right">{c.filled}/{c.total}</span>
                          {c.isComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Analysis Tabs - only when complete */}
              {completion.isComplete && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger
                      value="detailed"
                      onClick={() => !detailed && loadAnalysis('detailed')}
                      className="text-sm"
                    >
                      Detailed
                    </TabsTrigger>
                    <TabsTrigger
                      value="semi-detailed"
                      onClick={() => !semiDetailed && loadAnalysis('semi-detailed')}
                      className="text-sm"
                    >
                      Semi-Detailed
                    </TabsTrigger>
                    <TabsTrigger
                      value="overview"
                      onClick={() => !overview && loadAnalysis('overview')}
                      className="text-sm"
                    >
                      Overview
                    </TabsTrigger>
                  </TabsList>

                  {analysisLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      {/* DETAILED TAB */}
                      <TabsContent value="detailed">
                        {detailed ? (
                          <div className="space-y-6">
                            {/* Class Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                              <Card className="p-3 text-center bg-blue-50 border-blue-200">
                                <p className="text-2xl font-bold text-blue-700">{detailed.classSummary.totalStudents}</p>
                                <p className="text-xs text-blue-600">Total Students</p>
                              </Card>
                              <Card className="p-3 text-center bg-green-50 border-green-200">
                                <p className="text-2xl font-bold text-green-700">{detailed.classSummary.allClearCount}</p>
                                <p className="text-xs text-green-600">All Clear</p>
                              </Card>
                              <Card className="p-3 text-center bg-red-50 border-red-200">
                                <p className="text-2xl font-bold text-red-700">{detailed.classSummary.failCount}</p>
                                <p className="text-xs text-red-600">With Arrears</p>
                              </Card>
                              <Card className="p-3 text-center bg-emerald-50 border-emerald-200">
                                <p className="text-2xl font-bold text-emerald-700">{detailed.classSummary.passPercentage}%</p>
                                <p className="text-xs text-emerald-600">Pass %</p>
                              </Card>
                              <Card className="p-3 text-center bg-indigo-50 border-indigo-200">
                                <p className="text-2xl font-bold text-indigo-700">{detailed.classSummary.classAverage}%</p>
                                <p className="text-xs text-indigo-600">Class Average</p>
                              </Card>
                              <Card className="p-3 text-center bg-purple-50 border-purple-200">
                                <p className="text-2xl font-bold text-purple-700">{detailed.classSummary.totalSubjects}</p>
                                <p className="text-xs text-purple-600">Subjects</p>
                              </Card>
                            </div>

                            {/* Toppers */}
                            {detailed.toppers.length > 0 && (
                              <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-lg">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                                  <Award className="w-5 h-5 text-amber-600" />
                                  Class Toppers
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                  {detailed.toppers.map(t => (
                                    <div key={t.rank} className="flex items-center gap-3 bg-white/70 rounded-lg p-3">
                                      <span className={`text-lg font-bold ${
                                        t.rank === 1 ? 'text-amber-600' : t.rank === 2 ? 'text-gray-500' : 'text-orange-600'
                                      }`}>#{t.rank}</span>
                                      <div>
                                        <p className="font-semibold text-sm">{t.name}</p>
                                        <p className="text-xs text-gray-500">{t.rollNumber} • {t.percentage}%</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )}

                            {/* Subject-wise Stats */}
                            <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                              <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
                                <h3 className="font-bold text-white">Subject-wise Statistics</h3>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Subject</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Students</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Fail</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass %</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Avg</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Max</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Min</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailed.subjectStats.map((sub, idx) => (
                                      <tr key={sub.courseId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3">
                                          <p className="font-medium text-sm">{sub.courseName}</p>
                                          <p className="text-xs text-gray-500">{sub.courseCode}</p>
                                        </td>
                                        <td className="p-3 text-center text-sm">{sub.totalStudents}</td>
                                        <td className="p-3 text-center text-sm text-green-600 font-medium">{sub.passCount}</td>
                                        <td className="p-3 text-center text-sm text-red-600 font-medium">{sub.failCount}</td>
                                        <td className="p-3 text-center">
                                          <Badge className={sub.passPercentage >= 70 ? 'bg-green-100 text-green-700' : sub.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                            {sub.passPercentage}%
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center text-sm font-medium">{sub.avgMark}</td>
                                        <td className="p-3 text-center text-sm text-green-600">{sub.maxMark}</td>
                                        <td className="p-3 text-center text-sm text-red-600">{sub.minMark}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>

                            {/* Grade Distribution */}
                            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                              <h3 className="font-bold text-gray-900 mb-3">Grade Distribution by Subject</h3>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Subject</th>
                                      {['O', 'A+', 'A', 'B', 'C', 'F'].map(g => (
                                        <th key={g} className="text-center p-3 text-sm font-semibold text-gray-700">{g}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detailed.gradeDistribution.map((gd, idx) => (
                                      <tr key={gd.courseCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3 text-sm font-medium">{gd.courseCode}</td>
                                        {(['O', 'A+', 'A', 'B', 'C', 'F'] as const).map(g => (
                                          <td key={g} className="p-3 text-center">
                                            <Badge className={getGradeColor(g)}>
                                              {gd.distribution[g]}
                                            </Badge>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>

                            {/* Student Results */}
                            <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                              <div className="p-4 border-b">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-bold text-gray-900">Student-wise Results (Rank List)</h3>
                                  <Badge className="bg-blue-100 text-blue-700">{filteredStudents.length} Students</Badge>
                                </div>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input
                                    placeholder="Search by name or roll number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                  />
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                                    <tr>
                                      <th className="text-left text-white font-semibold p-3 text-sm">Rank</th>
                                      <th className="text-left text-white font-semibold p-3 text-sm">Roll No</th>
                                      <th className="text-left text-white font-semibold p-3 text-sm">Name</th>
                                      <th className="text-center text-white font-semibold p-3 text-sm">Total</th>
                                      <th className="text-center text-white font-semibold p-3 text-sm">%</th>
                                      <th className="text-center text-white font-semibold p-3 text-sm">Pass</th>
                                      <th className="text-center text-white font-semibold p-3 text-sm">Fail</th>
                                      <th className="text-center text-white font-semibold p-3 text-sm">Status</th>
                                      <th className="text-center text-white font-semibold p-3 text-sm">Details</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredStudents.map((s, idx) => (
                                      <tr key={s.studentId} className={`border-b ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <td className="p-3 font-bold text-sm">{s.rank}</td>
                                        <td className="p-3 text-sm font-medium">{s.rollNumber}</td>
                                        <td className="p-3 text-sm">{s.name}</td>
                                        <td className="p-3 text-center text-sm font-bold">{s.totalMarks}</td>
                                        <td className="p-3 text-center text-sm">{s.percentage}%</td>
                                        <td className="p-3 text-center text-sm text-green-600 font-medium">{s.passedSubjects}</td>
                                        <td className="p-3 text-center text-sm text-red-600 font-medium">{s.failedSubjects}</td>
                                        <td className="p-3 text-center">
                                          {s.isAllClear ? (
                                            <Badge className="bg-green-100 text-green-700">
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              All Clear
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-red-100 text-red-700">
                                              <XCircle className="w-3 h-3 mr-1" />
                                              {s.failedSubjects} Arrear{s.failedSubjects > 1 ? 's' : ''}
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="p-3 text-center">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setSelectedStudent(s); setStudentDialogOpen(true); }}
                                          >
                                            View
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>
                          </div>
                        ) : (
                          <Card className="p-8 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">Click "Detailed" tab to load detailed analysis</p>
                          </Card>
                        )}
                      </TabsContent>

                      {/* SEMI-DETAILED TAB */}
                      <TabsContent value="semi-detailed">
                        {semiDetailed ? (
                          <div className="space-y-6">
                            {/* Class Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                <p className="text-3xl font-bold text-blue-700">{semiDetailed.classSummary.totalStudents}</p>
                                <p className="text-sm text-blue-600">Total Students</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                <p className="text-3xl font-bold text-green-700">{semiDetailed.classSummary.passPercentage}%</p>
                                <p className="text-sm text-green-600">Pass Percentage</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                                <p className="text-3xl font-bold text-purple-700">{semiDetailed.classSummary.classAverage}%</p>
                                <p className="text-sm text-purple-600">Class Average</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                                <p className="text-3xl font-bold text-amber-700">{semiDetailed.classSummary.allClearCount}</p>
                                <p className="text-sm text-amber-600">All Clear</p>
                              </Card>
                            </div>

                            {/* Best & Worst Subject */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {semiDetailed.bestSubject && (
                                <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    <h4 className="font-semibold text-green-800">Best Performing Subject</h4>
                                  </div>
                                  <p className="text-lg font-bold text-green-700">{semiDetailed.bestSubject.name}</p>
                                  <p className="text-sm text-green-600">{semiDetailed.bestSubject.code} • {semiDetailed.bestSubject.passPercentage}% pass</p>
                                </Card>
                              )}
                              {semiDetailed.worstSubject && (
                                <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <h4 className="font-semibold text-red-800">Needs Attention</h4>
                                  </div>
                                  <p className="text-lg font-bold text-red-700">{semiDetailed.worstSubject.name}</p>
                                  <p className="text-sm text-red-600">{semiDetailed.worstSubject.code} • {semiDetailed.worstSubject.passPercentage}% pass</p>
                                </Card>
                              )}
                            </div>

                            {/* Subject Performance Table */}
                            <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                              <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
                                <h3 className="font-bold text-white">Subject-wise Performance</h3>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Subject</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Credits</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass %</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Avg</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Max</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Min</th>
                                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass/Fail</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {semiDetailed.subjectWise.map((sub, idx) => (
                                      <tr key={sub.courseCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3">
                                          <p className="font-medium text-sm">{sub.courseName}</p>
                                          <p className="text-xs text-gray-500">{sub.courseCode}</p>
                                        </td>
                                        <td className="p-3 text-center text-sm">{sub.credits}</td>
                                        <td className="p-3 text-center">
                                          <Badge className={sub.passPercentage >= 70 ? 'bg-green-100 text-green-700' : sub.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                            {sub.passPercentage}%
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center text-sm font-medium">{sub.avgMark}</td>
                                        <td className="p-3 text-center text-sm text-green-600 font-medium">{sub.maxMark}</td>
                                        <td className="p-3 text-center text-sm text-red-600 font-medium">{sub.minMark}</td>
                                        <td className="p-3 text-center text-sm">
                                          <span className="text-green-600 font-medium">{sub.passCount}</span>
                                          {' / '}
                                          <span className="text-red-600 font-medium">{sub.failCount}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>

                            {/* Top Performers */}
                            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                                <Award className="w-5 h-5 text-amber-600" />
                                Top 10 Performers
                              </h3>
                              <div className="space-y-2">
                                {semiDetailed.topPerformers.map(s => (
                                  <div key={s.rank} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        s.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                                      }`}>{s.rank}</span>
                                      <div>
                                        <p className="font-medium text-sm">{s.name}</p>
                                        <p className="text-xs text-gray-500">{s.rollNumber}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold">{s.percentage}%</span>
                                      {s.isAllClear ? (
                                        <Badge className="bg-green-100 text-green-700">All Clear</Badge>
                                      ) : (
                                        <Badge className="bg-red-100 text-red-700">Arrears</Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>

                            {/* Grade & Arrear Distribution */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-3">Overall Grade Distribution</h3>
                                <div className="space-y-2">
                                  {Object.entries(semiDetailed.gradeDistribution).map(([grade, count]) => (
                                    <div key={grade} className="flex items-center justify-between">
                                      <Badge className={getGradeColor(grade)}>{grade}</Badge>
                                      <div className="flex-1 mx-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="h-2 rounded-full bg-indigo-500"
                                            style={{
                                              width: `${(count as number) > 0 ? Math.max(
                                                ((count as number) / Object.values(semiDetailed.gradeDistribution).reduce((a: number, b: unknown) => a + (b as number), 0)) * 100,
                                                2
                                              ) : 0}%`
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <span className="text-sm font-bold w-8 text-right">{count as number}</span>
                                    </div>
                                  ))}
                                </div>
                              </Card>

                              <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-3">Arrear Distribution</h3>
                                <div className="space-y-3">
                                  {Object.entries(semiDetailed.arrearDistribution).map(([key, count]) => (
                                    <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                      <span className="text-sm font-medium">
                                        {key === '0' ? 'All Clear (0 Arrears)' : key === '3+' ? '3 or more Arrears' : `${key} Arrear${parseInt(key) > 1 ? 's' : ''}`}
                                      </span>
                                      <Badge className={key === '0' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {count as number} students
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            </div>
                          </div>
                        ) : (
                          <Card className="p-8 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">Click "Semi-Detailed" tab to load analysis</p>
                          </Card>
                        )}
                      </TabsContent>

                      {/* OVERVIEW TAB */}
                      <TabsContent value="overview">
                        {overview ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                <p className="text-3xl font-bold text-blue-700">{overview.summary.totalStudents}</p>
                                <p className="text-sm text-blue-600">Total Students</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                <p className="text-3xl font-bold text-green-700">{overview.summary.totalPassed}</p>
                                <p className="text-sm text-green-600">Passed</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                                <p className="text-3xl font-bold text-red-700">{overview.summary.totalFailed}</p>
                                <p className="text-sm text-red-600">Failed</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                                <p className="text-3xl font-bold text-emerald-700">{overview.summary.passPercentage}%</p>
                                <p className="text-sm text-emerald-600">Pass Rate</p>
                              </Card>
                            </div>

                            {overview.classes && overview.classes.length > 0 && (
                              <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-3">Class Summary</h3>
                                {overview.classes.map(c => (
                                  <div key={`${c.year}-${c.section}`} className="bg-gray-50 rounded-lg p-4 mb-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold">Year {c.year}{c.section ? ` - Section ${c.section}` : ''}</p>
                                        <p className="text-sm text-gray-600">{c.totalStudents} students • Avg: {c.averageMark}%</p>
                                      </div>
                                      <Badge className={c.passPercentage >= 70 ? 'bg-green-100 text-green-700' : c.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                        {c.passPercentage}% Pass
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </Card>
                            )}
                          </div>
                        ) : (
                          <Card className="p-8 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">Click "Overview" tab to load analysis</p>
                          </Card>
                        )}
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              )}
            </>
          )}
          
        {/* Loaded Students Summary */}
{loadedStudents.length > 0 && (
  <div className="space-y-6">

    {/* Summary Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

      <Card className="p-4 text-center bg-blue-50 border-blue-200">
        <p className="text-3xl font-bold text-blue-700">
          {studentStats.present}
        </p>
        <p className="text-sm text-blue-600">
          Present
        </p>
      </Card>

      <Card className="p-4 text-center bg-yellow-50 border-yellow-200">
        <p className="text-3xl font-bold text-yellow-700">
          {studentStats.absent}
        </p>
        <p className="text-sm text-yellow-600">
          Absent
        </p>
      </Card>

      <Card className="p-4 text-center bg-green-50 border-green-200">
        <p className="text-3xl font-bold text-green-700">
          {studentStats.pass}
        </p>
        <p className="text-sm text-green-600">
          Pass
        </p>
      </Card>

      <Card className="p-4 text-center bg-red-50 border-red-200">
        <p className="text-3xl font-bold text-red-700">
          {studentStats.fail}
        </p>
        <p className="text-sm text-red-600">
          Fail
        </p>
      </Card>
    </div>

    {/* Student Table */}
    <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
        <h3 className="font-bold text-white">
          Student Ranking List
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-sm font-semibold text-gray-700">
                Rank
              </th>

              <th className="p-3 text-left text-sm font-semibold text-gray-700">
                Roll No
              </th>

              <th className="p-3 text-left text-sm font-semibold text-gray-700">
                Name
              </th>

              <th className="p-3 text-center text-sm font-semibold text-gray-700">
                Total
              </th>

              <th className="p-3 text-center text-sm font-semibold text-gray-700">
                %
              </th>

              <th className="p-3 text-center text-sm font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {loadedStudents.map((student: any, idx: number) => (
              <tr
                key={student.studentId || idx}
                className={
                  idx % 2 === 0
                    ? 'bg-white border-b'
                    : 'bg-gray-50 border-b'
                }
              >
                <td className="p-3 font-bold text-sm">
                  {student.rank}
                </td>

                <td className="p-3 text-sm">
                  {student.rollNumber}
                </td>

                <td className="p-3 text-sm">
                  {student.name}
                </td>

                <td className="p-3 text-center text-sm font-bold">
                  {student.totalMarks}
                </td>

                <td className="p-3 text-center text-sm">
                  {student.percentage}
                </td>

                <td className="p-3 text-center">
                  {student.isAllClear ? (
                    <Badge className="bg-green-100 text-green-700">
                      Pass
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">
                      Fail
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
)}

          {/* No selection state */}
          {!completion && !analysisLoading && (
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Select a Semester</h3>
              <p className="text-gray-500">Choose a semester and check completion status to view result analysis</p>
            </Card>
          )}
        </main>

        <MobileNav items={getNavItems(true)} />
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Student Details - {selectedStudent?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="font-bold">{selectedStudent.name}</p>
                  <p className="text-sm text-gray-600">{selectedStudent.rollNumber} • Rank #{selectedStudent.rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-700">{selectedStudent.percentage}%</p>
                  {selectedStudent.isAllClear ? (
                    <Badge className="bg-green-100 text-green-700">All Clear</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">{selectedStudent.failedSubjects} Arrear(s)</Badge>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                    <tr>
                      <th className="text-left text-white font-semibold p-2 text-xs">Subject</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Int 1</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Int 2</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Model</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Final</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Total</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Grade</th>
                      <th className="text-center text-white font-semibold p-2 text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudent.subjects?.map((sub, idx) => (
                      <tr key={sub.courseId} className={`border-b ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-2">
                          <p className="text-xs font-medium">{sub.courseName}</p>
                          <p className="text-xs text-gray-500">{sub.courseCode}</p>
                        </td>
                        <td className="p-2 text-center text-xs">{sub.internal1}</td>
                        <td className="p-2 text-center text-xs">{sub.internal2}</td>
                        <td className="p-2 text-center text-xs">{sub.modelExam}</td>
                        <td className="p-2 text-center text-xs">{sub.finalExam}</td>
                        <td className="p-2 text-center text-xs font-bold">{sub.total}</td>
                        <td className="p-2 text-center">
                          <Badge className={getGradeColor(sub.grade)}>{sub.grade}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          {sub.isPassed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-bold">{selectedStudent.totalMarks}</span> •
                  Passed: <span className="font-bold text-green-600">{selectedStudent.passedSubjects}</span> •
                  Failed: <span className="font-bold text-red-600">{selectedStudent.failedSubjects}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}