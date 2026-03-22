import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, BookOpen, Calendar, Upload, FileText, BarChart, Clock, CheckCircle, XCircle, Loader2, UserCheck, UserX, CheckCheck, X, ClipboardList, GraduationCap, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getLeaveRequests, updateLeave, getFacultyDashboardStats, getTodaySchedule, getStudentsByCourse, takeAttendance, type LeaveRequest } from '../../services/facultyService';
import { getAccessToken } from '../../utils/token';

// Decode JWT to get user info
const decodeToken = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

interface DashboardStats {
  title: string;
  value: string;
  color: string;
  icon: string;
}

interface SchedulePeriod {
  period: number;
  subject: string;
  class: string;
  time: string;
  status: string;
  attended: boolean;
  hasClass: boolean;
  courseId?: string;
}

interface Course {
  _id: string;
  code: string;
  name: string;
  department: string;
  semester?: number;
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
  { icon: CalendarDays, label: 'Leave', path: '/faculty/leave' },
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

const iconMap: Record<string, any> = {
  Users,
  BookOpen,
  FileText,
  Upload,
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<SchedulePeriod | null>(null);
  const [attendanceData, setAttendanceData] = useState<{id: string; roll: string; name: string; present: boolean}[]>([]);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  
  // Dashboard data state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dailySchedule, setDailySchedule] = useState<SchedulePeriod[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [todayInfo, setTodayInfo] = useState<{ day: string; date: string }>({ day: '', date: '' });
  
  // Leave state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveRemarks, setLeaveRemarks] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);

  useEffect(() => {
    // Get user info from token
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
      }
    }
    
    loadDashboardData();
    loadLeaveRequests();
  }, []);

  // Helper to determine period status based on current time
  const getPeriodStatus = (startTime: string, endTime: string): string => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    if (currentTotalMinutes < startTotalMinutes) return 'upcoming';
    if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes) return 'ongoing';
    return 'completed';
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, scheduleRes] = await Promise.all([
        getFacultyDashboardStats(),
        getTodaySchedule()
      ]);
      
      // Transform stats object from API to array format for display
      const apiStats = statsRes.data.stats || {};
      const formattedStats: DashboardStats[] = [
        { title: 'Total Courses', value: String(apiStats.totalCourses || 0), color: 'from-blue-500 to-indigo-600', icon: 'BookOpen' },
        { title: 'Total Students', value: String(apiStats.totalStudents || 0), color: 'from-green-500 to-emerald-600', icon: 'Users' },
        { title: 'Pending Leaves', value: String(apiStats.pendingLeaves || 0), color: 'from-amber-500 to-orange-600', icon: 'FileText' },
        { title: 'Classes This Month', value: String(apiStats.classesThisMonth || 0), color: 'from-purple-500 to-pink-600', icon: 'Upload' },
      ];
      
      setStats(formattedStats);
      setCourses(statsRes.data.courses || []);
      
      // Transform schedule data from backend format to frontend format
      const apiSchedule = scheduleRes.data.schedule || [];
      const formattedSchedule: SchedulePeriod[] = apiSchedule
        .filter((p: any) => p.hasClass) // Only show periods with classes
        .map((p: any) => ({
          period: p.period,
          subject: p.course?.name || 'No Subject',
          class: p.section ? `${p.course?.code || ''} - Section ${p.section}` : (p.course?.code || 'N/A'),
          time: `${p.startTime} - ${p.endTime}`,
          status: getPeriodStatus(p.startTime, p.endTime),
          attended: false, // TODO: Check if attendance was already marked
          hasClass: p.hasClass,
          courseId: p.course?._id,
        }));
      
      setDailySchedule(formattedSchedule);
      setTodayInfo({ 
        day: scheduleRes.data.day || '', 
        date: scheduleRes.data.date || '' 
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const res = await getLeaveRequests('pending');
      setLeaveRequests(res.data.leaves || []);
    } catch (err: any) {
      console.error("Failed to fetch leave requests:", err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleLeaveAction = async (status: 'approved' | 'rejected') => {
    if (!selectedLeave) return;
    setProcessingLeave(true);
    try {
      await updateLeave(selectedLeave.id, { status, remarks: leaveRemarks || undefined });
      toast.success(`Leave ${status} successfully`);
      setLeaveDialogOpen(false);
      setSelectedLeave(null);
      setLeaveRemarks('');
      loadLeaveRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${status} leave`);
    } finally {
      setProcessingLeave(false);
    }
  };

  const openLeaveDialog = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setLeaveRemarks('');
    setLeaveDialogOpen(true);
  };

  const handleTakeAttendance = async (period: SchedulePeriod) => {
    if (!period.courseId) {
      toast.error('Course information not available');
      return;
    }
    
    setSelectedPeriod(period);
    setAttendanceData([]);
    setShowAttendanceDialog(true);
    setLoadingStudents(true);
    
    try {
      const res = await getStudentsByCourse(period.courseId);
      const students = res.data.students || [];
      setAttendanceData(students.map((s: any) => ({
        id: s._id,
        roll: s.rollNumber || s.roll,
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        present: true, // Default to present
      })));
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleAttendance = (roll: string) => {
    setAttendanceData(prev => 
      prev.map(student => 
        student.roll === roll ? { ...student, present: !student.present } : student
      )
    );
  };

  const markAllPresent = () => {
    setAttendanceData(prev => prev.map(s => ({ ...s, present: true })));
  };

  const markAllAbsent = () => {
    setAttendanceData(prev => prev.map(s => ({ ...s, present: false })));
  };

  const submitAttendance = async () => {
    if (!selectedPeriod?.courseId) {
      toast.error('No course selected');
      return;
    }

    setSubmittingAttendance(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await takeAttendance({
        courseId: selectedPeriod.courseId,
        date: today,
        period: selectedPeriod.period,
        students: attendanceData.map(s => ({
          studentId: s.id,
          status: s.present ? 'present' : 'absent'
        }))
      });
      
      const presentCount = attendanceData.filter(s => s.present).length;
      toast.success(`Attendance submitted: ${presentCount}/${attendanceData.length} present`);
      setShowAttendanceDialog(false);
      
      // Refresh schedule to update attended status
      loadDashboardData();
    } catch (error: any) {
      console.error('Failed to submit attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to submit attendance');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'ongoing': return 'bg-blue-100 text-blue-700';
      case 'upcoming': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'ongoing': return <Clock className="w-4 h-4 animate-pulse" />;
      case 'upcoming': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            வணக்கம், {userInfo?.name ? userInfo.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Faculty'}
          </h1>
          <p className="text-gray-600">
            {userInfo?.department ? `Department of ${userInfo.department.toUpperCase()}` : 'Faculty Portal'}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => {
              const Icon = iconMap[stat.icon] || Users;
              return (
                <Card key={index} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                </Card>
              );
            })}
          </div>

          {/* Daily Class Schedule Section */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
              <Badge className="bg-blue-100 text-blue-700">
                {todayInfo.day || new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Badge>
            </div>
            {dailySchedule.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No classes scheduled for today</p>
              </div>
            ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {dailySchedule.map((period) => (
                <Card 
                  key={period.period} 
                  className={`p-4 border-2 transition-all ${
                    period.status === 'ongoing' 
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                      : 'border-transparent bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{period.period}</span>
                      </div>
                      <Badge className={getStatusColor(period.status)}>
                        {getStatusIcon(period.status)}
                        <span className="ml-1 capitalize">{period.status}</span>
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{period.subject}</h3>
                  <p className="text-xs text-gray-600 mb-1">{period.class}</p>
                  <p className="text-xs text-gray-500 mb-3">{period.time}</p>
                  <Button 
                    size="sm" 
                    onClick={() => handleTakeAttendance(period)}
                    disabled={period.status === 'upcoming'}
                    className={`w-full h-8 text-xs ${
                      period.attended 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    }`}
                  >
                    {period.attended ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Attended
                      </>
                    ) : (
                      'Take Attendance'
                    )}
                  </Button>
                </Card>
              ))}
            </div>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Button className="h-20 flex-col bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" onClick={() => navigate('/faculty/attendance')}>
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Mark Attendance</span>
                </Button>
                <Button className="h-20 flex-col bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" onClick={() => navigate('/faculty/marks')}>
                  <FileText className="w-6 h-6 mb-1" />
                  <span className="text-xs">Enter Marks</span>
                </Button>
                <Button className="h-20 flex-col bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" onClick={() => navigate('/faculty/materials')}>
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Upload Material</span>
                </Button>
                <Button className="h-20 flex-col bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700" onClick={() => navigate('/faculty/result-analysis')}>
                  <BarChart className="w-6 h-6 mb-1" />
                  <span className="text-xs">View Reports</span>
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Assigned Courses</h2>
              <div className="space-y-3">
                {courses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No courses assigned yet</p>
                ) : (
                  courses.map((course, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-bold text-gray-900">{course.name}</div>
                          <div className="text-xs text-gray-600">{course.code}</div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">
                          {course.department?.toUpperCase()}
                        </Badge>
                      </div>
                      {course.semester && (
                        <div className="text-xs text-gray-500">Semester {course.semester}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Leave Requests Section */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Pending Leave Requests
                {leaveRequests.length > 0 && (
                  <Badge className="ml-3 bg-red-100 text-red-700">{leaveRequests.length}</Badge>
                )}
              </h2>
            </div>
            {loadingLeaves ? (
              <p className="text-gray-500 text-center py-4">Loading...</p>
            ) : leaveRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending leave requests</p>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((leave) => (
                  <div 
                    key={leave.id} 
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openLeaveDialog(leave)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-gray-900">{leave.studentName}</span>
                          <Badge className="bg-blue-100 text-blue-700">{leave.rollNumber}</Badge>
                          <Badge className="bg-purple-100 text-purple-700">{leave.department}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Date:</span>{' '}
                          {new Date(leave.date).toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                        <p className="text-gray-600 text-sm">{leave.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeave(leave);
                            handleLeaveAction('approved');
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLeaveDialog(leave);
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>

      {/* Attendance Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              Take Attendance
            </DialogTitle>
            {selectedPeriod && (
              <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedPeriod.subject}</p>
                    <p className="text-sm text-gray-600">{selectedPeriod.class}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">Period {selectedPeriod.period}</Badge>
                    <Badge className="bg-gray-100 text-gray-700">{selectedPeriod.time}</Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading students...</p>
              </div>
            ) : attendanceData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-lg font-semibold text-gray-700">No Students Found</p>
                <p className="text-sm text-gray-500 mt-1">No students enrolled in this course</p>
              </div>
            ) : (
              <>
                {/* Stats & Bulk Actions Bar */}
                <div className="sticky top-0 bg-white z-10 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border">
                        <div className="text-2xl font-bold text-gray-900">{attendanceData.length}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{attendanceData.filter(s => s.present).length}</div>
                        <div className="text-xs text-green-600">Present</div>
                      </div>
                      <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{attendanceData.filter(s => !s.present).length}</div>
                        <div className="text-xs text-red-600">Absent</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={markAllPresent} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                        <CheckCheck className="w-4 h-4 mr-1" /> All Present
                      </Button>
                      <Button variant="outline" size="sm" onClick={markAllAbsent} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <X className="w-4 h-4 mr-1" /> All Absent
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Students Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attendanceData.map((student, index) => (
                    <div 
                      key={student.id || index}
                      onClick={() => toggleAttendance(student.roll)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                        student.present 
                          ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
                          : 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                          student.present 
                            ? 'bg-green-200 text-green-700' 
                            : 'bg-red-200 text-red-700'
                        }`}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.roll}</div>
                        </div>
                        
                        {/* Status */}
                        <div className="flex flex-col items-end gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            student.present ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {student.present 
                              ? <UserCheck className="w-4 h-4 text-white" /> 
                              : <UserX className="w-4 h-4 text-white" />
                            }
                          </div>
                          <span className={`text-xs font-medium ${student.present ? 'text-green-600' : 'text-red-600'}`}>
                            {student.present ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {attendanceData.length > 0 && (
            <div className="pt-4 border-t flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAttendanceDialog(false)}
                className="flex-1"
                disabled={submittingAttendance}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitAttendance}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                disabled={submittingAttendance}
              >
                {submittingAttendance ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Attendance
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Review Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Review Leave Request</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{selectedLeave.studentName}</span>
                  <Badge className="bg-blue-100 text-blue-700">{selectedLeave.rollNumber}</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Department:</span> {selectedLeave.department}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Date:</span>{' '}
                  {new Date(selectedLeave.date).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Reason:</span> {selectedLeave.reason}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Remarks (Optional)</label>
                <Textarea
                  placeholder="Add remarks for the student..."
                  value={leaveRemarks}
                  onChange={(e) => setLeaveRemarks(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLeaveDialogOpen(false)}
              disabled={processingLeave}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleLeaveAction('rejected')}
              disabled={processingLeave}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleLeaveAction('approved')}
              disabled={processingLeave}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
