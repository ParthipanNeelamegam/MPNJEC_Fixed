import { useState, useEffect } from 'react';
import { Home, Users, Calendar, BarChart3, FileText, BookOpen, TrendingUp, TrendingDown, Minus, Plus, X, Loader2, CheckCircle, UserCheck, Trash2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getDepartmentFaculty, getDepartmentCourses, createCourse, assignCoursesToFaculty, removeCourseFromFaculty, getFacultyDetails, getFacultySchedule, assignClassAdvisor, removeClassAdvisor } from '../../services/hodService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

interface Course {
  _id: string;
  code: string;
  name: string;
}

interface Faculty {
  id: string;
  userId: string;
  name: string;
  email: string;
  empId: string;
  designation: string;
  experience: number;
  assignedCourses: Course[];
  status: string;
  isClassAdvisor?: boolean;
  advisorFor?: { department: string; year: number; section: string | null } | null;
}

interface DepartmentCourse {
  id: string;
  code: string;
  name: string;
  semester: number;
  year: number;
  section: string;
}

interface FacultyDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  empId: string;
  department: string;
  designation: string;
  qualification: string;
  experience: number;
  specialization: string;
  assignedCourses: Course[];
  status: string;
  isClassAdvisor: boolean;
  advisorFor: { year: number; section: string } | null;
  secondaryDepartments: string[];
  totalPeriods: number;
  classesTaken: number;
  joinedOn: string;
}

interface ScheduleEntry {
  id: string;
  period: number;
  course: { code: string; name: string } | null;
  subject: string | null;
  year: number;
  section: string;
  classroom: string;
}

interface FacultySchedule {
  faculty: { id: string; name: string; empId: string };
  schedule: { [day: string]: ScheduleEntry[] };
  totalPeriods: number;
}

// Static fallback courses for CSE department
const fallbackCSECourses: DepartmentCourse[] = [
  { id: 'cse-001', code: 'CS101', name: 'Programming in C', semester: 1, year: 1, section: '' },
  { id: 'cse-002', code: 'CS102', name: 'Data Structures', semester: 2, year: 1, section: '' },
  { id: 'cse-003', code: 'CS201', name: 'Object Oriented Programming', semester: 3, year: 2, section: '' },
  { id: 'cse-004', code: 'CS202', name: 'Database Management Systems', semester: 4, year: 2, section: '' },
  { id: 'cse-005', code: 'CS301', name: 'Operating Systems', semester: 5, year: 3, section: '' },
  { id: 'cse-006', code: 'CS302', name: 'Computer Networks', semester: 6, year: 3, section: '' },
  { id: 'cse-007', code: 'CS401', name: 'Machine Learning', semester: 7, year: 4, section: '' },
  { id: 'cse-008', code: 'CS402', name: 'Cloud Computing', semester: 8, year: 4, section: '' },
  { id: 'cse-009', code: 'CS203', name: 'Design and Analysis of Algorithms', semester: 4, year: 2, section: '' },
  { id: 'cse-010', code: 'CS303', name: 'Software Engineering', semester: 5, year: 3, section: '' },
];

const getWorkloadStatus = (courses: number): { status: string; workload: number } => {
  // Assume 4 courses is optimal
  if (courses > 4) return { status: 'Overloaded', workload: Math.min(95, courses * 20) };
  if (courses < 2) return { status: 'Underloaded', workload: Math.max(30, courses * 25) };
  return { status: 'Balanced', workload: 70 + (courses * 5) };
};

export default function HODFaculty() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  
  // Course management state
  const [departmentCourses, setDepartmentCourses] = useState<DepartmentCourse[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCreateCourseDialog, setShowCreateCourseDialog] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [assigningCourses, setAssigningCourses] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  
  // New course form state
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    semester: '',
    year: 'auto',
    section: 'all',
    credits: '3',
  });

  // View Schedule/Details modal state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [facultyDetails, setFacultyDetails] = useState<FacultyDetails | null>(null);
  const [facultySchedule, setFacultySchedule] = useState<FacultySchedule | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Class Advisor Management state
  const [showAdvisorDialog, setShowAdvisorDialog] = useState(false);
  const [advisorYear, setAdvisorYear] = useState<string>('1');
  const [advisorSection, setAdvisorSection] = useState<string>('A');
  const [advisorFacultyId, setAdvisorFacultyId] = useState<string>('');
  const [assigningAdvisor, setAssigningAdvisor] = useState(false);
  const [removingAdvisor, setRemovingAdvisor] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facultyRes, coursesRes] = await Promise.all([
        getDepartmentFaculty(),
        getDepartmentCourses()
      ]);
      setFaculty(facultyRes.data.faculty || []);
      setDepartment(facultyRes.data.department || '');
      
      // Use API courses if available, otherwise use fallback CSE courses
      const apiCourses = coursesRes.data.courses || [];
      if (apiCourses.length > 0) {
        setDepartmentCourses(apiCourses);
      } else {
        // Use static CSE courses as fallback
        setDepartmentCourses(fallbackCSECourses);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
      // Use fallback courses on error
      setDepartmentCourses(fallbackCSECourses);
    } finally {
      setLoading(false);
    }
  };

  const openAssignDialog = (f: Faculty) => {
    setSelectedFaculty(f);
    const assignedIds = (f.assignedCourses || []).map((c: Course) => c._id);
    setSelectedCourseIds(assignedIds);
    setShowAssignDialog(true);
  };

  const handleAssignCourses = async () => {
    if (!selectedFaculty) return;
    
    // Get only newly selected courses (not already assigned)
    const existingIds = (selectedFaculty.assignedCourses || []).map((c: Course) => c._id);
    const newCourseIds = selectedCourseIds.filter(id => !existingIds.includes(id));
    
    if (newCourseIds.length === 0) {
      toast.info('No new courses to assign');
      setShowAssignDialog(false);
      return;
    }
    
    setAssigningCourses(true);
    try {
      await assignCoursesToFaculty(selectedFaculty.id, newCourseIds);
      toast.success('Courses assigned successfully');
      setShowAssignDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to assign courses:', error);
      toast.error(error.response?.data?.error || 'Failed to assign courses');
    } finally {
      setAssigningCourses(false);
    }
  };

  const handleRemoveCourse = async (facultyId: string, courseId: string) => {
    try {
      await removeCourseFromFaculty(facultyId, courseId);
      toast.success('Course removed from faculty');
      fetchData();
    } catch (error: any) {
      console.error('Failed to remove course:', error);
      toast.error(error.response?.data?.error || 'Failed to remove course');
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.code || !newCourse.name || !newCourse.semester) {
      toast.error('Code, name, and semester are required');
      return;
    }
    
    setCreatingCourse(true);
    try {
      await createCourse({
        code: newCourse.code,
        name: newCourse.name,
        semester: parseInt(newCourse.semester),
        year: newCourse.year && newCourse.year !== 'auto' ? parseInt(newCourse.year) : undefined,
        section: newCourse.section && newCourse.section !== 'all' ? newCourse.section : undefined,
        credits: parseInt(newCourse.credits),
      });
      toast.success('Course created successfully');
      setShowCreateCourseDialog(false);
      setNewCourse({ code: '', name: '', semester: '', year: 'auto', section: 'all', credits: '3' });
      fetchData();
    } catch (error: any) {
      console.error('Failed to create course:', error);
      toast.error(error.response?.data?.error || 'Failed to create course');
    } finally {
      setCreatingCourse(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const openScheduleDialog = async (f: Faculty) => {
    setShowScheduleDialog(true);
    setLoadingSchedule(true);
    setFacultySchedule(null);
    try {
      const res = await getFacultySchedule(f.id);
      setFacultySchedule(res.data);
    } catch (error: any) {
      console.error('Failed to fetch schedule:', error);
      toast.error(error.response?.data?.error || 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const openDetailsDialog = async (f: Faculty) => {
    setShowDetailsDialog(true);
    setLoadingDetails(true);
    setFacultyDetails(null);
    try {
      const res = await getFacultyDetails(f.id);
      setFacultyDetails(res.data);
    } catch (error: any) {
      console.error('Failed to fetch details:', error);
      toast.error(error.response?.data?.error || 'Failed to load details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Class Advisor handlers
  const handleAssignAdvisor = async () => {
    if (!advisorFacultyId) {
      toast.error('Please select a faculty member');
      return;
    }
    setAssigningAdvisor(true);
    try {
      await assignClassAdvisor(advisorFacultyId, parseInt(advisorYear), advisorSection || null);
      toast.success('Class Advisor assigned successfully');
      setShowAdvisorDialog(false);
      setAdvisorFacultyId('');
      fetchData();
    } catch (error: any) {
      console.error('Failed to assign advisor:', error);
      toast.error(error.response?.data?.error || 'Failed to assign class advisor');
    } finally {
      setAssigningAdvisor(false);
    }
  };

  const handleRemoveAdvisor = async (facultyId: string) => {
    setRemovingAdvisor(true);
    try {
      await removeClassAdvisor(facultyId);
      toast.success('Class Advisor removed successfully');
      fetchData();
    } catch (error: any) {
      console.error('Failed to remove advisor:', error);
      toast.error(error.response?.data?.error || 'Failed to remove class advisor');
    } finally {
      setRemovingAdvisor(false);
    }
  };

  // Get current class advisor for selected year/section
  const getCurrentAdvisor = () => {
    return faculty.find(f => 
      f.isClassAdvisor && 
      f.advisorFor?.year === parseInt(advisorYear) && 
      (f.advisorFor?.section === advisorSection || (!f.advisorFor?.section && !advisorSection))
    );
  };

  // Get faculty that can be assigned as advisors (not already advisors)
  const getAvailableFacultyForAdvisor = () => {
    return faculty.filter(f => !f.isClassAdvisor);
  };

  const balancedCount = faculty.filter(f => getWorkloadStatus(f.assignedCourses?.length || 0).status === 'Balanced').length;
  const overloadedCount = faculty.filter(f => getWorkloadStatus(f.assignedCourses?.length || 0).status === 'Overloaded').length;
  const underloadedCount = faculty.filter(f => getWorkloadStatus(f.assignedCourses?.length || 0).status === 'Underloaded').length;

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="HOD Portal" subtitle={`${department.toUpperCase()} Department`} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Faculty Management</h1>
              <p className="text-gray-600">Department faculty workload and assignments</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAdvisorDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Manage Class Advisor
              </Button>
              <Button 
                onClick={() => setShowCreateCourseDialog(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{faculty.length}</div>
              <div className="text-sm text-gray-600">Total Faculty</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{balancedCount}</div>
              <div className="text-sm text-gray-600">Balanced</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{overloadedCount}</div>
              <div className="text-sm text-gray-600">Overloaded</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <Minus className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{underloadedCount}</div>
              <div className="text-sm text-gray-600">Underloaded</div>
            </Card>
          </div>

          {/* Faculty Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading faculty...</div>
            ) : faculty.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No faculty found in department</div>
            ) : (
            faculty.map((f) => {
              const { status, workload } = getWorkloadStatus(f.assignedCourses?.length || 0);
              const courses = f.assignedCourses || [];
              return (
              <Card key={f.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{f.name}</h3>
                        <p className="text-sm text-gray-600">{f.designation || 'Faculty'} • {f.empId}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {f.isClassAdvisor && f.advisorFor && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Advisor: Year {f.advisorFor.year}{f.advisorFor.section && `-${f.advisorFor.section}`}
                      </Badge>
                    )}
                    <Badge className={
                      status === 'Balanced' ? 'bg-green-100 text-green-700' :
                      status === 'Overloaded' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {status === 'Balanced' && <TrendingUp className="w-3 h-3 mr-1" />}
                      {status === 'Overloaded' && <TrendingDown className="w-3 h-3 mr-1" />}
                      {status === 'Underloaded' && <Minus className="w-3 h-3 mr-1" />}
                      {status}
                    </Badge>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Courses</div>
                    <div className="font-bold text-gray-900">{courses.length}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Experience</div>
                    <div className="font-bold text-gray-900">{f.experience || 0} yrs</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Email</div>
                    <div className="font-bold text-gray-900 text-xs truncate">{f.email || '-'}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Workload</div>
                    <div className={`font-bold ${
                      workload >= 90 ? 'text-red-600' :
                      workload >= 75 ? 'text-green-600' :
                      'text-blue-600'
                    }`}>
                      {workload}%
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Workload Distribution</span>
                    <span className="text-sm font-bold text-gray-900">{workload}%</span>
                  </div>
                  <Progress 
                    value={workload} 
                    className={`h-2 ${
                      workload >= 90 ? '[&>div]:bg-red-500' :
                      workload >= 75 ? '[&>div]:bg-green-500' :
                      '[&>div]:bg-blue-500'
                    }`}
                  />
                </div>

                {courses.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Assigned Subjects:</div>
                  <div className="flex flex-wrap gap-2">
                    {courses.map((course, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-700 pr-1">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {course.name || course.code}
                        <button 
                          onClick={() => handleRemoveCourse(f.id, course._id)}
                          className="ml-2 p-0.5 rounded hover:bg-blue-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openAssignDialog(f)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Courses
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openScheduleDialog(f)} title="View faculty timetable for this semester">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Timetable
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openDetailsDialog(f)}>
                    <FileText className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </Card>
            );})
            )}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Assign Courses Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Assign Courses to {selectedFaculty?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            {departmentCourses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No courses available. Create a course first.</p>
              </div>
            ) : (
              departmentCourses.map((course) => {
                const isAssigned = (selectedFaculty?.assignedCourses || []).some((c: Course) => c._id === course.id);
                const isSelected = selectedCourseIds.includes(course.id);
                return (
                  <div 
                    key={course.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleCourseSelection(course.id)}
                  >
                    <Checkbox checked={isSelected} onChange={() => {}} />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{course.code} - {course.name}</div>
                      <div className="text-sm text-gray-500">
                        Semester {course.semester} • Year {course.year}
                        {course.section && ` • Section ${course.section}`}
                      </div>
                    </div>
                    {isAssigned && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Assigned
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignCourses}
              disabled={assigningCourses || departmentCourses.length === 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {assigningCourses ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Selected'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Course Dialog */}
      <Dialog open={showCreateCourseDialog} onOpenChange={setShowCreateCourseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Course</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Course Code *</Label>
                <Input
                  placeholder="CS301"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Semester *</Label>
                <Select value={newCourse.semester} onValueChange={(v) => setNewCourse({ ...newCourse, semester: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Course Name *</Label>
              <Input
                placeholder="Data Structures"
                value={newCourse.name}
                onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Year</Label>
                <Select value={newCourse.year} onValueChange={(v) => setNewCourse({ ...newCourse, year: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    {[1, 2, 3, 4].map(yr => (
                      <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select value={newCourse.section} onValueChange={(v) => setNewCourse({ ...newCourse, section: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credits</Label>
                <Input
                  type="number"
                  value={newCourse.credits}
                  onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                  className="mt-1.5"
                  min={1}
                  max={6}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCourseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCourse}
              disabled={creatingCourse}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {creatingCourse ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              <Calendar className="w-5 h-5 inline mr-2" />
              Schedule - {facultySchedule?.faculty?.name || 'Loading...'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingSchedule ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading schedule...</span>
            </div>
          ) : facultySchedule ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 text-blue-700">
                  {facultySchedule.faculty.empId}
                </Badge>
                <Badge className="bg-green-100 text-green-700">
                  {facultySchedule.totalPeriods} periods/week
                </Badge>
              </div>
              
              {facultySchedule.totalPeriods === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No schedule entries found for this faculty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                    const dayEntries = facultySchedule.schedule[day] || [];
                    if (dayEntries.length === 0) return null;
                    return (
                      <div key={day} className="border rounded-lg p-3">
                        <div className="font-semibold text-gray-800 mb-2">{day}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {dayEntries.sort((a, b) => a.period - b.period).map(entry => (
                            <div key={entry.id} className="bg-gray-50 rounded-lg p-2 text-sm">
                              <div className="font-medium text-blue-600">Period {entry.period}</div>
                              <div className="text-gray-700">{entry.course?.code || entry.subject || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{entry.course?.name || entry.subject || 'N/A'}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Year {entry.year} {entry.section && `- ${entry.section}`}
                              </div>
                              <div className="text-xs text-gray-400">Room: {entry.classroom || 'TBD'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Failed to load schedule</div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              <FileText className="w-5 h-5 inline mr-2" />
              Faculty Details
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading details...</span>
            </div>
          ) : facultyDetails ? (
            <div className="py-4 space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {facultyDetails.name?.charAt(0) || 'F'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{facultyDetails.name}</h3>
                  <p className="text-gray-600">{facultyDetails.designation}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-blue-100 text-blue-700">{facultyDetails.empId}</Badge>
                    <Badge className={facultyDetails.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {facultyDetails.status}
                    </Badge>
                    {facultyDetails.isClassAdvisor && (
                      <Badge className="bg-purple-100 text-purple-700">Class Advisor</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="font-medium text-gray-900 text-sm">{facultyDetails.email}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="font-medium text-gray-900 text-sm">{facultyDetails.phone}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Department</div>
                  <div className="font-medium text-gray-900 text-sm">{facultyDetails.department}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Experience</div>
                  <div className="font-medium text-gray-900 text-sm">{facultyDetails.experience} years</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Qualification</div>
                  <div className="font-medium text-gray-900 text-sm">{facultyDetails.qualification}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500">Specialization</div>
                  <div className="font-medium text-gray-900 text-sm">{facultyDetails.specialization}</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">{facultyDetails.totalPeriods}</div>
                  <div className="text-sm text-gray-600">Scheduled Periods</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-600">{facultyDetails.classesTaken}</div>
                  <div className="text-sm text-gray-600">Classes Taken</div>
                </div>
              </div>

              {/* Class Advisor Info */}
              {facultyDetails.isClassAdvisor && facultyDetails.advisorFor && (
                <div className="p-3 bg-purple-50 rounded-xl">
                  <div className="text-sm font-medium text-purple-700">Class Advisor For:</div>
                  <div className="text-gray-700">
                    Year {facultyDetails.advisorFor.year}{facultyDetails.advisorFor.section && ` - Section ${facultyDetails.advisorFor.section}`}
                  </div>
                </div>
              )}

              {/* Assigned Courses */}
              {facultyDetails.assignedCourses?.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Assigned Courses ({facultyDetails.assignedCourses.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {facultyDetails.assignedCourses.map((course, idx) => (
                      <Badge key={idx} className="bg-blue-100 text-blue-700">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {course.code} - {course.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Departments */}
              {facultyDetails.secondaryDepartments?.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Secondary Departments:</div>
                  <div className="flex flex-wrap gap-2">
                    {facultyDetails.secondaryDepartments.map((dept, idx) => (
                      <Badge key={idx} className="bg-gray-100 text-gray-700">{dept}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Joined Date */}
              <div className="text-xs text-gray-400 pt-2 border-t">
                Joined: {facultyDetails.joinedOn ? new Date(facultyDetails.joinedOn).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Failed to load details</div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Advisor Management Dialog */}
      <Dialog open={showAdvisorDialog} onOpenChange={setShowAdvisorDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              Manage Class Advisor
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Year Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Year</Label>
              <Select value={advisorYear} onValueChange={setAdvisorYear}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Year 1 (BE-I)</SelectItem>
                  <SelectItem value="2">Year 2 (BE-II)</SelectItem>
                  <SelectItem value="3">Year 3 (BE-III)</SelectItem>
                  <SelectItem value="4">Year 4 (BE-IV)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Section</Label>
              <Select value={advisorSection} onValueChange={setAdvisorSection}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Advisor Display */}
            {(() => {
              const currentAdvisor = getCurrentAdvisor();
              if (currentAdvisor) {
                return (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-sm font-medium text-purple-700 mb-2">Current Class Advisor:</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{currentAdvisor.name}</div>
                        <div className="text-sm text-gray-600">{currentAdvisor.empId}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleRemoveAdvisor(currentAdvisor.id)}
                        disabled={removingAdvisor}
                      >
                        {removingAdvisor ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-sm text-gray-500 text-center">
                      No advisor assigned for Year {advisorYear} - Section {advisorSection}
                    </div>
                  </div>
                );
              }
            })()}

            {/* Faculty Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Assign Faculty as Advisor</Label>
              <Select value={advisorFacultyId} onValueChange={setAdvisorFacultyId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select Faculty" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableFacultyForAdvisor().length === 0 ? (
                    <SelectItem value="" disabled>All faculty are already advisors</SelectItem>
                  ) : (
                    getAvailableFacultyForAdvisor().map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.empId})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Only faculty not already assigned as advisor can be selected
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvisorDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignAdvisor}
              disabled={!advisorFacultyId || assigningAdvisor}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {assigningAdvisor ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Advisor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}