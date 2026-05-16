import { useState, useEffect } from 'react';
import { Home, Bell, FileText, Building2, Trophy, CheckCircle, Clock, XCircle, Eye, Award, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getApprovals, updateApproval } from '../../services/principalService';

type ApprovalType = 'leave' | 'certificate';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type ApprovalPriority = 'high' | 'medium' | 'low';

interface Approval {
  id: string;
  type: ApprovalType;
  title: string;
  from: string;
  department: string;
  date: string;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  rollNumber?: string;
  purpose?: string;
  reason?: string;
  certificateType?: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  applicantRole?: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: Bell, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: FileText, label: 'Reports', path: '/principal/reports' },
  { icon: Building2, label: 'Departments', path: '/principal/departments' },
  { icon: Trophy, label: 'Achievements', path: '/principal/achievements' },
];

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN');
};

const toTitleCase = (value: string) =>
  value.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, char => char.toUpperCase()).trim();

const normalizeStatus = (status?: string): ApprovalStatus => {
  const value = (status || 'pending').toLowerCase();
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  return 'pending';
};

const getStatusLabel = (status: ApprovalStatus) => status.charAt(0).toUpperCase() + status.slice(1);
const getPriorityLabel = (priority: ApprovalPriority) => priority.charAt(0).toUpperCase() + priority.slice(1);
const getTypeLabel = (type: ApprovalType) => type === 'certificate' ? 'Certificate' : 'Leave';

const getStatusClass = (status: ApprovalStatus) => {
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const getPriorityClass = (priority: ApprovalPriority) => {
  if (priority === 'high') return 'bg-red-100 text-red-700';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
};

const mapApproval = (approval: any): Approval => {
  const type: ApprovalType = approval.type === 'certificate' ? 'certificate' : 'leave';
  const certificateType = approval.certificateType || approval.typeName || 'Certificate';
  const leaveType = approval.leaveType || 'Leave';

  return {
    id: approval._id || approval.id,
    type,
    title: type === 'certificate'
      ? `${toTitleCase(certificateType)} Request`
      : `${toTitleCase(leaveType)} Leave Request`,
    from: approval.studentName || approval.from || 'Unknown Student',
    department: approval.department || '-',
    date: formatDate(approval.appliedAt || approval.createdAt || approval.fromDate),
    priority: type === 'certificate' && certificateType.toLowerCase().includes('bonafide') ? 'high' : 'medium',
    status: normalizeStatus(approval.status),
    rollNumber: approval.rollNumber,
    purpose: approval.purpose,
    reason: approval.reason,
    certificateType,
    leaveType,
    fromDate: formatDate(approval.fromDate),
    toDate: formatDate(approval.toDate),
    applicantRole: approval.applicantRole,
  };
};

export default function PrincipalApprovals() {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await getApprovals();
      const rawApprovals = response.data.approvals || [];
      setApprovals(rawApprovals.map(mapApproval).filter((approval: Approval) => approval.id));
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const filteredApprovals = approvals.filter(approval => {
    const matchesPriority = priorityFilter === 'all' || approval.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || approval.type === typeFilter;
    return matchesPriority && matchesType;
  });

  const handleStatusUpdate = async (approval: Approval, status: 'approved' | 'rejected') => {
    try {
      setUpdatingId(approval.id);
      await updateApproval(approval.id, { type: approval.type, status });
      toast.success(`${getTypeLabel(approval.type)} request ${status}`);
      setSelectedApproval(null);
      fetchApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${status === 'approved' ? 'approve' : 'reject'} request`);
    } finally {
      setUpdatingId(null);
    }
  };

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve institutional requests</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-xl">
              <Bell className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.filter(a => a.status === 'pending').length}</div>
              <div className="text-indigo-100">Pending</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-red-500 to-pink-600 text-white border-0 shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.filter(a => a.priority === 'high').length}</div>
              <div className="text-red-100">High Priority</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CheckCircle className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.filter(a => a.status === 'approved').length}</div>
              <div className="text-green-100">Approved</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <FileText className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.length}</div>
              <div className="text-blue-100">Total Requests</div>
            </Card>
          </div>

          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Request Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="space-y-4">
            {filteredApprovals.length === 0 ? (
              <Card className="p-10 text-center bg-white/80 border-0 shadow-lg">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">No approvals found</p>
              </Card>
            ) : filteredApprovals.map((approval) => (
              <Card key={approval.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        {approval.type === 'certificate' ? (
                          <Award className="w-6 h-6 text-white" />
                        ) : (
                          <Clock className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{approval.title}</h3>
                          <Badge className={getPriorityClass(approval.priority)}>
                            {getPriorityLabel(approval.priority)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          From: {approval.from}{approval.rollNumber ? ` (${approval.rollNumber})` : ''}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <Badge className="bg-blue-100 text-blue-700">{getTypeLabel(approval.type)}</Badge>
                          <span>-</span>
                          <span>{approval.department}</span>
                          <span>-</span>
                          <span>{approval.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusClass(approval.status)}>
                      {getStatusLabel(approval.status)}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setSelectedApproval(approval)}>
                      <Eye className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">View</span>
                    </Button>
                    {approval.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={updatingId === approval.id}
                          onClick={() => handleStatusUpdate(approval, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updatingId === approval.id}
                          onClick={() => handleStatusUpdate(approval, 'rejected')}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>

      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedApproval?.title}</DialogTitle>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Student</div>
                  <div className="font-semibold text-gray-900">{selectedApproval.from}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Roll Number</div>
                  <div className="font-semibold text-gray-900">{selectedApproval.rollNumber || '-'}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Department</div>
                  <div className="font-semibold text-gray-900">{selectedApproval.department}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Requested On</div>
                  <div className="font-semibold text-gray-900">{selectedApproval.date}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-700">{getTypeLabel(selectedApproval.type)}</Badge>
                <Badge className={getPriorityClass(selectedApproval.priority)}>{getPriorityLabel(selectedApproval.priority)}</Badge>
                <Badge className={getStatusClass(selectedApproval.status)}>{getStatusLabel(selectedApproval.status)}</Badge>
              </div>

              {selectedApproval.type === 'certificate' ? (
                <>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Certificate Type</div>
                    <div className="font-semibold text-gray-900">{toTitleCase(selectedApproval.certificateType || 'Certificate')}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Purpose</div>
                    <div className="text-gray-900">{selectedApproval.purpose || '-'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">From Date</div>
                      <div className="font-semibold text-gray-900">{selectedApproval.fromDate || '-'}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">To Date</div>
                      <div className="font-semibold text-gray-900">{selectedApproval.toDate || '-'}</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Reason</div>
                    <div className="text-gray-900">{selectedApproval.reason || '-'}</div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedApproval(null)}>Close</Button>
                {selectedApproval.status === 'pending' && (
                  <>
                    <Button
                      variant="destructive"
                      disabled={updatingId === selectedApproval.id}
                      onClick={() => handleStatusUpdate(selectedApproval, 'rejected')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={updatingId === selectedApproval.id}
                      onClick={() => handleStatusUpdate(selectedApproval, 'approved')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
