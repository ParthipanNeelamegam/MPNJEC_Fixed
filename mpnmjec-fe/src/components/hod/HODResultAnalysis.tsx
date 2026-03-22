import { useState, useEffect } from 'react';
import {
  Home, Users, BarChart3, FileText, Loader2, CheckCircle, XCircle,
  AlertCircle, TrendingUp, Award, Search, CalendarDays, Filter
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
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
  { icon: TrendingUp, label: 'Results', path: '/hod/result-analysis' },
];

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

export default function HODResultAnalysis() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [activeTab, setActiveTab] = useState('completion');

  const [completion, setCompletion] = useState<CompletionStatus | null>(null);
  const [detailed, setDetailed] = useState<DetailedAnalysis | null>(null);
  const [semiDetailed, setSemiDetailed] = useState<SemiDetailedAnalysis | null>(null);
  const [overview, setOverview] = useState<OverviewAnalysis | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUserInfo({
          id: decoded.id,
          name: decoded.name || 'HOD',
          role: decoded.role,
          department: decoded.department,
        });
      }
    }
    setLoading(false);
  }, []);

  const resetAnalysis = () => {
    setDetailed(null);
    setSemiDetailed(null);
    setOverview(null);
    setCompletion(null);
    setActiveTab('completion');
  };

  const checkCompletion = async () => {
    if (!selectedSemester) {
      toast.error('Please select a semester');
      return;
    }

    try {
      setAnalysisLoading(true);
      resetAnalysis();

      const params: any = { semester: parseInt(selectedSemester) };
      if (selectedYear) params.year = parseInt(selectedYear);
      if (selectedSection) params.section = selectedSection;

      const res = await getCompletionStatus(params);
      setCompletion(res.data);

      // Check if all classes are complete (for dept-wide view)
      const data = res.data;
      if (data.isComplete) {
        toast.success('All marks are complete! You can now view result analysis.');
      } else if (data.classes) {
        const allComplete = data.classes.every((c: any) => c.isComplete);
        if (allComplete) {
          toast.success('All marks are complete! You can now view result analysis.');
        } else {
          toast.info('Some classes have incomplete marks.');
        }
      } else {
        toast.info(`Marks completion: ${data.completionPercentage}%`);
      }
    } catch (error: any) {
      console.error('Failed to check completion:', error);
      toast.error(error.response?.data?.error || 'Failed to check completion status');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const isAnalysisReady = () => {
    if (!completion) return false;
    if (completion.isComplete) return true;
    if (completion.classes) {
      return completion.classes.some((c: any) => c.isComplete);
    }
    return false;
  };

  const loadAnalysis = async (type: 'detailed' | 'semi-detailed' | 'overview') => {
    if (!selectedSemester) return;

    try {
      setAnalysisLoading(true);

      const params: any = { semester: parseInt(selectedSemester) };
      if (selectedYear) params.year = parseInt(selectedYear);
      if (selectedSection) params.section = selectedSection;

      if (type === 'detailed') {
        if (!selectedYear) {
          toast.error('Please select a specific year for detailed analysis');
          setAnalysisLoading(false);
          return;
        }
        const res = await getDetailedAnalysis(params);
        setDetailed(res.data);
        setActiveTab('detailed');
      } else if (type === 'semi-detailed') {
        if (!selectedYear) {
          toast.error('Please select a specific year for semi-detailed analysis');
          setAnalysisLoading(false);
          return;
        }
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
      toast.error(error.response?.data?.error || `Failed to load ${type} analysis`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="HOD Portal" subtitle="" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
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
        items={navItems}
        title="HOD Portal"
        subtitle={userInfo?.department ? `${userInfo.department.toUpperCase()} Department` : ''}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Result Analysis</h1>
            <p className="text-gray-600">
              Department-wide examination result analysis • {userInfo?.department?.toUpperCase()}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">Filters</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Year</Label>
                <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); resetAnalysis(); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Section</Label>
                <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); resetAnalysis(); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Semester</Label>
                <Select value={selectedSemester} onValueChange={(v) => { setSelectedSemester(v); resetAnalysis(); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={checkCompletion}
                  disabled={!selectedSemester || analysisLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {analysisLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Check & Load'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Completion Status */}
          {completion && (
            <>
              {/* Single class completion */}
              {completion.isComplete !== undefined && !completion.classes && (
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
                      {completion.completionPercentage}%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className={`h-3 rounded-full transition-all ${completion.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
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
                </Card>
              )}

              {/* Multi-class completion */}
              {completion.classes && (
                <Card className="p-5 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h3 className="font-bold text-gray-900 mb-3">Class-wise Completion Status</h3>
                  <div className="space-y-3">
                    {completion.classes.map((c: any) => (
                      <div key={`${c.year}-${c.section}`} className={`p-3 rounded-lg border ${
                        c.isComplete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Year {c.year}{c.section ? ` • Section ${c.section}` : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{c.filledCount}/{c.totalRequired}</span>
                            {c.isComplete ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${c.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${c.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Analysis Tabs */}
              {isAnalysisReady() && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger
                      value="detailed"
                      onClick={() => !detailed && loadAnalysis('detailed')}
                    >
                      Detailed
                    </TabsTrigger>
                    <TabsTrigger
                      value="semi-detailed"
                      onClick={() => !semiDetailed && loadAnalysis('semi-detailed')}
                    >
                      Semi-Detailed
                    </TabsTrigger>
                    <TabsTrigger
                      value="overview"
                      onClick={() => !overview && loadAnalysis('overview')}
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
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                              <Card className="p-3 text-center bg-blue-50 border-blue-200">
                                <p className="text-2xl font-bold text-blue-700">{detailed.classSummary.totalStudents}</p>
                                <p className="text-xs text-blue-600">Students</p>
                              </Card>
                              <Card className="p-3 text-center bg-green-50 border-green-200">
                                <p className="text-2xl font-bold text-green-700">{detailed.classSummary.allClearCount}</p>
                                <p className="text-xs text-green-600">All Clear</p>
                              </Card>
                              <Card className="p-3 text-center bg-red-50 border-red-200">
                                <p className="text-2xl font-bold text-red-700">{detailed.classSummary.failCount}</p>
                                <p className="text-xs text-red-600">Arrears</p>
                              </Card>
                              <Card className="p-3 text-center bg-emerald-50 border-emerald-200">
                                <p className="text-2xl font-bold text-emerald-700">{detailed.classSummary.passPercentage}%</p>
                                <p className="text-xs text-emerald-600">Pass %</p>
                              </Card>
                              <Card className="p-3 text-center bg-indigo-50 border-indigo-200">
                                <p className="text-2xl font-bold text-indigo-700">{detailed.classSummary.classAverage}%</p>
                                <p className="text-xs text-indigo-600">Average</p>
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
                                  <Award className="w-5 h-5 text-amber-600" /> Class Toppers
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

                            {/* Subject Stats Table */}
                            <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
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
                            <Card className="p-4 bg-white/80 border-0 shadow-lg">
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
                                            <Badge className={getGradeColor(g)}>{gd.distribution[g]}</Badge>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>

                            {/* Student Rank List */}
                            <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
                              <div className="p-4 border-b">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-bold text-gray-900">Student Rank List</h3>
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
                                        <td className="p-3 text-center">
                                          {s.isAllClear ? (
                                            <Badge className="bg-green-100 text-green-700">All Clear</Badge>
                                          ) : (
                                            <Badge className="bg-red-100 text-red-700">{s.failedSubjects} Arrear(s)</Badge>
                                          )}
                                        </td>
                                        <td className="p-3 text-center">
                                          <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(s); setStudentDialogOpen(true); }}>
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
                            <p className="text-gray-500">Select a specific year and click "Detailed" to load</p>
                          </Card>
                        )}
                      </TabsContent>

                      {/* SEMI-DETAILED TAB */}
                      <TabsContent value="semi-detailed">
                        {semiDetailed ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                <p className="text-3xl font-bold text-blue-700">{semiDetailed.classSummary.totalStudents}</p>
                                <p className="text-sm text-blue-600">Students</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                <p className="text-3xl font-bold text-green-700">{semiDetailed.classSummary.passPercentage}%</p>
                                <p className="text-sm text-green-600">Pass %</p>
                              </Card>
                              <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                                <p className="text-3xl font-bold text-purple-700">{semiDetailed.classSummary.classAverage}%</p>
                                <p className="text-sm text-purple-600">Average</p>
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
                                    <h4 className="font-semibold text-green-800">Best Subject</h4>
                                  </div>
                                  <p className="font-bold text-green-700">{semiDetailed.bestSubject.name}</p>
                                  <p className="text-sm text-green-600">{semiDetailed.bestSubject.passPercentage}% pass rate</p>
                                </Card>
                              )}
                              {semiDetailed.worstSubject && (
                                <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <h4 className="font-semibold text-red-800">Needs Attention</h4>
                                  </div>
                                  <p className="font-bold text-red-700">{semiDetailed.worstSubject.name}</p>
                                  <p className="text-sm text-red-600">{semiDetailed.worstSubject.passPercentage}% pass rate</p>
                                </Card>
                              )}
                            </div>

                            {/* Subject Performance */}
                            <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
                              <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
                                <h3 className="font-bold text-white">Subject-wise Performance</h3>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Subject</th>
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
                                        <td className="p-3 text-center">
                                          <Badge className={sub.passPercentage >= 70 ? 'bg-green-100 text-green-700' : sub.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                            {sub.passPercentage}%
                                          </Badge>
                                        </td>
                                        <td className="p-3 text-center text-sm font-medium">{sub.avgMark}</td>
                                        <td className="p-3 text-center text-sm text-green-600">{sub.maxMark}</td>
                                        <td className="p-3 text-center text-sm text-red-600">{sub.minMark}</td>
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

                            {/* Top 10 & Distributions */}
                            <Card className="p-4 bg-white/80 border-0 shadow-lg">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                                <Award className="w-5 h-5 text-amber-600" /> Top 10 Performers
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
                                    <div className="flex items-center gap-2">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="p-4 bg-white/80 border-0 shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-3">Grade Distribution</h3>
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

                              <Card className="p-4 bg-white/80 border-0 shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-3">Arrear Distribution</h3>
                                <div className="space-y-3">
                                  {Object.entries(semiDetailed.arrearDistribution).map(([key, count]) => (
                                    <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                      <span className="text-sm font-medium">
                                        {key === '0' ? 'All Clear' : key === '3+' ? '3+ Arrears' : `${key} Arrear${parseInt(key) > 1 ? 's' : ''}`}
                                      </span>
                                      <Badge className={key === '0' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                        {count as number}
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
                            <p className="text-gray-500">Select a specific year and click "Semi-Detailed" to load</p>
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
                              <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
                                <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
                                  <h3 className="font-bold text-white">Class-wise Results</h3>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Class</th>
                                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Students</th>
                                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Passed</th>
                                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Failed</th>
                                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass %</th>
                                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Avg Mark</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {overview.classes.map((c, idx) => (
                                        <tr key={`${c.year}-${c.section}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                          <td className="p-3 font-medium text-sm">Year {c.year}{c.section ? ` - ${c.section}` : ''}</td>
                                          <td className="p-3 text-center text-sm">{c.totalStudents}</td>
                                          <td className="p-3 text-center text-sm text-green-600 font-medium">{c.passCount}</td>
                                          <td className="p-3 text-center text-sm text-red-600 font-medium">{c.failCount || (c.totalStudents - c.passCount)}</td>
                                          <td className="p-3 text-center">
                                            <Badge className={c.passPercentage >= 70 ? 'bg-green-100 text-green-700' : c.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                              {c.passPercentage}%
                                            </Badge>
                                          </td>
                                          <td className="p-3 text-center text-sm font-medium">{c.averageMark}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </Card>
                            )}
                          </div>
                        ) : (
                          <Card className="p-8 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">Click "Overview" tab to load department-wide analysis</p>
                          </Card>
                        )}
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              )}
            </>
          )}

          {!completion && !analysisLoading && (
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Select Filters & Check</h3>
              <p className="text-gray-500">Choose semester, year, section and click "Check & Load" to view result analysis</p>
            </Card>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details - {selectedStudent?.name}</DialogTitle>
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
                    {selectedStudent.subjects.map((sub, idx) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
