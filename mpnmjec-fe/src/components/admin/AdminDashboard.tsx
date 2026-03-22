import { useState, useEffect } from 'react';
import { Home, Users, DollarSign, FileText, Award, TrendingUp, UserPlus, UserCog, Crown, BookOpen, Loader2, Library } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import AddStudentDialog from './AddStudentDialog';
import AddFacultyDialog from './AddFacultyDialog';
import AddHODDialog from './AddHODDialog';
import AddPrincipalDialog from './AddPrincipalDialog';
import AddLibrarianDialog from './AddLibrarianDialog';
import { getDashboardStats, getDashboardChartData } from '../../services/adminService';
import { toast } from 'sonner';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Students', path: '/admin/students' },
  { icon: BookOpen, label: 'Faculty', path: '/admin/faculty' },
  { icon: UserCog, label: 'HOD', path: '/admin/hod' },
  { icon: Crown, label: 'Principal', path: '/admin/principal' },
  { icon: Library, label: 'Librarian', path: '/admin/librarian' },
  { icon: DollarSign, label: 'Fees', path: '/admin/fees' },
  { icon: Award, label: 'Certificates', path: '/admin/certificates' },
];

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalFaculty: number;
  activeFaculty: number;
  totalHODs: number;
  totalCourses: number;
  pendingLeaves: number;
  pendingCertificates: number;
}

interface ChartDataItem {
  department: string;
  students: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, chartRes] = await Promise.all([
          getDashboardStats(),
          getDashboardChartData(),
        ]);
        setStats(statsRes.data?.stats || null);
        setChartData(
          statsRes.data?.departmentStats?.map((d: { _id: string; count: number }) => ({
            department: d._id?.toUpperCase() || 'Unknown',
            students: d.count,
          })) || 
          chartRes.data?.departmentDistribution || []
        );
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statCards = [
    { title: 'Total Students', value: stats?.totalStudents?.toLocaleString() || '0', color: 'from-blue-500 to-indigo-600', icon: Users },
    { title: 'Faculty Members', value: stats?.totalFaculty?.toString() || '0', color: 'from-purple-500 to-pink-600', icon: Users },
    { title: 'Total HODs', value: stats?.totalHODs?.toString() || '0', color: 'from-green-500 to-emerald-600', icon: UserCog },
    { title: 'Pending Approvals', value: ((stats?.pendingLeaves || 0) + (stats?.pendingCertificates || 0)).toString(), color: 'from-amber-500 to-orange-600', icon: FileText },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Central Management System</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
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

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Department-wise Students</h2>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="students" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No data available
                    </div>
                  )}
                </Card>

                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <AddStudentDialog
                      trigger={
                        <Button className="h-20 flex-col bg-gradient-to-br from-blue-500 to-indigo-600 w-full">
                          <UserPlus className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add Student</span>
                        </Button>
                      }
                    />
                    <AddFacultyDialog
                      trigger={
                        <Button className="h-20 flex-col bg-gradient-to-br from-purple-500 to-pink-600 w-full">
                          <UserPlus className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add Faculty</span>
                        </Button>
                      }
                    />
                    <AddHODDialog
                      trigger={
                        <Button className="h-20 flex-col bg-gradient-to-br from-orange-500 to-red-600 w-full">
                          <UserCog className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add HOD</span>
                        </Button>
                      }
                    />
                    <AddPrincipalDialog
                      trigger={
                        <Button className="h-20 flex-col bg-gradient-to-br from-indigo-500 to-purple-600 w-full">
                          <Crown className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add Principal</span>
                        </Button>
                      }
                    />
                    <AddLibrarianDialog
                      trigger={
                        <Button className="h-20 flex-col bg-gradient-to-br from-teal-500 to-cyan-600 w-full">
                          <Library className="w-6 h-6 mb-1" />
                          <span className="text-xs">Add Librarian</span>
                        </Button>
                      }
                    />
                    <Button className="h-20 flex-col bg-gradient-to-br from-green-500 to-emerald-600">
                      <Award className="w-6 h-6 mb-1" />
                      <span className="text-xs">Approve Certificates</span>
                    </Button>
                    <Button className="h-20 flex-col bg-gradient-to-br from-cyan-500 to-teal-600">
                      <TrendingUp className="w-6 h-6 mb-1" />
                      <span className="text-xs">View Analytics</span>
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}
