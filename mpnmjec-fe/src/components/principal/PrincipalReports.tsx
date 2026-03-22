import { useState, useEffect } from 'react';
import { Home, Bell, FileText, Building2, Trophy, Download, BarChart3, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getReports, generateReport, getReportById } from '../../services/principalService';

interface Report {
  id: string;
  title: string;
  type: string;
  date: string;
  status: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: Bell, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: FileText, label: 'Reports', path: '/principal/reports' },
  { icon: Building2, label: 'Departments', path: '/principal/departments' },
  { icon: Trophy, label: 'Achievements', path: '/principal/achievements' },
];

export default function PrincipalReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await getReports();
      setReports(response.data.reports || []);
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

  const handleGenerateReport = async () => {
    try {
      await generateReport({ type: 'attendance' });
      toast.success('Report generation started');
      fetchReports();
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  const thisMonthCount = reports.filter(r => {
    const reportDate = new Date(r.date);
    const now = new Date();
    return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
  }).length;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Institutional Reports</h1>
              <p className="text-gray-600">Executive reports and analytics</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              onClick={handleGenerateReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-xl">
              <FileText className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{reports.length}</div>
              <div className="text-indigo-100">Total Reports</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <BarChart3 className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{thisMonthCount}</div>
              <div className="text-blue-100">This Month</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <Download className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">--</div>
              <div className="text-purple-100">Downloads</div>
            </Card>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{report.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Badge className="bg-purple-100 text-purple-700">{report.type}</Badge>
                        <span>•</span>
                        <span>{report.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">{report.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          // FIX: Use authenticated API call to download report as JSON
                          const res = await getReportById(report.id);
                          const data = res.data?.report;
                          if (!data) { toast.error('Report data not found'); return; }
                          // Format nicely as JSON text
                          const content = JSON.stringify(data, null, 2);
                          const blob = new Blob([content], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${report.title || 'report'}_${new Date().toISOString().slice(0,10)}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success('Report downloaded!');
                        } catch {
                          toast.error('Failed to download report');
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
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
