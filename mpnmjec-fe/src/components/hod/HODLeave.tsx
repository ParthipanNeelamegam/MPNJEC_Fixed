import { useState, useEffect } from 'react';
import { Home, Users, BarChart, FileText, Loader2, Clock, CheckCircle, XCircle, Send, CalendarDays, AlertCircle, GraduationCap, Info, Search, Filter, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { 
  applyForLeave, 
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getAllLeaveRequests,
  getLeaveDetails,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveTypeLabel, 
  getStatusColor, 
  getRoleLabel,
  formatDateRange,
  calculateLeaveDuration,
  type LeaveRequest 
} from '../../services/leaveService.js';
import { getAccessToken } from '../../utils/token';

// Decode JWT to get user info
const decodeToken = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

interface UserInfo {
  id: string;
  name: string;
  role: string;
  department?: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/hod/dashboard' },
  { icon: Users, label: 'Faculty', path: '/hod/faculty' },
  { icon: Users, label: 'Students', path: '/hod/students' },
  { icon: BarChart, label: 'Analytics', path: '/hod/analytics' },
  { icon: FileText, label: 'Reports', path: '/hod/reports' },
  { icon: CalendarDays, label: 'Leave', path: '/hod/leave' },
];

export default function HODLeave() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [deptLeaves, setDeptLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('apply');
  const [deptFilterStatus, setDeptFilterStatus] = useState<string>('all');
  const [deptFilterRole, setDeptFilterRole] = useState<string>('all');
  const [deptSearchQuery, setDeptSearchQuery] = useState<string>('');

  // Form state
  const [leaveType, setLeaveType] = useState<string>('casual');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    // Get user info from token
    const token = getAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUserInfo({
          id: decoded.id,
          name: decoded.name || 'HOD',
          role: decoded.role,
          department: decoded.department,
        });
      }
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [myLeavesRes, pendingLeavesRes, deptLeavesRes] = await Promise.all([
        getMyLeaveRequests().catch(() => ({ data: { leaves: [] } })),
        getPendingLeaveRequests().catch(() => ({ data: { leaves: [] } })),
        getAllLeaveRequests({ limit: 100 }).catch(() => ({ data: { leaves: [] } }))
      ]);
      setMyLeaves(myLeavesRes.data.leaves || []);
      setPendingLeaves(pendingLeavesRes.data.leaves || []);
      setDeptLeaves(deptLeavesRes.data.leaves || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromDate || !toDate || !reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('From date cannot be after To date');
      return;
    }

    setSubmitting(true);
    try {
      await applyForLeave({
        leaveType: leaveType as any,
        fromDate,
        toDate,
        reason: reason.trim(),
      });
      
      toast.success('Leave application submitted successfully');
      
      // Reset form
      setLeaveType('casual');
      setFromDate('');
      setToDate('');
      setReason('');
      
      // Reload leaves
      loadData();
    } catch (error: any) {
      console.error('Failed to apply leave:', error);
      toast.error(error.response?.data?.error || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailsDialog = async (leave: LeaveRequest) => {
    setLoadingDetails(true);
    setDetailsDialogOpen(true);
    try {
      const res = await getLeaveDetails(leave.id);
      setSelectedLeave(res.data.leave);
    } catch (error: any) {
      toast.error('Failed to load leave details');
      setSelectedLeave(leave);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openReviewDialog = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setReviewRemarks('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;
    setProcessing(true);
    try {
      await approveLeaveRequest(selectedLeave.id, { remarks: reviewRemarks || undefined });
      toast.success('Leave approved successfully');
      setReviewDialogOpen(false);
      setSelectedLeave(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve leave');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLeave) return;
    setProcessing(true);
    try {
      await rejectLeaveRequest(selectedLeave.id, { remarks: reviewRemarks || undefined });
      toast.success('Leave rejected');
      setReviewDialogOpen(false);
      setSelectedLeave(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject leave');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      case 'Partially Approved':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="HOD Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="HOD Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600">
            Apply for leave and approve department requests
            {userInfo?.department && <span className="ml-2 text-blue-600">• {userInfo.department.toUpperCase()}</span>}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="apply">Apply Leave</TabsTrigger>
              <TabsTrigger value="pending">
                Pending Approvals
                {pendingLeaves.length > 0 && (
                  <Badge className="ml-2 bg-red-100 text-red-700">{pendingLeaves.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="department">
                Department Leaves
                {deptLeaves.length > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-700">{deptLeaves.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">My History</TabsTrigger>
            </TabsList>

            {/* Apply Leave Tab */}
            <TabsContent value="apply">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-600" />
                    Apply for Leave
                  </h2>
                  
                  <form onSubmit={handleApplyLeave} className="space-y-4">
                    <div>
                      <Label htmlFor="leaveType">Leave Type</Label>
                      <Select value={leaveType} onValueChange={setLeaveType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual Leave</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="emergency">Emergency Leave</SelectItem>
                          <SelectItem value="personal">Personal Leave</SelectItem>
                          <SelectItem value="academic">Academic Leave</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fromDate">From Date</Label>
                        <Input
                          id="fromDate"
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          min={today}
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="toDate">To Date</Label>
                        <Input
                          id="toDate"
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          min={fromDate || today}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>

                    {fromDate && toDate && new Date(fromDate) <= new Date(toDate) && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Duration:</span> {calculateLeaveDuration(fromDate, toDate)} day(s)
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="reason">Reason</Label>
                      <Textarea
                        id="reason"
                        placeholder="Please provide a reason for your leave..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1"
                        rows={4}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Approval Flow Info */}
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Approval Workflow</p>
                        <p className="text-xs text-amber-700 mt-1">
                          HOD leave can be approved by: <span className="font-medium">Principal</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
                      <div className="text-3xl font-bold">{pendingLeaves.length}</div>
                      <div className="text-yellow-100">Pending to Review</div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <div className="text-3xl font-bold">{myLeaves.length}</div>
                      <div className="text-blue-100">My Applications</div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Pending Approvals Tab */}
            <TabsContent value="pending">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Pending Leave Requests
                  {pendingLeaves.length > 0 && (
                    <Badge className="ml-3 bg-red-100 text-red-700">{pendingLeaves.length}</Badge>
                  )}
                </h2>

                {pendingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-300 mb-4" />
                    <p className="text-gray-500">No pending leave requests</p>
                    <p className="text-sm text-gray-400 mt-1">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <div 
                        key={leave.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-gray-900">{leave.name}</span>
                              <Badge className="bg-blue-100 text-blue-700">
                                {getRoleLabel(leave.applicantRole)}
                              </Badge>
                              {leave.rollNumber && (
                                <Badge className="bg-purple-100 text-purple-700">{leave.rollNumber}</Badge>
                              )}
                              {leave.empId && (
                                <Badge className="bg-purple-100 text-purple-700">{leave.empId}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {leave.department?.toUpperCase()}
                              {leave.year && ` • Year ${leave.year}`}
                              {leave.section && ` • Section ${leave.section}`}
                            </p>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">
                            {getLeaveTypeLabel(leave.leaveType)}
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDateRange(leave.fromDate, leave.toDate)}
                            <span className="text-gray-500 font-normal ml-2">
                              ({calculateLeaveDuration(leave.fromDate, leave.toDate)} day(s))
                            </span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{leave.reason}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openDetailsDialog(leave)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => openReviewDialog(leave)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => openReviewDialog(leave)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Department Leaves Tab */}
            <TabsContent value="department">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Department Leave Requests
                  {userInfo?.department && <span className="text-sm font-normal text-blue-600 ml-2">({userInfo.department.toUpperCase()})</span>}
                </h2>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                    <div className="text-xl font-bold text-yellow-700">{deptLeaves.filter(l => l.finalStatus === 'Pending').length}</div>
                    <div className="text-xs text-yellow-600">Pending</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                    <div className="text-xl font-bold text-green-700">{deptLeaves.filter(l => l.finalStatus === 'Approved').length}</div>
                    <div className="text-xs text-green-600">Approved</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                    <div className="text-xl font-bold text-red-700">{deptLeaves.filter(l => l.finalStatus === 'Rejected').length}</div>
                    <div className="text-xs text-red-600">Rejected</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <div className="text-xl font-bold text-blue-700">{deptLeaves.length}</div>
                    <div className="text-xs text-blue-600">Total</div>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by name, roll number..."
                      value={deptSearchQuery}
                      onChange={(e) => setDeptSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={deptFilterStatus} onValueChange={setDeptFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-1" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={deptFilterRole} onValueChange={setDeptFilterRole}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const filteredDeptLeaves = deptLeaves.filter(l => {
                    const matchesStatus = deptFilterStatus === 'all' || l.finalStatus === deptFilterStatus;
                    const matchesRole = deptFilterRole === 'all' || l.applicantRole === deptFilterRole;
                    const matchesSearch = !deptSearchQuery || 
                      (l.name?.toLowerCase().includes(deptSearchQuery.toLowerCase())) ||
                      (l.rollNumber?.toLowerCase().includes(deptSearchQuery.toLowerCase())) ||
                      (l.empId?.toLowerCase().includes(deptSearchQuery.toLowerCase()));
                    return matchesStatus && matchesRole && matchesSearch;
                  });

                  return filteredDeptLeaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-gray-500">No leave requests found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {deptLeaves.length > 0 ? 'Try adjusting your filters' : 'No department leave requests yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {filteredDeptLeaves.map((leave) => (
                        <div 
                          key={leave.id}
                          onClick={() => openDetailsDialog(leave)}
                          className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900">{leave.name}</span>
                                <Badge className="bg-blue-100 text-blue-700">
                                  {getRoleLabel(leave.applicantRole)}
                                </Badge>
                                {leave.rollNumber && (
                                  <Badge className="bg-purple-100 text-purple-700">{leave.rollNumber}</Badge>
                                )}
                                {leave.empId && (
                                  <Badge className="bg-purple-100 text-purple-700">{leave.empId}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {leave.department?.toUpperCase()}
                                {leave.year && ` • Year ${leave.year}`}
                                {leave.section && ` • Section ${leave.section}`}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className={getStatusColor(leave.finalStatus)}>
                                {getStatusIcon(leave.finalStatus)}
                                <span className="ml-1">{leave.finalStatus}</span>
                              </Badge>
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                {getLeaveTypeLabel(leave.leaveType)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDateRange(leave.fromDate, leave.toDate)}
                            <span className="text-gray-400 ml-2">({calculateLeaveDuration(leave.fromDate, leave.toDate)} day(s))</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{leave.reason}</p>

                          {/* Approval status */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {leave.finalStatus !== 'Pending' ? (
                              <Badge className={getStatusColor(leave.finalStatus)}>
                                {getStatusIcon(leave.finalStatus)}
                                <span className="ml-1">{leave.finalStatus}</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Clock className="w-3 h-3 mr-1" />
                                Awaiting approval
                              </Badge>
                            )}
                            {leave.facultyApproval?.status === 'Approved' && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Faculty Approved
                              </Badge>
                            )}
                            {leave.hodApproval?.status === 'Approved' && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                HOD Approved
                              </Badge>
                            )}
                            {leave.principalApproval?.status === 'Approved' && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Principal Approved
                              </Badge>
                            )}
                            {leave.facultyApproval?.status === 'Rejected' && (
                              <Badge className="bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3 mr-1" />
                                Faculty Rejected
                              </Badge>
                            )}
                            {leave.hodApproval?.status === 'Rejected' && (
                              <Badge className="bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3 mr-1" />
                                HOD Rejected
                              </Badge>
                            )}
                            {leave.principalApproval?.status === 'Rejected' && (
                              <Badge className="bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3 mr-1" />
                                Principal Rejected
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>
            </TabsContent>

            {/* My History Tab */}
            <TabsContent value="history">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  My Leave History
                </h2>

                {myLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No leave requests found</p>
                    <p className="text-sm text-gray-400 mt-1">Your leave applications will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myLeaves.map((leave) => (
                      <div 
                        key={leave.id}
                        onClick={() => openDetailsDialog(leave)}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge className="bg-purple-100 text-purple-700 mb-2">
                              {getLeaveTypeLabel(leave.leaveType)}
                            </Badge>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDateRange(leave.fromDate, leave.toDate)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {calculateLeaveDuration(leave.fromDate, leave.toDate)} day(s)
                            </p>
                          </div>
                          <Badge className={getStatusColor(leave.finalStatus)}>
                            {getStatusIcon(leave.finalStatus)}
                            <span className="ml-1">{leave.finalStatus}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{leave.reason}</p>
                        {leave.finalStatus === 'Pending' && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className={getStatusColor(leave.principalApproval?.status || 'Pending')}>
                              Principal: {leave.principalApproval?.status || 'Pending'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Leave Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Leave Request Details</DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : selectedLeave && (
            <div className="space-y-4 py-4">
              {/* Applicant Info (for department leaves) */}
              {selectedLeave.name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-blue-100 text-blue-700">
                      {getRoleLabel(selectedLeave.applicantRole)}
                    </Badge>
                    <Badge className={getStatusColor(selectedLeave.finalStatus)}>
                      {getStatusIcon(selectedLeave.finalStatus)}
                      <span className="ml-1">{selectedLeave.finalStatus}</span>
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedLeave.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1 mt-2">
                    <p><span className="font-medium">Department:</span> {selectedLeave.department?.toUpperCase()}</p>
                    {selectedLeave.rollNumber && (
                      <p><span className="font-medium">Roll Number:</span> {selectedLeave.rollNumber}</p>
                    )}
                    {selectedLeave.empId && (
                      <p><span className="font-medium">Employee ID:</span> {selectedLeave.empId}</p>
                    )}
                    {selectedLeave.year && (
                      <p><span className="font-medium">Year:</span> {selectedLeave.year} {selectedLeave.section && `• Section ${selectedLeave.section}`}</p>
                    )}
                    {selectedLeave.designation && (
                      <p><span className="font-medium">Designation:</span> {selectedLeave.designation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Leave Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Badge className="bg-purple-100 text-purple-700 mb-2">
                  {getLeaveTypeLabel(selectedLeave.leaveType)}
                </Badge>
                <p className="text-sm font-medium text-gray-900">
                  {formatDateRange(selectedLeave.fromDate, selectedLeave.toDate)}
                  <span className="text-gray-500 font-normal ml-2">
                    ({calculateLeaveDuration(selectedLeave.fromDate, selectedLeave.toDate)} day(s))
                  </span>
                </p>
                <p className="text-sm text-gray-700 mt-2">{selectedLeave.reason}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Applied: {new Date(selectedLeave.appliedAt).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Approval Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Approval Status
                </h4>
                
                {/* Faculty Approval (for student leaves) */}
                {selectedLeave.applicantRole === 'student' && selectedLeave.facultyApproval?.status !== 'N/A' && (
                  <div className={`p-3 rounded-lg border ${
                    selectedLeave.facultyApproval?.status === 'Approved' ? 'bg-green-50 border-green-200' :
                    selectedLeave.facultyApproval?.status === 'Rejected' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Class Advisor</span>
                      <Badge className={
                        selectedLeave.facultyApproval?.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        selectedLeave.facultyApproval?.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {selectedLeave.facultyApproval?.status || 'Pending'}
                      </Badge>
                    </div>
                    {selectedLeave.facultyApproval?.approverName && (
                      <p className="text-xs text-gray-600 mt-1">Reviewed by: {selectedLeave.facultyApproval.approverName}</p>
                    )}
                    {selectedLeave.facultyApproval?.remarks && (
                      <p className="text-xs text-gray-600 mt-1">Remarks: {selectedLeave.facultyApproval.remarks}</p>
                    )}
                  </div>
                )}

                {/* HOD Approval */}
                {selectedLeave.hodApproval?.status !== 'N/A' && (
                  <div className={`p-3 rounded-lg border ${
                    selectedLeave.hodApproval?.status === 'Approved' ? 'bg-green-50 border-green-200' :
                    selectedLeave.hodApproval?.status === 'Rejected' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">HOD</span>
                      <Badge className={
                        selectedLeave.hodApproval?.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        selectedLeave.hodApproval?.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {selectedLeave.hodApproval?.status || 'Pending'}
                      </Badge>
                    </div>
                    {selectedLeave.hodApproval?.approverName && (
                      <p className="text-xs text-gray-600 mt-1">Reviewed by: {selectedLeave.hodApproval.approverName}</p>
                    )}
                    {selectedLeave.hodApproval?.remarks && (
                      <p className="text-xs text-gray-600 mt-1">Remarks: {selectedLeave.hodApproval.remarks}</p>
                    )}
                  </div>
                )}

                {/* Principal Approval */}
                <div className={`p-3 rounded-lg border ${
                  selectedLeave.principalApproval?.status === 'Approved' ? 'bg-green-50 border-green-200' :
                  selectedLeave.principalApproval?.status === 'Rejected' ? 'bg-red-50 border-red-200' :
                  selectedLeave.principalApproval?.status === 'N/A' ? 'bg-gray-100 border-gray-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Principal</span>
                    <Badge className={
                      selectedLeave.principalApproval?.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      selectedLeave.principalApproval?.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      selectedLeave.principalApproval?.status === 'N/A' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {selectedLeave.principalApproval?.status || 'Pending'}
                    </Badge>
                  </div>
                  {selectedLeave.principalApproval?.approverName && (
                    <p className="text-xs text-gray-600 mt-1">Reviewed by: {selectedLeave.principalApproval.approverName}</p>
                  )}
                  {selectedLeave.principalApproval?.remarks && (
                    <p className="text-xs text-gray-600 mt-1">Remarks: {selectedLeave.principalApproval.remarks}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Review Leave Request</DialogTitle>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-900">{selectedLeave.name}</span>
                  <Badge className="bg-blue-100 text-blue-700">
                    {getRoleLabel(selectedLeave.applicantRole)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Department:</span> {selectedLeave.department?.toUpperCase()}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Leave Type:</span> {getLeaveTypeLabel(selectedLeave.leaveType)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Duration:</span> {formatDateRange(selectedLeave.fromDate, selectedLeave.toDate)}
                  {' '}({calculateLeaveDuration(selectedLeave.fromDate, selectedLeave.toDate)} day(s))
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Reason:</span> {selectedLeave.reason}
                </p>
              </div>

              <div>
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  placeholder="Add remarks for the applicant..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
