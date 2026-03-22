import { Home, User, BookOpen, Calendar, DollarSign, TrendingUp, Award, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { useEffect, useState } from "react";
import { fetchStudentAcademics } from '../../services/studentModuleService';
import { toast } from 'sonner';

interface Subject {
  code: string;
  name: string;
  credits: number;
  internal: number;
  external: number;
  total: number;
  grade: string;
  points: number;
}

interface SemesterData {
  semester: number;
  gpa: number;
  cgpa: number;
  credits: number;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

export default function StudentAcademics() { 
  const [loading, setLoading] = useState(true);
  const [academics, setAcademics] = useState<any>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesterData, setSemesterData] = useState<SemesterData[]>([]);

  useEffect(() => {
    fetchStudentAcademics()
      .then((res: any) => {
        const data = res.data;
        setAcademics(data);

        // Backend returns bySemester: { [semNum]: Subject[] }
        const bySemester: Record<string, any[]> = data.bySemester || {};
        const semKeys = Object.keys(bySemester).map(Number).filter(n => !isNaN(n));

        // Build semester history array
        const semesterArr: SemesterData[] = semKeys.sort((a, b) => a - b).map(sem => ({
          semester: sem,
          gpa: 0, // computed below from subjects if needed
          cgpa: data.cgpa || 0,
          credits: data.credits || 0,
        }));
        setSemesterData(semesterArr);

        // Show subjects from the latest (highest) semester
        if (semKeys.length > 0) {
          const lastSem = Math.max(...semKeys);
          const raw: any[] = bySemester[lastSem] || [];
          setSubjects(raw.map((m: any) => ({
            code: m.courseCode || '-',
            name: m.courseName || '-',
            credits: 3,
            internal: Math.round(((m.internal1 || 0) + (m.internal2 || 0)) / 2),
            external: m.finalExam || 0,
            total: m.total || 0,
            grade: m.grade || '-',
            points: m.total ? m.total / 10 : 0,
          })));
        } else {
          // Fallback to old shape if present
          setSubjects(data.subjects || []);
        }

        setLoading(false);
      })
      .catch((err: { response?: { data?: { error?: string } } }) => {
        toast.error(err.response?.data?.error || "Failed to fetch academics");
        setLoading(false);
      });
  }, []);

  // Calculate values from data 
  const currentSemGPA = academics?.currentGPA || (semesterData.length > 0 ? semesterData[semesterData.length - 1]?.gpa : 0);
  const overallCGPA = academics?.cgpa || (semesterData.length > 0 ? semesterData[semesterData.length - 1]?.cgpa : 0);
  const totalCredits = academics?.credits || semesterData.reduce((sum, sem) => sum + sem.credits, 0);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Academic Performance</h1>
          <p className="text-gray-600">Track your grades and academic progress</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* GPA Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8" />
                <Badge className="bg-white/20 text-white border-0">Current</Badge>
              </div>
              <div className="text-4xl font-bold mb-1">{currentSemGPA.toFixed(2)}</div>
              <div className="text-blue-100">Semester GPA</div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: `${(currentSemGPA/10) * 100}%` }}></div>
                </div>
                <span className="text-sm">/ 10</span>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8" />
                <Badge className="bg-white/20 text-white border-0">Overall</Badge>
              </div>
              <div className="text-4xl font-bold mb-1">{overallCGPA.toFixed(2)}</div>
              <div className="text-purple-100">Cumulative CGPA</div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: `${(overallCGPA/10) * 100}%` }}></div>
                </div>
                <span className="text-sm">/ 10</span>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="w-8 h-8" />
                <Badge className="bg-white/20 text-white border-0">Total</Badge>
              </div>
              <div className="text-4xl font-bold mb-1">{totalCredits}</div>
              <div className="text-green-100">Credits Earned</div>
              <p className="text-sm text-green-100 mt-2">Out of 160 total credits</p>
            </Card>
          </div>

          <Tabs defaultValue="current" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
              <TabsTrigger value="current" className="rounded-lg data-[state=active]:bg-white">Current Semester</TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white">Academic History</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Semester 5 - Marks & Grades</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Code</th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Subject</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Credits</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Internal</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">External</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Total</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                          <td className="py-4 px-2 font-mono text-sm text-gray-600">{subject.code}</td>
                          <td className="py-4 px-2 font-medium text-gray-900">{subject.name}</td>
                          <td className="py-4 px-2 text-center text-gray-700">{subject.credits}</td>
                          <td className="py-4 px-2 text-center font-semibold text-gray-900">{subject.internal}/50</td>
                          <td className="py-4 px-2 text-center font-semibold text-gray-900">{subject.external}/100</td>
                          <td className="py-4 px-2 text-center font-bold text-gray-900">{subject.total}/150</td>
                          <td className="py-4 px-2 text-center">
                            <Badge className={
                              subject.grade === 'O' ? 'bg-green-100 text-green-700' :
                              subject.grade === 'A+' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {subject.grade}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Semester-wise Performance</h2>
                <div className="space-y-4">
                  {semesterData.map((sem, index) => (
                    <div key={index} className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Semester {sem.semester}</h3>
                        <Badge className="bg-blue-100 text-blue-700">{sem.credits} Credits</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Semester GPA</p>
                          <div className="flex items-center gap-3">
                            <Progress value={(sem.gpa/10) * 100} className="flex-1" />
                            <span className="text-2xl font-bold text-gray-900">{sem.gpa}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Cumulative CGPA</p>
                          <div className="flex items-center gap-3">
                            <Progress value={(sem.cgpa/10) * 100} className="flex-1" />
                            <span className="text-2xl font-bold text-purple-600">{sem.cgpa}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}