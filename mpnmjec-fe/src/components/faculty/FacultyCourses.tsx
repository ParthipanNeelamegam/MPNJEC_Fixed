import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2, BookOpen, Users, GraduationCap, FileText, Calendar } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getMyCourses } from '../../services/facultyService';
import { toast } from 'sonner';
import { getNavItems, decodeToken } from '../../utils/facultyNav';
import type { FacultyUserInfo } from '../../utils/facultyNav';
import { getAccessToken } from '../../utils/token';

interface Course {
  _id: string;
  code: string;
  name: string;
  class: string;
  semester: number;
  students: number;
  credits: number;
  hours: number;
  syllabus: number;
  color: string;
}

export default function FacultyCourses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userInfo, setUserInfo] = useState<FacultyUserInfo | null>(null);

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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await getMyCourses();
        setCourses(response.data.courses || []);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        toast.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600">Manage your assigned courses and subjects</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{courses.length}</div>
              <div className="text-sm text-gray-600">Total Courses</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{courses.reduce((sum, c) => sum + c.students, 0)}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{courses.reduce((sum, c) => sum + c.credits, 0)}</div>
              <div className="text-sm text-gray-600">Total Credits</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{courses.reduce((sum, c) => sum + c.hours, 0)}</div>
              <div className="text-sm text-gray-600">Hours/Week</div>
            </Card>
          </div>

          {/* Course Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course, index) => (
              <Card key={index} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-12 h-12 bg-gradient-to-br ${course.color} rounded-xl flex items-center justify-center`}>
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{course.name}</h3>
                        <p className="text-sm text-gray-600">{course.code}</p>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">{course.class}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Semester</div>
                    <div className="font-bold text-gray-900">{course.semester}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Students</div>
                    <div className="font-bold text-gray-900">{course.students}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Credits</div>
                    <div className="font-bold text-gray-900">{course.credits}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Hours/Week</div>
                    <div className="font-bold text-gray-900">{course.hours}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Syllabus Coverage</span>
                    <span className="text-sm font-bold text-gray-900">{course.syllabus}%</span>
                  </div>
                  <Progress value={course.syllabus} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => navigate('/faculty/materials')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Materials
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/faculty/attendance?courseId=${course._id}`)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Attendance
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    </div>
  );
}
