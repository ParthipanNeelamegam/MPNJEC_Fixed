import { useState, useEffect } from 'react';
import { Home, Users, Calendar, BarChart3, FileText, Download, Filter, Eye, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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

const reportTypes = [
  { value: 'academic', label: 'Academic' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'overall', label: 'Overall' },
  { value: 'placement', label: 'Placement' },
] as const;

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

const getReportLabel = (type: string) => reportTypes.find(item => item.value === type)?.label || type;

const createReportFileName = (title?: string) => {
  const base = title || 'report';
  return `${base.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'report'}.pdf`;
};

const cleanPdfText = (value: unknown) => String(value ?? '-')
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const wrapText = (text: string, width = 92) => {
  const words = cleanPdfText(text).split(' ');
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
};

const formatReportDate = (date?: string) => date ? new Date(date).toLocaleDateString('en-IN') : '-';

const buildReportLines = (report: any) => {
  const lines: string[] = [];
  const addLine = (line = '') => lines.push(line);
  const addWrapped = (label: string, value: unknown) => {
    const prefix = `${label.padEnd(18)} : `;
    const wrapped = wrapText(cleanPdfText(value), 72);
    wrapped.forEach((line, index) => addLine(`${index === 0 ? prefix : ' '.repeat(prefix.length)}${line}`));
  };

  const addValue = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    if (typeof value === 'object') {
      addLine(label);
      addObject(value, 2);
      return;
    }
    addWrapped(label, value);
  };

  const addObject = (value: any, indent = 0) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        addLine(`${' '.repeat(indent)}No records`);
        return;
      }

      value.forEach((item, index) => {
        addLine(`${' '.repeat(indent)}Record ${index + 1}`);
        addObject(item, indent + 2);
        if (index < value.length - 1) addLine('');
      });
      return;
    }

    if (value && typeof value === 'object') {
      if (Object.keys(value).length === 0) {
        addLine(`${' '.repeat(indent)}No report data available`);
        return;
      }

      Object.entries(value).forEach(([key, entry]) => {
        const label = `${' '.repeat(indent)}${key}`;
        if (entry && typeof entry === 'object') {
          addLine(label);
          addObject(entry, indent + 2);
        } else {
          const prefix = `${label.padEnd(Math.max(22, label.length + 1))}: `;
          const wrapped = wrapText(cleanPdfText(entry), 88 - indent);
          wrapped.forEach((line, index) => addLine(`${index === 0 ? prefix : ' '.repeat(prefix.length)}${line}`));
        }
      });
    } else {
      addLine(`${' '.repeat(indent)}${cleanPdfText(value)}`);
    }
  };

  addLine('MPNMJEC Department Report');
  addLine('='.repeat(28));
  addLine('');
  addValue('Title', report.title);
  addValue('Type', getReportLabel(report.type));
  addValue('Department', report.department);
  addValue('Category', report.category);
  addValue('Year', report.year || 'All');
  addValue('Section', report.section || 'All');
  addValue('Generated On', formatReportDate(report.createdAt));
  if (report.dateRange?.start || report.dateRange?.end) {
    addValue('Date Range', `${formatReportDate(report.dateRange?.start)} to ${formatReportDate(report.dateRange?.end)}`);
  }
  addLine('');
  addLine('Report Data');
  addLine('-'.repeat(11));
  addObject(report.data || {}, 0);

  return lines;
};

const escapePdfText = (text: string) => cleanPdfText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const createPdfBlob = (report: any) => {
  const lines = buildReportLines(report);
  const linesPerPage = 48;
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  if (pages.length === 0) pages.push(['No report data']);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const pageIds: number[] = [];

  pages.forEach((pageLines, pageIndex) => {
    const pageFooter = `Page ${pageIndex + 1} of ${pages.length}`;
    const streamLines = [
      'BT',
      `/F1 10 Tf`,
      '14 TL',
      '54 790 Td',
      ...pageLines.map(line => `(${escapePdfText(line)}) Tj T*`),
      'ET',
      'BT',
      '/F1 9 Tf',
      `54 34 Td (${escapePdfText(pageFooter)}) Tj`,
      'ET',
    ];
    const stream = streamLines.join('\n');
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = '<< /Type /Catalog /Pages 2 0 R >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export default function HODReports() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

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
        status: r.status || 'ready',
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

  const loadReport = async (id: string) => {
    const res = await getReportById(id);
    return res.data.report;
  };

  const handleView = async (id: string) => {
    try {
      setViewLoading(true);
      const report = await loadReport(id);
      setViewingReport(report);
    } catch {
      toast.error('Failed to open report');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const report = await loadReport(id);
      const blob = createPdfBlob(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = createReportFileName(report.title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const reportType = typeFilter === 'all' ? 'attendance' : typeFilter as (typeof reportTypes)[number]['value'];
      setGenerating(true);
      await generateReport({ type: reportType });
      toast.success(`${getReportLabel(reportType)} report generated`);
      await fetchReports();
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
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
          <div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Department Reports</h1>
              <p className="text-gray-600">Generate, view, and download department reports</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
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
              <div className="text-2xl font-bold text-gray-900">{reports.filter(r => r.type === 'academic').length}</div>
              <div className="text-sm text-gray-600">Academic Reports</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.filter(r => r.type === 'attendance').length}</div>
              <div className="text-sm text-gray-600">Attendance Reports</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.filter(r => r.type === 'faculty').length}</div>
              <div className="text-sm text-gray-600">Faculty Reports</div>
            </Card>
          </div>

          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Class/Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="Year 1">Year 1</SelectItem>
                  <SelectItem value="Year 2">Year 2</SelectItem>
                  <SelectItem value="Year 3">Year 3</SelectItem>
                  <SelectItem value="Year 4">Year 4</SelectItem>
                </SelectContent>
              </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  onClick={handleGenerateReport}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Generate Report
                </Button>
              </div>
            </div>
          </Card>

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
                          <Badge className="bg-blue-100 text-blue-700">{getReportLabel(report.type)}</Badge>
                          {report.year && <><span>-</span><span>Year {report.year}</span></>}
                          {report.section && <><span>-</span><span>Section {report.section}</span></>}
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
                        onClick={() => handleView(report.id)}
                        disabled={viewLoading}
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
            {filteredReports.length === 0 && (
              <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center text-gray-500">
                No reports found
              </Card>
            )}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>

      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewingReport?.title || 'Report Details'}</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Type</div>
                  <div className="font-medium">{getReportLabel(viewingReport.type)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Department</div>
                  <div className="font-medium">{viewingReport.department || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Year</div>
                  <div className="font-medium">{viewingReport.year || 'All'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Section</div>
                  <div className="font-medium">{viewingReport.section || 'All'}</div>
                </div>
              </div>
              <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-auto">
                {JSON.stringify(viewingReport.data || {}, null, 2)}
              </pre>
              <div className="flex justify-end">
                <Button onClick={() => handleDownload(viewingReport._id)} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
