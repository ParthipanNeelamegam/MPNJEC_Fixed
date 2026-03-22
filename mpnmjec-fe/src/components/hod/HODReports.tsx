import { useState, useEffect } from 'react';
import { Home, Users, Calendar, BarChart3, FileText, Download, Filter, Eye, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getReports, generateReport, getReportById } from '../../services/hodService';

interface Report {
  id: string;
  title: string;
  type: string;
  year: number | null;
  section: string;
  date: string;
  status: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

export default function HODReports() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getReports();
      const raw = response.data.reports || [];
      setReports(raw.map((r: any) => ({
        id: r._id,
        title: r.title,
        type: r.type,
        year: r.year || null,
        section: r.section || '',
        date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '-',
        status: r.status || 'generated',
      })));
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesClass = classFilter === 'all' || (report.year != null && `Year ${report.year}` === classFilter);
    return matchesType && matchesClass;
  });

  const handleDownload = async (id: string) => {
    try {
      const res = await getReportById(id);
      const report = res.data.report;
      const content = JSON.stringify(report.data || report, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title || 'report'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    }
  };

  const handleGenerateReport = async () => {
    try {
      await generateReport({ type: 'attendance' });
      toast.success('Report generation started');
      fetchReports();
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Department Reports</h1>
              <p className="text-gray-600">Generate and download department reports</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              onClick={handleGenerateReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
              <div className="text-sm text-gray-600">Total Reports</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.filter(r => r.type === 'Academic').length}</div>
              <div className="text-sm text-gray-600">Academic Reports</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.filter(r => r.type === 'Attendance').length}</div>
              <div className="text-sm text-gray-600">Attendance Reports</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.filter(r => r.type === 'Faculty').length}</div>
              <div className="text-sm text-gray-600">Faculty Reports</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Attendance">Attendance</SelectItem>
                  <SelectItem value="Faculty">Faculty</SelectItem>
                  <SelectItem value="Overall">Overall</SelectItem>
                  <SelectItem value="Placement">Placement</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Class/Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="Year 3">Year 3</SelectItem>
                  <SelectItem value="Year 4">Year 4</SelectItem>
                  <SelectItem value="CSE 3A">CSE 3A</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{report.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Badge className="bg-blue-100 text-blue-700">{report.type}</Badge>
                          {report.year && <><span>•</span><span>Year {report.year}</span></>}
                          {report.section && <><span>•</span><span>Section {report.section}</span></>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-gray-600">Generated on</div>
                      <div className="text-sm font-medium text-gray-900">{report.date}</div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">{report.status}</Badge>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownload(report.id)}
                      >
                        <Eye className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">View</span>
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        onClick={() => handleDownload(report.id)}
                      >
                        <Download className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Download</span>
                      </Button>
                    </div>
                  </div>
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