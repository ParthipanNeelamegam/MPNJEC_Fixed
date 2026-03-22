import { useState, useEffect } from 'react';
import { Search, Mail, Loader2, Filter, BookOpen, Users, FileText, Calendar } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getMyCourses, getStudentsByCourse, getDepartmentStudents } from '../../services/facultyService';
import { getNavItems, decodeToken } from '../../utils/facultyNav';
import type { FacultyUserInfo } from '../../utils/facultyNav';
import { getAccessToken } from '../../utils/token';

interface Course {
  _id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  section?: string;
}

interface Student {
  _id: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  year: number;
  section: string;
  semester: number;
  status: string;
}

export default function FacultyStudents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [userInfo, setUserInfo] = useState<FacultyUserInfo | null>(null);

  // Get user info from token
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
  }, []);

  // Fetch faculty's courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        const response = await getMyCourses();
        setCourses(response.data?.courses || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
      } finally {
        setCoursesLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch students when filters change
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const filters: { year?: number; section?: string } = {};
        if (yearFilter !== 'all') filters.year = parseInt(yearFilter);
        if (sectionFilter !== 'all') filters.section = sectionFilter;
        
        let response;
        if (selectedCourse && selectedCourse !== 'all') {
          response = await getStudentsByCourse(selectedCourse, filters);
        } else {
          response = await getDepartmentStudents(filters);
        }
        
        setStudents(response.data?.students || []);
        if (response.data?.department) {
          setDepartment(response.data.department);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedCourse, yearFilter, sectionFilter]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Students</h1>
              <p className="text-gray-600">View students enrolled in your courses</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <BookOpen className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{courses.length}</div>
              <div className="text-blue-100">My Courses</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{students.length}</div>
              <div className="text-green-100">
                {selectedCourse && selectedCourse !== 'all' ? 'Students in Course' : 'Dept Students'}
              </div>
            </Card>
            {department && (
              <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
                <FileText className="w-8 h-8 mb-3" />
                <div className="text-xl font-bold truncate">{department.toUpperCase()}</div>
                <div className="text-purple-100">Department</div>
              </Card>
            )}
            {selectedCourse && selectedCourse !== 'all' && selectedCourseData && (
              <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl">
                <Calendar className="w-8 h-8 mb-3" />
                <div className="text-xl font-bold truncate">{selectedCourseData.code}</div>
                <div className="text-amber-100">Course Code</div>
              </Card>
            )}
          </div>

          {/* Course Selection & Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={coursesLoading}>
                <SelectTrigger className="w-full md:w-72">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={coursesLoading ? "Loading courses..." : "All Courses (Department)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses (Department)</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full md:w-36">
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
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-300"
                />
              </div>
            </div>
          </Card>

          {/* Content */}
          {loading ? (
            <Card className="p-12 bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center">
              <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Loading students...</p>
            </Card>
          ) : filteredStudents.length === 0 ? (
            <Card className="p-12 bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No students match your search criteria' : 'No students found with current filters'}
              </p>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Roll No.</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Email</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Department</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Year/Sec</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Semester</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">{student.rollNumber}</td>
                          <td className="py-4 px-4 text-gray-900">{student.name}</td>
                          <td className="py-4 px-4 text-gray-600">{student.email}</td>
                          <td className="py-4 px-4">
                            <Badge className="bg-blue-100 text-blue-700">{student.department}</Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-900">{student.year}{student.section}</td>
                          <td className="py-4 px-4 text-gray-900">{student.semester}</td>
                          <td className="py-4 px-4">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => window.location.href = `mailto:${student.email}`}
                            >
                              <Mail className="w-4 h-4 text-green-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredStudents.map((student) => (
                  <Card key={student._id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900 mb-1">{student.name}</div>
                        <div className="text-sm text-gray-600">{student.rollNumber}</div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">{student.department}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Email</div>
                        <div className="text-sm font-medium text-gray-900 truncate">{student.email}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Year/Section</div>
                        <div className="font-bold text-gray-900">{student.year}{student.section}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Semester</div>
                        <div className="font-bold text-gray-900">{student.semester}</div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = `mailto:${student.email}`}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    </div>
  );
}
