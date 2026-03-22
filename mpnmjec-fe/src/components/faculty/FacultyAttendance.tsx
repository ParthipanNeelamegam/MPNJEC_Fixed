import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, CheckCircle, Loader2, UserCheck, UserX, CheckCheck, X, Filter, Search, Calendar, BookOpen, Users } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getMyCourses, getStudentsByCourse, takeAttendance, getAttendance, getCurrentPeriod, type CurrentPeriodResponse } from '../../services/facultyService';
import { getAccessToken } from '../../utils/token';
import { getNavItems, decodeToken } from '../../utils/facultyNav';
import type { FacultyUserInfo } from '../../utils/facultyNav';

interface Course {
  _id: string;
  code: string;
  name: string;
  department: string;
  semester?: number;
  year?: number;
  section?: string;
}

interface AttendanceStudent {
  id: string;
  roll: string;
  name: string;
  present: boolean;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  rollNumber: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  date: string;
  period: number;
  status: string;
}

export default function FacultyAttendance() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(searchParams.get('courseId') || '');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [userInfo, setUserInfo] = useState<FacultyUserInfo | null>(null);
  
  // Period info
  const [periodInfo, setPeriodInfo] = useState<CurrentPeriodResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  
  // Attendance dialog
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Attendance history
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
      }
    }
    
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadAttendanceHistory();
    }
  }, [selectedCourse]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [coursesRes, periodRes] = await Promise.all([
        getMyCourses(),
        getCurrentPeriod()
      ]);
      
      setCourses(coursesRes.data.courses || []);
      setPeriodInfo(periodRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceHistory = async () => {
    if (!selectedCourse) return;
    
    try {
      setLoadingHistory(true);
      const res = await getAttendance({ courseId: selectedCourse });
      setAttendanceHistory(res.data.attendance || []);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTakeAttendance = async (period: number) => {
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }
    
    // Check if period is editable
    const periodDetail = periodInfo?.allPeriods.find(p => p.periodNumber === period);
    if (!periodDetail?.canEdit) {
      toast.error('This period is not editable right now');
      return;
    }
    
    setSelectedPeriod(period);
    setAttendanceData([]);
    setShowAttendanceDialog(true);
    setLoadingStudents(true);
    
    try {
      const filters: any = {};
      if (selectedYear && selectedYear !== 'all') filters.year = parseInt(selectedYear);
      if (selectedSection && selectedSection !== 'all') filters.section = selectedSection;
      
      const res = await getStudentsByCourse(selectedCourse, filters);
      const students = res.data.students || [];
      setAttendanceData(students.map((s: any) => ({
        id: s._id,
        roll: s.rollNumber || s.roll,
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
        present: true,
      })));
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleAttendance = (roll: string) => {
    setAttendanceData(prev => prev.map(student => 
      student.roll === roll ? { ...student, present: !student.present } : student
    ));
  };

  const markAllPresent = () => setAttendanceData(prev => prev.map(s => ({ ...s, present: true })));
  const markAllAbsent = () => setAttendanceData(prev => prev.map(s => ({ ...s, present: false })));

  const submitAttendance = async () => {
    if (!selectedCourse || !selectedPeriod) {
      toast.error('Course and period are required');
      return;
    }
    
    setSubmittingAttendance(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await takeAttendance({
        courseId: selectedCourse,
        date: today,
        period: selectedPeriod,
        students: attendanceData.map(s => ({
          studentId: s.id,
          status: s.present ? 'present' : 'absent'
        }))
      });
      
      const presentCount = attendanceData.filter(s => s.present).length;
      toast.success(`Attendance submitted: ${presentCount}/${attendanceData.length} present`);
      setShowAttendanceDialog(false);
      loadAttendanceHistory();
    } catch (error: any) {
      console.error('Failed to submit attendance:', error);
      toast.error(error.response?.data?.error || 'Failed to submit attendance');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const filteredStudents = attendanceData.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPeriodStatus = (period: any) => {
    if (period.isActive) return 'ongoing';
    if (period.canEdit) return 'editable';
    const now = new Date();
    const [startH, startM] = period.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes < startMinutes ? 'upcoming' : 'completed';
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">{userInfo?.department ? `Department of ${userInfo.department.toUpperCase()}` : 'Mark and manage attendance'}</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Select Course & Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Course</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Section</label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={loadAttendanceHistory}
                  disabled={!selectedCourse}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Load Data
                </Button>
              </div>
            </div>
          </Card>

          {/* Period Selection for Taking Attendance */}
          {selectedCourse && periodInfo && (
            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Today's Periods</h2>
                <Badge className="bg-blue-100 text-blue-700">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {periodInfo.allPeriods.map((period) => {
                  const status = getPeriodStatus(period);
                  return (
                    <div
                      key={period.periodNumber}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        period.isActive ? 'border-blue-300 bg-blue-50' :
                        period.canEdit ? 'border-green-300 bg-green-50 cursor-pointer hover:shadow-md' :
                        status === 'upcoming' ? 'border-gray-200 bg-gray-50' :
                        'border-gray-200 bg-gray-100'
                      }`}
                      onClick={() => period.canEdit && handleTakeAttendance(period.periodNumber)}
                    >
                      <div className="text-center">
                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                          period.isActive ? 'bg-blue-500 text-white' :
                          period.canEdit ? 'bg-green-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        }`}>
                          {period.periodNumber}
                        </div>
                        <div className="text-xs text-gray-600">{period.startTime} - {period.endTime}</div>
                        {period.isActive && (
                          <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        )}
                        {period.canEdit && !period.isActive && (
                          <Badge className="mt-2 bg-green-100 text-green-700 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Editable
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Attendance History */}
          {selectedCourse && (
            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Attendance Records</h2>
              
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : attendanceHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No attendance records found for this course</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 text-sm font-semibold text-gray-600">Date</th>
                        <th className="pb-3 text-sm font-semibold text-gray-600">Period</th>
                        <th className="pb-3 text-sm font-semibold text-gray-600">Roll No.</th>
                        <th className="pb-3 text-sm font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.slice(0, 20).map((record) => (
                        <tr key={record.id} className="border-b last:border-0">
                          <td className="py-3 text-sm text-gray-900">
                            {new Date(record.date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3 text-sm text-gray-900">Period {record.period}</td>
                          <td className="py-3 text-sm text-gray-900">{record.rollNumber}</td>
                          <td className="py-3">
                            <Badge className={
                              record.status === 'present' ? 'bg-green-100 text-green-700' :
                              record.status === 'leave' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {record.status === 'present' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {!selectedCourse && (
            <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Course</h3>
              <p className="text-gray-500">Choose a course from the dropdown above to take attendance or view records</p>
            </Card>
          )}
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>

      {/* Attendance Dialog */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              Take Attendance - Period {selectedPeriod}
            </DialogTitle>
            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{courses.find(c => c._id === selectedCourse)?.name}</p>
                  <p className="text-sm text-gray-600">{courses.find(c => c._id === selectedCourse)?.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700">Period {selectedPeriod}</Badge>
                  <Badge className="bg-gray-100 text-gray-700">{new Date().toLocaleDateString()}</Badge>
                </div>
              </div>
            </div>
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
                <p className="text-sm text-gray-500 mt-1">No students enrolled in this course with selected filters</p>
              </div>
            ) : (
              <>
                {/* Stats & Bulk Actions Bar */}
                <div className="sticky top-0 bg-white z-10 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border">
                        <div className="text-2xl font-bold text-gray-900">{filteredStudents.length}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{filteredStudents.filter(s => s.present).length}</div>
                        <div className="text-xs text-green-600">Present</div>
                      </div>
                      <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{filteredStudents.filter(s => !s.present).length}</div>
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
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Students Grid */}
                <div className="overflow-x-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[320px]">
                  {filteredStudents.map((student, index) => (
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                          student.present 
                            ? 'bg-green-200 text-green-700' 
                            : 'bg-red-200 text-red-700'
                        }`}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.roll}</div>
                        </div>
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
    </div>
  );
}
