import { useState, useEffect } from 'react';
import { Home, Users, TrendingUp, Award, FileCheck, Building, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getDashboardStats, getApprovalsSummary } from '../../services/principalService';
import { toast } from 'sonner';

interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  pendingApprovals: number;
}

interface PendingApproval {
  type: string;
  count: number;
  priority: string;
}

interface DepartmentPerformance {
  name: string;
  rating: string;
  students?: number;
  faculty?: number;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: FileCheck, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: TrendingUp, label: 'Reports', path: '/principal/reports' },
  { icon: Building, label: 'Departments', path: '/principal/departments' },
  { icon: Award, label: 'Achievements', path: '/principal/achievements' },
];

export default function PrincipalDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalFaculty: 0,
    totalDepartments: 0,
    pendingApprovals: 0
  });
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformance[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, approvalsRes] = await Promise.all([
          getDashboardStats(),
          getApprovalsSummary()
        ]);
        setStats({
          totalStudents: statsRes.data.stats?.totalStudents || 0,
          totalFaculty: statsRes.data.stats?.totalFaculty || 0,
          totalDepartments: statsRes.data.stats?.totalHODs || statsRes.data.departmentStats?.length || 0,
          pendingApprovals: (statsRes.data.stats?.pendingLeaves || 0) + (statsRes.data.stats?.pendingCertificates || 0),
        });
        setPendingApprovals(approvalsRes.data.approvals || []);
        // Backend returns departmentStats not departmentPerformance
        const deptStats = statsRes.data.departmentStats || [];
        setDepartmentPerformance(deptStats.map((d: any) => ({
          name: d.department || d.name || '-',
          rating: d.students > 50 ? 'Good' : d.students > 20 ? 'Average' : 'Developing',
          students: d.students || 0,
          faculty: d.faculty || 0,
        })));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Principal Dashboard</h1>
          <p className="text-gray-600">Executive Management Overview</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{stats.totalStudents.toLocaleString()}</div>
              <div className="text-blue-100">Total Students</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{stats.totalFaculty}</div>
              <div className="text-purple-100">Faculty Members</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <Building className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{stats.totalDepartments}</div>
              <div className="text-green-100">Departments</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <FileCheck className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
              <div className="text-amber-100">Pending Approvals</div>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Approvals</h2>
              <div className="space-y-3">
                {pendingApprovals.map((approval, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{approval.type}</div>
                      <div className="text-sm text-gray-600">{approval.count} pending</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={approval.priority === 'high' ? 'destructive' : 'default'}>
                        {approval.priority}
                      </Badge>
                      <Button size="sm">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Department Performance</h2>
              <div className="space-y-3">
                {departmentPerformance.length > 0 ? departmentPerformance.map((dept, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{dept.name}</span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {dept.students} students · {dept.faculty} faculty
                        </div>
                      </div>
                      <Badge className={
                        dept.rating === 'Good' ? 'bg-green-100 text-green-700' :
                        dept.rating === 'Average' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }>{dept.rating}</Badge>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-400 text-center py-4">No department data available</p>
                )}
              </div>
            </Card>
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}