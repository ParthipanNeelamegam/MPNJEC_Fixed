import { useState } from 'react';
import {
  Home, FileCheck, TrendingUp, Building, Award, CalendarDays,
  BarChart3, Loader2, Filter, Medal
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import {
  getOverviewAnalysis,
  type OverviewAnalysis,
} from '../../services/resultAnalysisService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: FileCheck, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: TrendingUp, label: 'Reports', path: '/principal/reports' },
  { icon: Building, label: 'Departments', path: '/principal/departments' },
  { icon: Award, label: 'Achievements', path: '/principal/achievements' },
  { icon: BarChart3, label: 'Results', path: '/principal/result-analysis' },
];

export default function PrincipalResultAnalysis() {
  const [loading, setLoading] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');

  const [overview, setOverview] = useState<OverviewAnalysis | null>(null);

  const loadOverview = async () => {
    if (!selectedSemester) {
      toast.error('Please select a semester');
      return;
    }

    try {
      setLoading(true);
      setOverview(null);

      const params: any = { semester: parseInt(selectedSemester) };
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.department = selectedDepartment;
      }
      if (selectedYear && selectedYear !== 'all') {
        params.year = parseInt(selectedYear);
      }

      const res = await getOverviewAnalysis(params);
      setOverview(res.data);
    } catch (error: any) {
      console.error('Failed to load overview:', error);
      toast.error(error.response?.data?.error || 'Failed to load overview analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Principal Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Result Analysis</h1>
          <p className="text-gray-600">Institution-wide examination result overview</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Department</Label>
                <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setOverview(null); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="cse">CSE</SelectItem>
                    <SelectItem value="ece">ECE</SelectItem>
                    <SelectItem value="eee">EEE</SelectItem>
                    <SelectItem value="mech">MECH</SelectItem>
                    <SelectItem value="civil">CIVIL</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="aids">AIDS</SelectItem>
                    <SelectItem value="csbs">CSBS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Year</Label>
                <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setOverview(null); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Semester</Label>
                <Select value={selectedSemester} onValueChange={(v) => { setSelectedSemester(v); setOverview(null); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={loadOverview}
                  disabled={!selectedSemester || loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Load Overview'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Overview Results */}
          {overview ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <p className="text-3xl font-bold text-blue-700">{overview.summary.totalStudents}</p>
                  <p className="text-sm text-blue-600">Total Appeared</p>
                </Card>
                <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <p className="text-3xl font-bold text-green-700">{overview.summary.totalPassed}</p>
                  <p className="text-sm text-green-600">Passed</p>
                </Card>
                <Card className="p-4 text-center bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                  <p className="text-3xl font-bold text-red-700">{overview.summary.totalFailed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </Card>
                <Card className="p-4 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                  <p className="text-3xl font-bold text-emerald-700">{overview.summary.passPercentage}%</p>
                  <p className="text-sm text-emerald-600">Pass Rate</p>
                </Card>
              </div>

              {/* Department-wise Results */}
              {overview.departments && overview.departments.length > 0 && (
                <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
                  <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
                    <h3 className="font-bold text-white">Department-wise Results</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Department</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Students</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Passed</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Failed</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass %</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.departments.map((dept, idx) => (
                          <tr key={dept.department} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-3 font-medium text-sm">{dept.department?.toUpperCase()}</td>
                            <td className="p-3 text-center text-sm">{dept.totalStudents}</td>
                            <td className="p-3 text-center text-sm text-green-600 font-medium">{dept.passCount}</td>
                            <td className="p-3 text-center text-sm text-red-600 font-medium">{dept.failCount}</td>
                            <td className="p-3 text-center">
                              <Badge className={dept.passPercentage >= 70 ? 'bg-green-100 text-green-700' : dept.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                {dept.passPercentage}%
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-sm font-medium">{dept.averageMark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Class-wise Results */}
              {overview.classes && overview.classes.length > 0 && (
                <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
                  <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-violet-600">
                    <h3 className="font-bold text-white">Class-wise Results</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Class</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Students</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Passed</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Failed</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Pass %</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Avg Mark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.classes.map((c, idx) => (
                          <tr key={`${c.department || ''}-${c.year}-${c.section}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-3 font-medium text-sm">
                              {c.department ? `${c.department.toUpperCase()} - ` : ''}Year {c.year}{c.section ? ` (${c.section})` : ''}
                            </td>
                            <td className="p-3 text-center text-sm">{c.totalStudents}</td>
                            <td className="p-3 text-center text-sm text-green-600 font-medium">{c.passCount}</td>
                            <td className="p-3 text-center text-sm text-red-600 font-medium">{c.failCount || (c.totalStudents - c.passCount)}</td>
                            <td className="p-3 text-center">
                              <Badge className={c.passPercentage >= 70 ? 'bg-green-100 text-green-700' : c.passPercentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                {c.passPercentage}%
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-sm font-medium">{c.averageMark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
              {/* Top 3 Rank Holders */}
              {(() => {
                const allToppers: { rank: number; name: string; rollNumber: string; totalMarks: number; average: number; classLabel?: string }[] = [];
                (overview.classes || []).forEach(cls => {
                  (cls.toppers || []).forEach((t, i) => {
                    allToppers.push({ ...t, rank: i + 1, classLabel: cls.section ? `Year ${cls.year} (${cls.section})` : `Year ${cls.year}` });
                  });
                });
                const top3 = allToppers.sort((a, b) => b.totalMarks - a.totalMarks).slice(0, 3);
                if (top3.length === 0) return null;
                const medalColors = ['from-yellow-400 to-amber-500', 'from-gray-300 to-gray-400', 'from-amber-600 to-orange-700'];
                return (
                  <Card className="overflow-hidden bg-white/80 border-0 shadow-lg">
                    <div className="p-4 border-b bg-gradient-to-r from-amber-500 to-orange-500">
                      <div className="flex items-center gap-2">
                        <Medal className="w-5 h-5 text-white" />
                        <h3 className="font-bold text-white">Top 3 Rank Holders</h3>
                      </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {top3.map((topper, idx) => (
                        <div key={idx} className="rounded-xl border p-4 text-center">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${medalColors[idx]} flex items-center justify-center mx-auto mb-3`}>
                            <span className="text-white font-bold text-lg">#{idx + 1}</span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm">{topper.name}</p>
                          <p className="text-xs text-gray-500 mb-2">{topper.rollNumber}</p>
                          {topper.classLabel && <Badge className="bg-blue-100 text-blue-700 text-xs mb-2">{topper.classLabel}</Badge>}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-sm font-bold text-gray-900">{topper.totalMarks}</p>
                              <p className="text-xs text-gray-500">Total Marks</p>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-sm font-bold text-gray-900">{topper.average}%</p>
                              <p className="text-xs text-gray-500">Average</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}
            </div>
          ) : !loading ? (
            <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Result Overview</h3>
              <p className="text-gray-500">Select department and semester, then click "Load Overview" to view institution-wide result analysis</p>
            </Card>
          ) : (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}
        </main>
      </div>

      <MobileNav items={navItems} />
    </div>
  );
}
