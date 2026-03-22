import { useState, useEffect } from 'react';
import { Home, Users, BarChart3, FileText, Search, Filter, TrendingUp, Award, Eye, Loader2, BookOpen, Calendar, GraduationCap, User, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getDepartmentStudents, getStudentDeepView } from '../../services/hodService';
import type { StudentDeepView } from '../../services/hodService';
import { toast } from 'sonner';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  year: number;
  section: string;
  cgpa: number;
  attendance: number;
  status: string;
}

const getPerformance = (cgpa: number): string => {
  if (cgpa >= 9) return 'Outstanding';
  if (cgpa >= 8) return 'Excellent';
  if (cgpa >= 7) return 'Good';
  return 'Average';
};

export default function HODStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  
  // Student detail view state
  const [_selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDeepView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const params: { year?: number; section?: string } = {};
        if (yearFilter !== 'all') params.year = parseInt(yearFilter);
        if (sectionFilter !== 'all') params.section = sectionFilter;
        
        const res = await getDepartmentStudents(params);
        setStudents(res.data.students || []);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [yearFilter, sectionFilter]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         (student.rollNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const avgCgpa = students.length > 0 ? (students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / students.length).toFixed(1) : '0';
  const avgAttendance = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length) : 0;
  const outstandingCount = students.filter(s => (s.cgpa || 0) >= 9).length;

  // Handle viewing student detail
  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setShowDetailDialog(true);
    setLoadingDetail(true);
    setStudentDetail(null);
    
    try {
      const res = await getStudentDeepView(student.id);
      setStudentDetail(res.data);
    } catch (error) {
      console.error('Failed to fetch student details:', error);
      toast.error('Failed to load student details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'O': return 'bg-green-100 text-green-700';
      case 'A+': return 'bg-blue-100 text-blue-700';
      case 'A': return 'bg-indigo-100 text-indigo-700';
      case 'B': return 'bg-purple-100 text-purple-700';
      case 'C': return 'bg-amber-100 text-amber-700';
      case 'F': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="HOD Portal" subtitle="CSE Department" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Department Students</h1>
          <p className="text-gray-600">Monitor student performance and attendance</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{students.length}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{avgCgpa}</div>
              <div className="text-sm text-gray-600">Avg CGPA</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{avgAttendance}%</div>
              <div className="text-sm text-gray-600">Avg Attendance</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{outstandingCount}</div>
              <div className="text-sm text-gray-600">Outstanding</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-300"
                />
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                  <SelectItem value="4">Year 4</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Desktop Table */}
          <Card className="hidden md:block p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading students...</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Roll No.</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Year/Sec</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">CGPA</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Attendance</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Performance</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const performance = getPerformance(student.cgpa || 0);
                    return (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewStudent(student)}>
                      <td className="py-4 px-4 font-medium text-gray-900">{student.rollNumber}</td>
                      <td className="py-4 px-4 text-gray-900">{student.name}</td>
                      <td className="py-4 px-4 text-gray-900">{student.year}{student.section}</td>
                      <td className="py-4 px-4">
                        <Badge className={
                          (student.cgpa || 0) >= 9 ? 'bg-green-100 text-green-700' :
                          (student.cgpa || 0) >= 8 ? 'bg-blue-100 text-blue-700' :
                          (student.cgpa || 0) >= 7 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {student.cgpa || 0}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            (student.attendance || 0) >= 85 ? 'bg-green-500' :
                            (student.attendance || 0) >= 75 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}></div>
                          <span className="font-medium text-gray-900">{student.attendance || 0}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={
                          performance === 'Outstanding' ? 'bg-green-100 text-green-700' :
                          performance === 'Excellent' ? 'bg-blue-100 text-blue-700' :
                          performance === 'Good' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {performance}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleViewStudent(student); }}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            )}
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading students...</div>
            ) : (
            filteredStudents.map((student) => {
              const performance = getPerformance(student.cgpa || 0);
              return (
              <Card key={student.id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg cursor-pointer" onClick={() => handleViewStudent(student)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{student.name}</div>
                    <div className="text-sm text-gray-600">{student.rollNumber}</div>
                  </div>
                  <Badge className={
                    performance === 'Outstanding' ? 'bg-green-100 text-green-700' :
                    performance === 'Excellent' ? 'bg-blue-100 text-blue-700' :
                    performance === 'Good' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {performance}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Year/Sec</div>
                    <div className="font-bold text-gray-900">{student.year}{student.section}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">CGPA</div>
                    <div className="font-bold text-gray-900">{student.cgpa || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Attendance</div>
                    <div className="font-bold text-gray-900">{student.attendance || 0}%</div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600"
                  onClick={(e) => { e.stopPropagation(); handleViewStudent(student); }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </Card>
            );})
            )}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              Student Academic Profile
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading student details...</p>
            </div>
          ) : studentDetail ? (
            <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl shrink-0">
                <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="marks" className="rounded-lg data-[state=active]:bg-white">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Marks
                </TabsTrigger>
                <TabsTrigger value="analysis" className="rounded-lg data-[state=active]:bg-white">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analysis
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-gray-50">
                      <div className="text-sm text-gray-600">Name</div>
                      <div className="font-semibold text-gray-900">{studentDetail.student.name}</div>
                    </Card>
                    <Card className="p-4 bg-gray-50">
                      <div className="text-sm text-gray-600">Roll Number</div>
                      <div className="font-semibold text-gray-900">{studentDetail.student.rollNumber}</div>
                    </Card>
                    <Card className="p-4 bg-gray-50">
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-semibold text-gray-900">{studentDetail.student.email}</div>
                    </Card>
                    <Card className="p-4 bg-gray-50">
                      <div className="text-sm text-gray-600">Department</div>
                      <div className="font-semibold text-gray-900">{studentDetail.student.department.toUpperCase()}</div>
                    </Card>
                    <Card className="p-4 bg-gray-50">
                      <div className="text-sm text-gray-600">Year / Section</div>
                      <div className="font-semibold text-gray-900">Year {studentDetail.student.year} - Section {studentDetail.student.section}</div>
                    </Card>
                    <Card className="p-4 bg-gray-50">
                      <div className="text-sm text-gray-600">Semester</div>
                      <div className="font-semibold text-gray-900">Semester {studentDetail.student.semester}</div>
                    </Card>
                    {studentDetail.student.fatherName && (
                      <Card className="p-4 bg-gray-50">
                        <div className="text-sm text-gray-600">Father's Name</div>
                        <div className="font-semibold text-gray-900">{studentDetail.student.fatherName}</div>
                      </Card>
                    )}
                    {studentDetail.student.mobile && (
                      <Card className="p-4 bg-gray-50">
                        <div className="text-sm text-gray-600">Mobile</div>
                        <div className="font-semibold text-gray-900">{studentDetail.student.mobile}</div>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-4">
                  {/* Overall Attendance Card */}
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Overall Attendance</div>
                        <div className="text-3xl font-bold text-gray-900">{studentDetail.attendance.overall.percentage.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600">
                          {studentDetail.attendance.overall.presentCount} / {studentDetail.attendance.overall.totalClasses} classes
                        </div>
                      </div>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        studentDetail.attendance.overall.percentage >= 85 ? 'bg-green-100' :
                        studentDetail.attendance.overall.percentage >= 75 ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <span className={`text-xl font-bold ${
                          studentDetail.attendance.overall.percentage >= 85 ? 'text-green-700' :
                          studentDetail.attendance.overall.percentage >= 75 ? 'text-amber-700' : 'text-red-700'
                        }`}>
                          {Math.round(studentDetail.attendance.overall.percentage)}%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Subject-wise Attendance */}
                  <h3 className="font-semibold text-gray-900">Subject-wise Attendance</h3>
                  <div className="space-y-3">
                    {studentDetail.attendance.bySubject.map((subj) => (
                      <Card key={subj.courseId} className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">{subj.courseName}</div>
                            <div className="text-sm text-gray-600">{subj.courseCode}</div>
                          </div>
                          <Badge className={
                            subj.percentage >= 85 ? 'bg-green-100 text-green-700' :
                            subj.percentage >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }>
                            {subj.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress value={subj.percentage} className={`h-2 ${
                          subj.percentage >= 85 ? '[&>div]:bg-green-500' :
                          subj.percentage >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                        }`} />
                        <div className="flex gap-4 mt-2 text-xs text-gray-600">
                          <span>Present: {subj.presentCount}</span>
                          <span>Absent: {subj.absentCount}</span>
                          <span>Leave: {subj.leaveCount}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Marks Tab */}
              <TabsContent value="marks" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-4">
                  {Object.entries(studentDetail.marks.bySemester).map(([semester, subjects]) => (
                    <Card key={semester} className="p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Semester {semester}</h3>
                        <Badge className="bg-blue-100 text-blue-700">
                          GPA: {studentDetail.marks.semesterGPA[semester]?.toFixed(2) || 'N/A'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {subjects.map((subj) => (
                          <div key={subj.courseId} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-gray-900">{subj.courseName}</div>
                                <div className="text-xs text-gray-600">{subj.courseCode}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-900">{subj.total}</span>
                                <Badge className={getGradeColor(subj.grade)}>{subj.grade}</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                              <div>Int-1: {subj.internal1}/25</div>
                              <div>Int-2: {subj.internal2}/25</div>
                              <div>Model: {subj.modelExam}/50</div>
                              <div>Final: {subj.finalExam}/100</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="flex-1 overflow-y-auto mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="text-sm text-blue-100">CGPA</div>
                    <div className="text-3xl font-bold">{studentDetail.summary.cgpa.toFixed(2)}</div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="text-sm text-green-100">Attendance</div>
                    <div className="text-3xl font-bold">{studentDetail.summary.attendancePercentage.toFixed(0)}%</div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                    <div className="text-sm text-purple-100">Subjects Passed</div>
                    <div className="text-3xl font-bold">{studentDetail.summary.passedSubjects}/{studentDetail.summary.totalSubjects}</div>
                  </Card>
                  <Card className={`p-4 ${studentDetail.summary.arrearCount > 0 ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-gray-500 to-slate-600'} text-white`}>
                    <div className="text-sm text-white/80">Arrears</div>
                    <div className="text-3xl font-bold">{studentDetail.summary.arrearCount}</div>
                  </Card>
                </div>

                {/* Semester GPA Chart */}
                <Card className="p-4 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Semester-wise GPA</h3>
                  <div className="flex items-end gap-2 h-32">
                    {Object.entries(studentDetail.marks.semesterGPA).map(([sem, gpa]) => (
                      <div key={sem} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-lg"
                          style={{ height: `${(gpa / 10) * 100}%` }}
                        ></div>
                        <div className="text-xs mt-1 text-gray-600">S{sem}</div>
                        <div className="text-xs font-semibold text-gray-900">{gpa.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
