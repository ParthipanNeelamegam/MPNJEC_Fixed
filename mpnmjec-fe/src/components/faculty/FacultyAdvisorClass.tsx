import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, Calendar, FileText, Loader2, GraduationCap, ClipboardList, Mail, Phone, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getAccessToken } from '../../utils/token';
import axiosInstance from '../../axios/axiosInstance';

const decodeToken = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  rollNumber: string;
  year: number;
  section: string;
  semester: number;
  department: string;
  attendancePercentage?: number;
  cgpa?: number;
}

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
];

const advisorNavItems = [
  { icon: GraduationCap, label: 'My Class', path: '/faculty/advisor/class' },
];

const getNavItems = (isClassAdvisor: boolean) => {
  if (isClassAdvisor) {
    return [...baseNavItems, ...advisorNavItems];
  }
  return baseNavItems;
};

export default function FacultyAdvisorClass() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    lowAttendance: 0,
    avgCgpa: 0,
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
        
        if (decoded.isClassAdvisor && decoded.advisorFor) {
          loadClassStudents(decoded.advisorFor);
        }
      }
    }
  }, []);

  const loadClassStudents = async (_advisorFor: { year: number; section?: string; department?: string }) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/advisor/students');
      const studentData = res.data.students || [];
      setStudents(studentData);
      
      // Calculate stats
      const totalStudents = studentData.length;
      const avgAttendance = totalStudents > 0 
        ? Math.round(studentData.reduce((acc: number, s: Student) => acc + (s.attendancePercentage || 0), 0) / totalStudents)
        : 0;
      const lowAttendance = studentData.filter((s: Student) => (s.attendancePercentage || 0) < 75).length;
      const avgCgpa = totalStudents > 0 
        ? (studentData.reduce((acc: number, s: Student) => acc + (s.cgpa || 0), 0) / totalStudents).toFixed(2)
        : '0.00';
      
      setStats({
        totalStudents,
        avgAttendance,
        lowAttendance,
        avgCgpa: parseFloat(avgCgpa),
      });
    } catch (error: any) {
      console.error('Failed to load students:', error);
      toast.error(error.response?.data?.error || 'Failed to load class students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-green-100 text-green-700';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (!userInfo?.isClassAdvisor) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={getNavItems(false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Not a Class Advisor</h2>
            <p className="text-gray-600">You are not currently assigned as a Class Advisor.</p>
            <p className="text-sm text-gray-500 mt-2">Contact your HOD for class advisor assignment.</p>
          </Card>
        </div>
        <MobileNav items={getNavItems(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar 
        items={getNavItems(userInfo?.isClassAdvisor || false)} 
        title="Faculty Portal" 
        subtitle={userInfo?.department ? `${userInfo.department.toUpperCase()} Department` : ''} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Class</h1>
              {userInfo?.advisorFor && (
                <p className="text-gray-600">
                  Class Advisor - Year {userInfo.advisorFor.year}
                  {userInfo.advisorFor.section && ` Section ${userInfo.advisorFor.section}`}
                </p>
              )}
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
              <GraduationCap className="w-4 h-4 mr-1" />
              Class Advisor
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Students</p>
                  <p className="text-3xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="w-10 h-10 text-blue-200" />
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Avg Attendance</p>
                  <p className="text-3xl font-bold">{stats.avgAttendance}%</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-200" />
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-red-500 to-rose-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Low Attendance</p>
                  <p className="text-3xl font-bold">{stats.lowAttendance}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-red-200" />
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Avg CGPA</p>
                  <p className="text-3xl font-bold">{stats.avgCgpa}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-200" />
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="students" className="space-y-4">
            <TabsList className="bg-white border">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="attendance">Attendance Issues</TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              {/* Search */}
              <div className="relative mb-4">
                <Input
                  placeholder="Search students by name, roll number, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No students found</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => (
                    <Card key={student._id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{student.name}</h3>
                          <p className="text-sm text-gray-500">{student.rollNumber}</p>
                        </div>
                        <Badge className={getAttendanceColor(student.attendancePercentage || 0)}>
                          {student.attendancePercentage || 0}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Mail className="w-4 h-4 mr-2" />
                          {student.email || 'No email'}
                        </div>
                        {student.phone && (
                          <div className="flex items-center text-gray-600">
                            <Phone className="w-4 h-4 mr-2" />
                            {student.phone}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-gray-500">Semester {student.semester}</span>
                          {student.cgpa && (
                            <Badge className="bg-purple-100 text-purple-700">
                              CGPA: {student.cgpa}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="attendance">
              <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="p-4 bg-gradient-to-r from-red-500 to-rose-600">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Students with Low Attendance (&lt;75%)
                  </h3>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="divide-y">
                    {students
                      .filter(s => (s.attendancePercentage || 0) < 75)
                      .sort((a, b) => (a.attendancePercentage || 0) - (b.attendancePercentage || 0))
                      .map((student) => (
                        <div key={student._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.rollNumber}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-red-100 text-red-700 text-lg">
                              {student.attendancePercentage || 0}%
                            </Badge>
                            {student.email && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2"
                                onClick={() => window.open(`mailto:${student.email}?subject=Attendance Alert`)}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    {students.filter(s => (s.attendancePercentage || 0) < 75).length === 0 && (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                        <p className="text-gray-600">All students have good attendance!</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    </div>
  );
}
