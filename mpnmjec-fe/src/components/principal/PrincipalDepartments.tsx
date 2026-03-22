import { useState, useEffect } from 'react';
import { Home, Bell, FileText, Building2, Trophy, Users, TrendingUp, Award, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getDepartments } from '../../services/principalService';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  hod: string;
  students: number;
  faculty: number;
  performance: number;
  color: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: Bell, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: FileText, label: 'Reports', path: '/principal/reports' },
  { icon: Building2, label: 'Departments', path: '/principal/departments' },
  { icon: Trophy, label: 'Achievements', path: '/principal/achievements' },
];

export default function PrincipalDepartments() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await getDepartments();
        setDepartments(response.data.departments || []);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Failed to load departments');
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const totalStudents = departments.reduce((sum, d) => sum + d.students, 0);
  const totalFaculty = departments.reduce((sum, d) => sum + d.faculty, 0);
  const avgPerformance = departments.length > 0 
    ? Math.round(departments.reduce((sum, d) => sum + d.performance, 0) / departments.length) 
    : 0;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Principal Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Principal Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Departments Overview</h1>
          <p className="text-gray-600">Monitor department performance and metrics</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-xl">
              <Building2 className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{departments.length}</div>
              <div className="text-indigo-100">Departments</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{totalStudents}</div>
              <div className="text-blue-100">Total Students</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{totalFaculty}</div>
              <div className="text-purple-100">Total Faculty</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{avgPerformance}%</div>
              <div className="text-green-100">Avg Performance</div>
            </Card>
          </div>

          <div className="space-y-4">
            {departments.map((dept) => (
              <Card key={dept.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${dept.color} rounded-2xl flex items-center justify-center`}>
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{dept.name}</h3>
                    <p className="text-sm text-gray-600">Head: {dept.hod}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Students</div>
                    <div className="text-2xl font-bold text-gray-900">{dept.students}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Faculty</div>
                    <div className="text-2xl font-bold text-gray-900">{dept.faculty}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Student:Faculty</div>
                    <div className="text-2xl font-bold text-gray-900">{Math.round(dept.students / dept.faculty)}:1</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Performance</div>
                    <div className="text-2xl font-bold text-green-600">{dept.performance}%</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Overall Performance</span>
                    <span className="text-sm font-bold text-gray-900">{dept.performance}%</span>
                  </div>
                  <Progress value={dept.performance} className="h-2" />
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}
