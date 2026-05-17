import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, BarChart, FileText, Calendar, Plus, Save, CheckCircle, XCircle, AlertCircle, Loader2, Clock, UserCheck, UserX, CheckCheck, X, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getDepartmentStats, getFacultyWorkload, getFacultyList, getSubjectsList, saveTimetable as saveTimetableApi, getTimetable, getTodaySchedule, getStudentsByCourse, takeAttendance } from '../../services/hodService';

interface DepartmentStats {
  totalStudents: number;
  totalFaculty: number;
  pendingLeaveRequests: number;
}

interface FacultyWorkloadItem {
  name: string;
  courses: number;
  students: number;
  workload: number;
  status: string;
  periodsPerWeek: number;
  attendanceSubmission: number;
}

interface SchedulePeriod {
  period: number;
  subject: string;
  class: string;
  time: string;
  status: string;
  hasClass: boolean;
  courseId?: string;
}

interface AttendanceStudent {
  id: string;
  roll: string;
  name: string;
  present: boolean;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

// Static fallback subjects for CSE department
const fallbackSubjects = [
  'Programming in C',
  'Data Structures',
  'Object Oriented Programming',
  'Database Management Systems',
  'Operating Systems',
  'Computer Networks',
  'Machine Learning',
  'Cloud Computing',
  'Design and Analysis of Algorithms',
  'Software Engineering',
  'Web Technologies',
  'Compiler Design',
];

type TimetableSlot = {
  id?: string;
  faculty: string;
  facultyId?: string;
  subject: string;
  subjectCode?: string;
  courseId?: string;
  class: string;
  classroom?: string;
  year?: number;
  section?: string;
};

type WeeklyTimetable = {
  [day: string]: {
    [period: number]: TimetableSlot | null;
  };
};

export default function HODDashboard() {
  const [loading, setLoading] = useState(true);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats>({
    totalStudents: 0,
    totalFaculty: 0,
    pendingLeaveRequests: 0,
  });
  const [department, setDepartment] = useState('');
  const [facultyWorkload, setFacultyWorkload] = useState<FacultyWorkloadItem[]>([]);
  const [facultyList, setFacultyList] = useState<{id: string; name: string}[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);

  // Timetable Year/Section filters
  const [timetableYear, setTimetableYear] = useState<number>(1);
  const [timetableSection, setTimetableSection] = useState<string>('A');
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Schedule & Attendance state
  const [todaySchedule, setTodaySchedule] = useState<SchedulePeriod[]>([]);
  const [todayInfo, setTodayInfo] = useState<{ day: string; date: string }>({ day: '', date: '' });
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SchedulePeriod | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // View slot details state
  const [showSlotDetailDialog, setShowSlotDetailDialog] = useState(false);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<TimetableSlot | null>(null);

  const [showTimetableDialog, setShowTimetableDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedTimetablePeriod, setSelectedTimetablePeriod] = useState(1);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [semesterStart, setSemesterStart] = useState('2026-01-15');
  const [semesterEnd, setSemesterEnd] = useState('2026-05-30');
  
  const [timetable, setTimetable] = useState<WeeklyTimetable>(() => {
    const initial: WeeklyTimetable = {};
    days.forEach(day => {
      initial[day] = {};
      periods.forEach(period => {
        initial[day][period] = null;
      });
    });
    return initial;
  });

  const [currentSlot, setCurrentSlot] = useState<TimetableSlot>({
    faculty: '',
    subject: '',
    class: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, workloadRes, facultyRes, subjectsRes, timetableRes, scheduleRes] = await Promise.all([
          getDepartmentStats().catch(() => ({ data: { stats: {}, department: '' } })),
          getFacultyWorkload(),
          getFacultyList(),
          getSubjectsList(),
          getTimetable(),
          getTodaySchedule().catch(() => ({ data: { schedule: [], day: '', date: '' } }))
        ]);
        
        // Set department stats
        if (statsRes.data.stats) {
          setDepartmentStats(statsRes.data.stats);
        }
        if (statsRes.data.department) {
          setDepartment(statsRes.data.department);
        }
        
        setFacultyWorkload(workloadRes.data.workload || []);
        // Faculty list can be objects {id, name} or strings (legacy)
        const rawFaculty = facultyRes.data.faculty || [];
        const formattedFaculty = rawFaculty.map((f: any) => 
          typeof f === 'string' ? { id: '', name: f } : { id: f.id, name: f.name }
        );
        setFacultyList(formattedFaculty);
        
        // Use API data or fallback to static data
        const apiSubjects = subjectsRes.data.subjects || [];
        setSubjects(apiSubjects.length > 0 ? apiSubjects : fallbackSubjects);
        
        // Load existing timetable if available, merged with initialized structure
        if (timetableRes.data.timetable) {
          const apiTimetable = timetableRes.data.timetable;
          setTimetable(prev => {
            const merged: WeeklyTimetable = {};
            days.forEach(day => {
              merged[day] = {};
              periods.forEach(period => {
                merged[day][period] = apiTimetable[day]?.[period] ?? prev[day]?.[period] ?? null;
              });
            });
            return merged;
          });
        }

        // Load today's schedule with period statuses
        const apiSchedule = scheduleRes.data.schedule || [];
        const formattedSchedule: SchedulePeriod[] = apiSchedule
          .filter((p: any) => p.hasClass)
          .map((p: any) => ({
            period: p.period,
            subject: p.course?.name || 'No Subject',
            class: p.section ? `${p.course?.code || ''} - Section ${p.section}` : (p.course?.code || 'N/A'),
            time: `${p.startTime} - ${p.endTime}`,
            status: getPeriodStatus(p.startTime, p.endTime),
            hasClass: p.hasClass,
            courseId: p.course?._id,
          }));
        setTodaySchedule(formattedSchedule);
        setTodayInfo({ day: scheduleRes.data.day || '', date: scheduleRes.data.date || '' });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const handleSlotClick = (day: string, period: number) => {
    setSelectedDay(day);
    setSelectedTimetablePeriod(period);
    const slot = timetable[day][period];
    if (slot) {
      setCurrentSlot(slot);
    } else {
      setCurrentSlot({ faculty: '', facultyId: '', subject: '', class: '' });
    }
  };

  // View slot details in popup
  const handleViewSlotDetails = (slot: TimetableSlot, day: string, period: number) => {
    setSelectedSlotDetail({
      ...slot,
      class: `Year ${timetableYear} - Section ${timetableSection}`,
    });
    setSelectedDay(day);
    setSelectedTimetablePeriod(period);
    setShowSlotDetailDialog(true);
  };

  // Fetch timetable for specific year/section
  const fetchTimetableForClass = async (year: number, section: string) => {
    setLoadingTimetable(true);
    try {
      const res = await getTimetable({ year, section });
      if (res.data.timetable) {
        const apiTimetable = res.data.timetable;
        const merged: WeeklyTimetable = {};
        days.forEach(day => {
          merged[day] = {};
          periods.forEach(p => {
            merged[day][p] = apiTimetable[day]?.[p] ?? null;
          });
        });
        setTimetable(merged);
      }
    } catch (error) {
      console.error('Failed to fetch timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoadingTimetable(false);
    }
  };

  // Handle year/section change
  const handleYearSectionChange = (newYear: number, newSection: string) => {
    setTimetableYear(newYear);
    setTimetableSection(newSection);
    fetchTimetableForClass(newYear, newSection);
  };

  const saveSlot = async () => {
    if (!currentSlot.facultyId || !currentSlot.subject) {
      toast.error('Please fill faculty and subject');
      return;
    }

    try {
      // Use new API format with year/section
      await saveTimetableApi({ 
        year: timetableYear, 
        section: timetableSection,
        dayOfWeek: selectedDay, 
        period: selectedTimetablePeriod, 
        facultyId: currentSlot.facultyId,
        subject: currentSlot.subject,
        classroom: currentSlot.classroom,
      });
      setTimetable(prev => ({
        ...prev,
        [selectedDay]: {
          ...(prev[selectedDay] || {}),
          [selectedTimetablePeriod]: currentSlot,
        },
      }));
      toast.success('Slot saved successfully');
      setCurrentSlot({ faculty: '', facultyId: '', subject: '', class: '' });
    } catch (error: any) {
      console.error('Failed to save slot:', error);
      if (error.response?.data?.conflicts) {
        toast.error(`Conflict: ${error.response.data.conflicts[0]?.message || 'Schedule conflict detected'}`);
      } else {
        toast.error(error.response?.data?.error || 'Failed to save slot');
      }
    }
  };

  const deleteSlot = async () => {
    const slot = timetable[selectedDay]?.[selectedTimetablePeriod];
    if (!slot || !slot.id) {
      // No slot or no id, just update local state
      setTimetable(prev => ({
        ...prev,
        [selectedDay]: {
          ...(prev[selectedDay] || {}),
          [selectedTimetablePeriod]: null,
        },
      }));
      setCurrentSlot({ faculty: '', facultyId: '', subject: '', class: '' });
      toast.success('Slot deleted');
      return;
    }
    try {
      // Dynamically import to avoid circular import issues
      const { deleteTimetableEntry } = await import('../../services/hodService');
      await deleteTimetableEntry(slot.id);
      await fetchTimetableForClass(timetableYear, timetableSection);
      setCurrentSlot({ faculty: '', facultyId: '', subject: '', class: '' });
      toast.success('Slot deleted');
    } catch (error: any) {
      console.error('Failed to delete slot:', error);
      toast.error(error.response?.data?.error || 'Failed to delete slot');
    }
  };

  const saveTimetable = () => {
    if (repeatWeekly) {
      toast.success(`Timetable saved and will repeat from ${semesterStart} to ${semesterEnd}`);
    } else {
      toast.success('Timetable saved successfully');
    }
    setShowTimetableDialog(false);
  };

  const getWorkloadColor = (status: string) => {
    switch (status) {
      case 'balanced': return 'text-green-600 bg-green-100';
      case 'overloaded': return 'text-red-600 bg-red-100';
      case 'underutilized': return 'text-amber-600 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWorkloadIcon = (status: string) => {
    switch (status) {
      case 'balanced': return <CheckCircle className="w-4 h-4" />;
      case 'overloaded': return <AlertCircle className="w-4 h-4" />;
      case 'underutilized': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="HOD Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="HOD Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">HOD Dashboard</h1>
          <p className="text-gray-600">{department ? department.toUpperCase() : 'Department'}</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{departmentStats.totalStudents}</div>
              <div className="text-blue-100">Total Students</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <BookOpen className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{departmentStats.totalFaculty}</div>
              <div className="text-purple-100">Faculty Members</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <FileText className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{departmentStats.pendingLeaveRequests}</div>
              <div className="text-green-100">Pending Leaves</div>
            </Card>
          </div>

          {/* Timetable Management Button */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Class Schedule Management</h2>
                <p className="text-sm text-gray-600 mt-1">Create and manage weekly timetables for all classes</p>
              </div>
              <Dialog open={showTimetableDialog} onOpenChange={setShowTimetableDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    Manage Timetable
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Faculty Class Schedule Management</DialogTitle>
                    <DialogDescription>Create and manage weekly timetables for department classes</DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="timetable" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                      <TabsTrigger value="timetable" className="rounded-lg data-[state=active]:bg-white">Weekly Timetable</TabsTrigger>
                      <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timetable" className="space-y-4 mt-6">
                      {/* Year/Section Selector */}
                      <div className="flex flex-wrap gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-gray-700">Year:</Label>
                          <Select 
                            value={timetableYear.toString()} 
                            onValueChange={(val) => handleYearSectionChange(parseInt(val), timetableSection)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Year 1 (BE-I)</SelectItem>
                              <SelectItem value="2">Year 2 (BE-II)</SelectItem>
                              <SelectItem value="3">Year 3 (BE-III)</SelectItem>
                              <SelectItem value="4">Year 4 (BE-IV)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-gray-700">Section:</Label>
                          <Select 
                            value={timetableSection} 
                            onValueChange={(val) => handleYearSectionChange(timetableYear, val)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Section" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">Section A</SelectItem>
                              <SelectItem value="B">Section B</SelectItem>
                              <SelectItem value="C">Section C</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Badge className="bg-white text-gray-700 border">
                          Viewing: {department.toUpperCase()} - Year {timetableYear} Section {timetableSection}
                        </Badge>
                        {loadingTimetable && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                      </div>

                      {/* Timetable Grid */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-500 to-indigo-600">
                              <th className="border border-gray-300 p-3 text-white font-semibold text-sm">Period</th>
                              {days.map(day => (
                                <th key={day} className="border border-gray-300 p-3 text-white font-semibold text-sm">{day}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {periods.map(period => (
                              <tr key={period}>
                                <td className="border border-gray-300 p-2 bg-gray-100 font-semibold text-center">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto">
                                    {period}
                                  </div>
                                </td>
                                {days.map(day => {
                                  const slot = timetable[day]?.[period] ?? null;
                                  return (
                                    <td 
                                      key={`${day}-${period}`} 
                                      className="border border-gray-300 p-2 cursor-pointer hover:bg-blue-50 transition-colors"
                                      onClick={() => handleSlotClick(day, period)}
                                    >
                                      {slot ? (
                                        <div className="text-xs space-y-1 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 group relative">
                                          <div className="font-bold text-gray-900">{slot.subject}</div>
                                          <div className="text-gray-600">{slot.classroom || `Year ${timetableYear} Sec ${timetableSection}`}</div>
                                          <div className="text-gray-500 truncate">{slot.faculty}</div>
                                          <button
                                            className="absolute top-1 right-1 p-1 bg-blue-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewSlotDetails(slot, day, period);
                                            }}
                                            title="View Details"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="text-center text-gray-400 p-4">
                                          <Plus className="w-4 h-4 mx-auto" />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Slot Editor */}
                      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                        <h3 className="font-bold text-gray-900 mb-4">
                          Edit: {selectedDay} - Period {selectedTimetablePeriod}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Faculty</Label>
                            <Select 
                              value={currentSlot.facultyId || ''} 
                              onValueChange={(value) => {
                                const selectedFaculty = facultyList.find(f => f.id === value);
                                setCurrentSlot({
                                  ...currentSlot, 
                                  facultyId: value,
                                  faculty: selectedFaculty?.name || ''
                                });
                              }}
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select Faculty" />
                              </SelectTrigger>
                              <SelectContent>
                                {facultyList.map(f => (
                                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Subject</Label>
                            <Select 
                              value={currentSlot.subject} 
                              onValueChange={(value) => setCurrentSlot({...currentSlot, subject: value})}
                            >
                              <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Select Subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <Button onClick={saveSlot} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                            <Save className="w-4 h-4 mr-2" />
                            Save Slot
                          </Button>
                          <Button onClick={deleteSlot} variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50">
                            Delete Slot
                          </Button>
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6 mt-6">
                      <Card className="p-6 bg-white border-0 shadow-lg">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                            <div>
                              <h3 className="font-bold text-gray-900">Repeat Weekly Schedule</h3>
                              <p className="text-sm text-gray-600 mt-1">Apply this timetable for the entire semester</p>
                            </div>
                            <Switch checked={repeatWeekly} onCheckedChange={setRepeatWeekly} />
                          </div>

                          {repeatWeekly && (
                            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Semester Start Date</Label>
                                <Input 
                                  type="date" 
                                  value={semesterStart} 
                                  onChange={(e) => setSemesterStart(e.target.value)}
                                  className="mt-1.5"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Semester End Date</Label>
                                <Input 
                                  type="date" 
                                  value={semesterEnd} 
                                  onChange={(e) => setSemesterEnd(e.target.value)}
                                  className="mt-1.5"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowTimetableDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={saveTimetable} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Timetable
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Today's Schedule - Take Attendance */}
          {todaySchedule.length > 0 && (
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
                <Badge className="bg-blue-100 text-blue-700">
                  {todayInfo.day || new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Badge>
              </div>
              <div className="space-y-3">
                {todaySchedule.map((period, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      period.status === 'ongoing' ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50' :
                      period.status === 'completed' ? 'border-green-200 bg-green-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          period.status === 'ongoing' ? 'bg-blue-500' :
                          period.status === 'completed' ? 'bg-green-500' :
                          'bg-gray-400'
                        }`}>
                          <span className="text-white font-bold">{period.period}</span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{period.subject}</div>
                          <div className="text-sm text-gray-600">{period.class}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(period.status)}>
                          {getStatusIcon(period.status)}
                          <span className="ml-1 capitalize">{period.status}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">{period.time}</span>
                        {(period.status === 'ongoing' || period.status === 'completed') && (
                          <Button 
                            size="sm"
                            onClick={() => handleTakeAttendance(period)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Take Attendance
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Faculty Workload & Attendance Submission */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Faculty Workload</h2>
              <div className="space-y-4">
                {facultyWorkload.map((faculty, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-gray-900">{faculty.name}</div>
                        <div className="text-sm text-gray-600">
                          {faculty.courses} Courses • {faculty.students} Students • {faculty.periodsPerWeek} Periods/Week
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getWorkloadColor(faculty.status)}>
                          {getWorkloadIcon(faculty.status)}
                          <span className="ml-1 capitalize">{faculty.status}</span>
                        </Badge>
                        <div className="text-lg font-bold text-gray-900">{faculty.workload}%</div>
                      </div>
                    </div>
                    <Progress 
                      value={faculty.workload} 
                      className={`h-2 ${
                        faculty.status === 'overloaded' ? '[&>div]:bg-red-500' :
                        faculty.status === 'underutilized' ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-green-500'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Submission Status</h2>
              <div className="space-y-4">
                {facultyWorkload.map((faculty, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-gray-900">{faculty.name}</div>
                        <div className="text-sm text-gray-600">{faculty.periodsPerWeek} periods this week</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{faculty.attendanceSubmission}%</div>
                          <div className="text-xs text-gray-600">Submitted</div>
                        </div>
                        {faculty.attendanceSubmission === 100 ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : faculty.attendanceSubmission >= 80 ? (
                          <AlertCircle className="w-6 h-6 text-amber-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={faculty.attendanceSubmission} 
                      className={`h-2 ${
                        faculty.attendanceSubmission === 100 ? '[&>div]:bg-green-500' :
                        faculty.attendanceSubmission >= 80 ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>

        <MobileNav items={navItems} />
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

      {/* View Slot Details Dialog */}
      <Dialog open={showSlotDetailDialog} onOpenChange={setShowSlotDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Schedule Details
            </DialogTitle>
          </DialogHeader>
          {selectedSlotDetail && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Day</div>
                    <div className="font-semibold text-gray-900">{selectedDay}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Period</div>
                    <div className="font-semibold text-gray-900">Period {selectedTimetablePeriod}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Subject</div>
                  <div className="font-semibold text-gray-900">{selectedSlotDetail.subject}</div>
                  {selectedSlotDetail.subjectCode && (
                    <div className="text-xs text-gray-500">{selectedSlotDetail.subjectCode}</div>
                  )}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Faculty</div>
                  <div className="font-semibold text-gray-900">{selectedSlotDetail.faculty}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Class</div>
                  <div className="font-semibold text-gray-900">{selectedSlotDetail.class}</div>
                </div>
                {selectedSlotDetail.classroom && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Classroom</div>
                    <div className="font-semibold text-gray-900">{selectedSlotDetail.classroom}</div>
                  </div>
                )}
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={() => {
                  setShowSlotDetailDialog(false);
                  handleSlotClick(selectedDay, selectedTimetablePeriod);
                }}
              >
                Edit This Slot
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
