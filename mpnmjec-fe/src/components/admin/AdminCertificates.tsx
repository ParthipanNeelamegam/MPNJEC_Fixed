import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, Search, Filter, CheckCircle, Clock, XCircle, Eye, FileText, UserCog, Crown, Loader2, Library, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getCertificateRequests, updateCertificateStatus } from '../../services/adminService';

interface Certificate {
  id: string;
  reqId: string;
  roll: string;
  name: string;
  department: string;
  year: number;
  type: string;       // raw DB value e.g. 'bonafide'
  typeName: string;   // display name e.g. 'Bonafide Certificate'
  requestDate: string;
  status: string;     // lowercase: 'pending' | 'approved' | 'rejected' | 'processing' | 'ready' | 'collected'
  purpose: string;
  copies: number;
  fee: number;
  isPaid: boolean;
  remarks: string;
  certificateNumber: string;
}

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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  collected: 'bg-gray-100 text-gray-700',
};

export default function AdminCertificates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await getCertificateRequests();
      const raw: any[] = response.data?.certificates || [];

      setCertificates(raw.map((c: any) => ({
        id: c._id,
        reqId: c.certificateNumber || `REQ-${c._id?.slice(-6).toUpperCase()}`,
        roll: c.rollNumber || '-',
        name: c.studentName || 'Unknown',
        department: c.department || '-',
        year: c.year || '-',
        type: c.type || '',
        typeName: c.typeName || c.type || '-',
        requestDate: c.appliedAt
          ? new Date(c.appliedAt).toLocaleDateString('en-IN')
          : '-',
        status: (c.status || 'pending').toLowerCase(),
        purpose: c.purpose || '-',
        copies: c.copies || 1,
        fee: c.fee || 0,
        isPaid: c.isPaid || false,
        remarks: c.remarks || '',
        certificateNumber: c.certificateNumber || '',
      })));
    } catch (error) {
      toast.error('Failed to load certificate requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      await updateCertificateStatus(id, { status: newStatus });
      toast.success(`Certificate marked as ${newStatus}`);
      fetchCertificates();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch =
      cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.reqId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    const matchesType = typeFilter === 'all' || cert.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const countByStatus = (s: string) => certificates.filter(c => c.status === s).length;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Certificate Requests</h1>
          <p className="text-gray-600">Review and process student certificate requests</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <FileText className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{certificates.length}</div>
              <div className="text-blue-100">Total Requests</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl">
              <Clock className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{countByStatus('pending')}</div>
              <div className="text-amber-100">Pending</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CheckCircle className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{countByStatus('approved') + countByStatus('ready') + countByStatus('collected')}</div>
              <div className="text-green-100">Approved</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-red-500 to-pink-600 text-white border-0 shadow-xl">
              <XCircle className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{countByStatus('rejected')}</div>
              <div className="text-red-100">Rejected</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name, roll number, or request ID..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-300"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-52">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Certificate Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bonafide">Bonafide</SelectItem>
                  <SelectItem value="characterCertificate">Character Certificate</SelectItem>
                  <SelectItem value="conductCertificate">Conduct Certificate</SelectItem>
                  <SelectItem value="studyCertificate">Study Certificate</SelectItem>
                  <SelectItem value="courseCompletion">Course Completion</SelectItem>
                  <SelectItem value="migration">Migration</SelectItem>
                  <SelectItem value="transferCertificate">Transfer Certificate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {filteredCertificates.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No certificate requests found</p>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Request ID</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Student</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Type</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Purpose</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Date</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Fee</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCertificates.map((cert) => (
                        <tr key={cert.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-mono text-sm text-gray-700">{cert.reqId}</td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{cert.name}</div>
                            <div className="text-sm text-gray-500">{cert.roll} · {cert.department}</div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className="bg-blue-100 text-blue-700">{cert.typeName}</Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 max-w-[180px] truncate">{cert.purpose}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{cert.requestDate}</td>
                          <td className="py-4 px-4 text-sm">
                            <span className={cert.isPaid ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                              ₹{cert.fee} {cert.isPaid ? '✓' : '(unpaid)'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={STATUS_COLORS[cert.status] || 'bg-gray-100 text-gray-700'}>
                              {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-1">
                              {/* View */}
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0"
                                title="View details"
                                onClick={() => setViewCert(cert)}
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                              {/* Approve */}
                              {cert.status === 'pending' && (
                                <Button
                                  size="sm" variant="ghost" className="h-8 w-8 p-0"
                                  title="Approve"
                                  disabled={updatingId === cert.id}
                                  onClick={() => handleStatusUpdate(cert.id, 'approved')}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              {/* Mark Ready */}
                              {cert.status === 'approved' && (
                                <Button
                                  size="sm" variant="ghost" className="h-8 w-8 p-0"
                                  title="Mark as Ready"
                                  disabled={updatingId === cert.id}
                                  onClick={() => handleStatusUpdate(cert.id, 'ready')}
                                >
                                  <FileText className="w-4 h-4 text-purple-600" />
                                </Button>
                              )}
                              {/* Mark Collected */}
                              {cert.status === 'ready' && (
                                <Button
                                  size="sm" variant="ghost" className="h-8 w-8 p-0"
                                  title="Mark as Collected"
                                  disabled={updatingId === cert.id}
                                  onClick={() => handleStatusUpdate(cert.id, 'collected')}
                                >
                                  <CheckCircle className="w-4 h-4 text-gray-600" />
                                </Button>
                              )}
                              {/* Reject */}
                              {(cert.status === 'pending' || cert.status === 'approved') && (
                                <Button
                                  size="sm" variant="ghost" className="h-8 w-8 p-0"
                                  title="Reject"
                                  disabled={updatingId === cert.id}
                                  onClick={() => handleStatusUpdate(cert.id, 'rejected')}
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredCertificates.map((cert) => (
                  <Card key={cert.id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900 mb-1">{cert.name}</div>
                        <div className="text-sm text-gray-600">{cert.roll} · {cert.reqId}</div>
                      </div>
                      <Badge className={STATUS_COLORS[cert.status] || 'bg-gray-100 text-gray-700'}>
                        {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Type</div>
                        <div className="text-sm font-medium">{cert.typeName}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Fee</div>
                        <div className={`text-sm font-semibold ${cert.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                          ₹{cert.fee} {cert.isPaid ? '✓' : '(unpaid)'}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl mb-3">
                      <div className="text-xs text-gray-600 mb-1">Purpose</div>
                      <div className="text-sm font-medium text-gray-900">{cert.purpose}</div>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">Requested on {cert.requestDate}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewCert(cert)}>
                        <Eye className="w-4 h-4 mr-2" />View
                      </Button>
                      {cert.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={updatingId === cert.id}
                            onClick={() => handleStatusUpdate(cert.id, 'approved')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />Approve
                          </Button>
                          <Button
                            size="sm" variant="destructive"
                            disabled={updatingId === cert.id}
                            onClick={() => handleStatusUpdate(cert.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {cert.status === 'approved' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={updatingId === cert.id}
                          onClick={() => handleStatusUpdate(cert.id, 'ready')}
                        >
                          <FileText className="w-4 h-4 mr-1" />Mark Ready
                        </Button>
                      )}
                      {cert.status === 'ready' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                          disabled={updatingId === cert.id}
                          onClick={() => handleStatusUpdate(cert.id, 'collected')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />Collected
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewCert} onOpenChange={() => setViewCert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Certificate Request Details</DialogTitle>
          </DialogHeader>
          {viewCert && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Request ID</span>
                <span className="font-mono text-sm font-semibold">{viewCert.reqId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Student</span>
                <span className="font-semibold">{viewCert.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Roll Number</span>
                <span>{viewCert.roll}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Department</span>
                <span>{viewCert.department} · Year {viewCert.year}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Certificate Type</span>
                <Badge className="bg-blue-100 text-blue-700">{viewCert.typeName}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Copies</span>
                <span>{viewCert.copies}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Fee</span>
                <span className={viewCert.isPaid ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                  ₹{viewCert.fee} {viewCert.isPaid ? '(Paid)' : '(Unpaid)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge className={STATUS_COLORS[viewCert.status]}>
                  {viewCert.status.charAt(0).toUpperCase() + viewCert.status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Requested On</span>
                <span>{viewCert.requestDate}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">Purpose</div>
                <div className="text-sm">{viewCert.purpose}</div>
              </div>
              {viewCert.remarks && (
                <div className="p-3 bg-amber-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Remarks</div>
                  <div className="text-sm">{viewCert.remarks}</div>
                </div>
              )}
              {viewCert.certificateNumber && (
                <div className="p-3 bg-green-50 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Certificate Number</div>
                  <div className="font-mono font-semibold text-green-700">{viewCert.certificateNumber}</div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                {viewCert.status === 'pending' && (
                  <>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => { handleStatusUpdate(viewCert.id, 'approved'); setViewCert(null); }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />Approve
                    </Button>
                    <Button
                      variant="destructive" className="flex-1"
                      onClick={() => { handleStatusUpdate(viewCert.id, 'rejected'); setViewCert(null); }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />Reject
                    </Button>
                  </>
                )}
                {viewCert.status === 'approved' && (
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => { handleStatusUpdate(viewCert.id, 'ready'); setViewCert(null); }}
                  >
                    <FileText className="w-4 h-4 mr-2" />Mark as Ready
                  </Button>
                )}
                {viewCert.status === 'ready' && (
                  <Button
                    className="flex-1 bg-gray-700 hover:bg-gray-800"
                    onClick={() => { handleStatusUpdate(viewCert.id, 'collected'); setViewCert(null); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />Mark Collected
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewCert(null)}>
                  <X className="w-4 h-4 mr-1" />Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}