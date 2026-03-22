import { useState, useEffect } from 'react';
import { Home, Users, Calendar, BarChart3, FileText, TrendingUp, TrendingDown, Award, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAttendanceAnalytics, getPerformanceAnalytics, getWorkloadAnalytics, getSubjectAnalytics } from '../../services/hodService';
import { toast } from 'sonner';

interface AttendanceData {
  month: string;
  attendance: number;
}

interface PerformanceData {
  year: string;
  cgpa: number;
}

interface WorkloadData {
  name: string;
  value: number;
  color: string;
}

interface SubjectPerformance {
  subject: string;
  pass: number;
  fail: number;
}

interface KeyMetrics {
  avgCgpa: number;
  avgAttendance: number;
  passPercentage: number;
  placementRate: number;
  cgpaChange: number;
  attendanceChange: number;
  passChange: number;
  placementChange: number;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

export default function HODAnalytics() {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [metrics, setMetrics] = useState<KeyMetrics>({
    avgCgpa: 0,
    avgAttendance: 0,
    passPercentage: 0,
    placementRate: 0,
    cgpaChange: 0,
    attendanceChange: 0,
    passChange: 0,
    placementChange: 0
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [attendanceRes, performanceRes, workloadRes, subjectRes] = await Promise.all([
          getAttendanceAnalytics(),
          getPerformanceAnalytics(),
          getWorkloadAnalytics(),
          getSubjectAnalytics()
        ]);
        setAttendanceData(attendanceRes.data.attendanceData || []);

        // Performance data - backend returns {year, avgCgpa, students} not {year, cgpa}
        const rawPerf = performanceRes.data.performanceData || [];
        setPerformanceData(rawPerf.map((d: any) => ({
          year: d.year || `Year ${d._id}`,
          cgpa: d.avgCgpa || d.cgpa || 0,
          students: d.students || 0,
        })));

        // Compute metrics from performance data
        if (rawPerf.length > 0) {
          const totalStudents = rawPerf.reduce((s: number, d: any) => s + (d.students || 0), 0);
          const weightedCgpa = rawPerf.reduce((s: number, d: any) => s + (d.avgCgpa || 0) * (d.students || 0), 0);
          const avgCgpa = totalStudents > 0 ? weightedCgpa / totalStudents : 0;
          setMetrics(prev => ({ ...prev, avgCgpa: parseFloat(avgCgpa.toFixed(2)) }));
        }

        // Workload data - backend returns {name, courses, credits} not {name, value, color}
        const rawWorkload = workloadRes.data.workloadCategories || [];
        const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
        setWorkloadData(rawWorkload.map((w: any, i: number) => ({
          name: w.category || w.name || `Group ${i+1}`,
          value: w.count || w.value || 0,
          color: COLORS[i % COLORS.length],
        })));

        // Subject data - backend returns {code, name, semester, attendance} not {subject, pass, fail}
        const rawSubjects = subjectRes.data.subjectData || [];
        setSubjectPerformance(rawSubjects.map((s: any) => ({
          subject: s.code ? `${s.code} - ${s.name}` : (s.name || s.subject || 'Unknown'),
          pass: s.attendance || s.pass || 0,
          fail: s.attendance != null ? Math.max(0, 100 - s.attendance) : (s.fail || 0),
        })));

        // Attendance average for metrics
        const attData = attendanceRes.data.attendanceData || [];
        if (attData.length > 0) {
          const avg = attData.reduce((s: number, d: any) => s + (d.attendance || 0), 0) / attData.length;
          setMetrics(prev => ({ ...prev, avgAttendance: Math.round(avg) }));
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="HOD Portal" subtitle="CSE Department" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="HOD Portal" subtitle="CSE Department" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Department Analytics</h1>
          <p className="text-gray-600">Performance metrics and insights</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-3">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.avgCgpa.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Department CGPA</div>
              <div className={`flex items-center gap-1 mt-2 text-xs ${metrics.cgpaChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.cgpaChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{metrics.cgpaChange >= 0 ? '+' : ''}{metrics.cgpaChange.toFixed(1)} from last sem</span>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.avgAttendance}%</div>
              <div className="text-sm text-gray-600">Avg Attendance</div>
              <div className={`flex items-center gap-1 mt-2 text-xs ${metrics.attendanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.attendanceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{metrics.attendanceChange >= 0 ? '+' : ''}{metrics.attendanceChange}% from last month</span>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.passPercentage}%</div>
              <div className="text-sm text-gray-600">Pass Percentage</div>
              <div className={`flex items-center gap-1 mt-2 text-xs ${metrics.passChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.passChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{metrics.passChange >= 0 ? '+' : ''}{metrics.passChange}% from last sem</span>
              </div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.placementRate}%</div>
              <div className="text-sm text-gray-600">Placement Rate</div>
              <div className={`flex items-center gap-1 mt-2 text-xs ${metrics.placementChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.placementChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{metrics.placementChange >= 0 ? '+' : ''}{metrics.placementChange}% from last year</span>
              </div>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Attendance Trend */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Trend</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Year-wise Performance */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Year-wise Performance</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cgpa" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Faculty Workload Distribution */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Faculty Workload Distribution</h2>
              <div className="flex items-center justify-center mb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={workloadData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {workloadData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                    <Badge className="bg-gray-100 text-gray-700">{item.value} Faculty</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Subject-wise Performance */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Subject-wise Performance</h2>
              <div className="space-y-4">
                {subjectPerformance.map((subject, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{subject.subject}</span>
                      <span className="text-sm font-bold text-gray-900">{subject.pass}%</span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-200">
                      <div 
                        className="bg-green-500"
                        style={{ width: `${subject.pass}%` }}
                      />
                      <div 
                        className="bg-red-500"
                        style={{ width: `${subject.fail}%` }}
                      />
                    </div>
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