import { Home, User, BookOpen, Calendar, DollarSign, Award, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  fetchStudentDashboardSummary,
  fetchStudentPerformance,
  requestBonafideCertificate
} from '../../services/studentDashboardService';
import { Card } from '../ui/card';
// import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

export default function StudentDashboard() {
  const navigate = useNavigate();

  // State
  type Profile = {
    _id: string;
    name: string;
    email: string;
    role?: string;
    isActive?: boolean;
    rollNumber?: string;
    department?: string;
    year?: number;
    section?: string;
    semester?: number;
  };
  type Metrics = {
    attendancePercentage: number;
    pendingFees: number;
    currentCGPA: number;
    pendingCertificates: number;
  };
  type Notification = {
    title: string;
    message: string;
    time: string;
    type: string;
  };
  type SubjectPerformance = {
    subject: string;
    marks: number;
    total: number;
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState<boolean>(true);
  const [notifError, setNotifError] = useState<string | null>(null);

  const [performance, setPerformance] = useState<SubjectPerformance[]>([]);
  const [perfLoading, setPerfLoading] = useState<boolean>(true);
  const [perfError, setPerfError] = useState<string | null>(null);

  // Default metrics when data is not available
  const defaultMetrics: Metrics = {
    attendancePercentage: 0,
    pendingFees: 0,
    currentCGPA: 0,
    pendingCertificates: 0,
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setStatsLoading(true);
      try {
        const res = await fetchStudentDashboardSummary();
        if (res.data.profile) {
          setProfile(res.data.profile);
        } else {
          setStatsError('Unable to load profile');
        }
        // Map backend field names to frontend interface
        const raw = res.data.metrics;
        if (raw) {
          setMetrics({
            attendancePercentage: raw.attendancePercentage ?? 0,
            pendingFees: raw.pendingFees ?? 0,
            currentCGPA: raw.currentCGPA ?? raw.cgpa ?? 0,
            pendingCertificates: raw.pendingCertificates ?? 0,
          });
        }
        // Use notifications from the summary response instead of separate endpoint
        const notifs = res.data.notifications || [];
        setNotifications(notifs.map((n: any) => ({
          title: n.title || 'Notification',
          message: n.message || '',
          time: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN') : '',
          type: n.type || 'info',
        })));
        setNotifLoading(false);
        if (!notifs.length) setNotifError('No notifications');
      } catch {
        setStatsError('Failed to load dashboard summary');
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchPerformance = async () => {
      setPerfLoading(true);
      try {
        const res = await fetchStudentPerformance();
        setPerformance(res.data.subjects || []);
        if (!res.data.subjects?.length) {
          setPerfError(res.data.message || 'No performance data');
        }
      } catch {
        setPerfError('No performance data available');
      } finally {
        setPerfLoading(false);
      }
    };

    // Fetch dashboard (includes notifications) + performance in parallel
    Promise.all([fetchDashboardData(), fetchPerformance()]);
  }, []);

  // Use actual metrics or defaults for display
  const displayMetrics = metrics || defaultMetrics;

  // Quick Actions
  const quickActions = [
    { label: 'Pay Fees', icon: DollarSign, action: () => navigate('/student/fees'), gradient: 'from-green-500 to-emerald-600' },
    { label: 'Request Bonafide', icon: Award, action: async () => { await requestBonafideCertificate(); }, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'View Marks', icon: BookOpen, action: () => navigate('/student/academics'), gradient: 'from-purple-500 to-pink-600' },
    { label: 'Attendance', icon: Calendar, action: () => navigate('/student/attendance'), gradient: 'from-orange-500 to-red-600' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              {statsLoading ? (
                <div className="h-8 w-48 bg-gray-100 animate-pulse rounded" />
              ) : profile ? (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">வணக்கம், {profile.name}</h1>
                  <p className="text-gray-600 text-sm md:text-base">
                    {profile.rollNumber ? `Roll No: ${profile.rollNumber}` : profile.email}
                    {profile.department ? ` | ${profile.department.toUpperCase()}` : ''}
                    {profile.semester ? ` | Semester ${profile.semester}` : ''}
                  </p>
                </>
              ) : (
                <span className="text-red-500">{statsError}</span>
              )}
            </div>
            <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statsLoading ? (
              Array(4).fill(0).map((_, idx) => (
                <Card key={idx} className="p-4 bg-gray-100 animate-pulse border-0" />
              ))
            ) : profile ? (
              [
                {
                  title: 'Attendance',
                  value: `${displayMetrics.attendancePercentage}%`,
                  subtitle: 'Overall',
                  color: 'from-green-500 to-emerald-600',
                  icon: Calendar,
                  status: displayMetrics.attendancePercentage < 75 ? 'warning' : 'good'
                },
                {
                  title: 'Fees Status',
                  value: `₹${displayMetrics.pendingFees}`,
                  subtitle: 'Pending',
                  color: 'from-amber-500 to-orange-600',
                  icon: DollarSign,
                  status: displayMetrics.pendingFees > 0 ? 'warning' : 'good'
                },
                {
                  title: 'CGPA',
                  value: displayMetrics.currentCGPA,
                  subtitle: 'Current Sem',
                  color: 'from-blue-500 to-indigo-600',
                  icon: BookOpen,
                  status: 'good'
                },
                {
                  title: 'Certificates',
                  value: displayMetrics.pendingCertificates,
                  subtitle: 'Pending',
                  color: 'from-purple-500 to-pink-600',
                  icon: Award,
                  status: displayMetrics.pendingCertificates > 0 ? 'neutral' : 'good'
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {stat.status === 'warning' && (
                        <Badge variant="destructive" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.subtitle}</div>
                  </Card>
                );
              })
            ) : (
              <span className="text-red-500">{statsError}</span>
            )}
          </div>
          {/* Quick Actions */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all group"
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 text-center">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Notifications */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Notifications</h2>
              <div className="space-y-3">
                {notifLoading ? (
                  <div className="h-6 w-64 bg-gray-100 animate-pulse rounded mb-2" />
                ) : notifError ? (
                  <span className="text-red-500">{notifError}</span>
                ) : notifications.length === 0 ? (
                  <span className="text-gray-500">No notifications found.</span>
                ) : notifications.map((notif, index) => (
                  <div key={index} className={`p-4 rounded-xl border-l-4 ${
                    notif.type === 'warning' ? 'border-amber-500 bg-amber-50' :
                    notif.type === 'error' ? 'border-red-500 bg-red-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{notif.title}</h3>
                        <p className="text-gray-600 text-xs mt-1">{notif.message}</p>
                      </div>
                      <span className="text-xs text-gray-500">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            {/* Academic Performance */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Semester Performance</h2>
              <div className="space-y-4">
                {perfLoading ? (
                  <div className="h-6 w-64 bg-gray-100 animate-pulse rounded mb-2" />
                ) : perfError ? (
                  <span className="text-red-500">{perfError}</span>
                ) : performance.length === 0 ? (
                  <span className="text-gray-500">No performance data found.</span>
                ) : performance.map((subject, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
                      <span className="text-sm font-bold text-gray-900">{subject.marks}/{subject.total}</span>
                    </div>
                    <Progress value={(subject.marks / subject.total) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>
        <MobileNav items={navItems} />
      </div>
    </div>
  );
}