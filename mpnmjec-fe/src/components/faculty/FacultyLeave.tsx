import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, Calendar, FileText, ClipboardList, GraduationCap, Loader2, Clock, CheckCircle, XCircle, Send, CalendarDays, AlertCircle, Eye } from 'lucide-react';
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
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveDetails,
  getLeaveTypeLabel, 
  getStatusColor, 
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
  isClassAdvisor?: boolean;
  advisorFor?: { year: number; section?: string; department?: string };
}

const baseNavItems = [
  { icon: Home, label: 'Dashboard', path: '/faculty/dashboard' },
  { icon: Users, label: 'Students', path: '/faculty/students' },
  { icon: BookOpen, label: 'Courses', path: '/faculty/courses' },
  { icon: Calendar, label: 'Attendance', path: '/faculty/attendance' },
  { icon: FileText, label: 'Materials', path: '/faculty/materials' },
  { icon: ClipboardList, label: 'Marks Entry', path: '/faculty/marks' },
  { icon: CalendarDays, label: 'Leave', path: '/faculty/leave' },
];

const advisorNavItems = [
  { icon: GraduationCap, label: 'My Class', path: '/faculty/advisor/class' },
];

const getNavItems = (isClassAdvisor: boolean) => {
  if (isClassAdvisor) {
    return [...baseNavItems, ...advisorNavItems];
  }
  return baseNavItems;
};

export default function FacultyLeave() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('apply');

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
          name: decoded.name || 'Faculty',
          role: decoded.role,
          department: decoded.department,
          isClassAdvisor: decoded.isClassAdvisor || false,
          advisorFor: decoded.advisorFor || null,
        });
      }
    }
    
    loadLeaveRequests();
  }, []);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const [myRes, pendingRes] = await Promise.all([
        getMyLeaveRequests(),
        getPendingLeaveRequests().catch(() => ({ data: { leaves: [] } }))
      ]);
      setLeaves(myRes.data.leaves || []);
      setPendingLeaves(pendingRes.data.leaves || []);
    } catch (error: any) {
      console.error('Failed to load leave requests:', error);
      toast.error(error.response?.data?.error || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [myRes, pendingRes] = await Promise.all([
        getMyLeaveRequests(),
        getPendingLeaveRequests().catch(() => ({ data: { leaves: [] } }))
      ]);
      setLeaves(myRes.data.leaves || []);
      setPendingLeaves(pendingRes.data.leaves || []);
    } catch (error: any) {
      console.error('Failed to reload data:', error);
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
      loadLeaveRequests();
    } catch (error: any) {
      console.error('Failed to apply leave:', error);
      toast.error(error.response?.data?.error || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailsDialog = async (leave: LeaveRequest) => {
    setDetailsDialogOpen(true);
    try {
      const res = await getLeaveDetails(leave.id);
      setSelectedLeave(res.data.leave);
    } catch {
      setSelectedLeave(leave);
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
        <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600">
            Apply for leave and track your requests
            {userInfo?.isClassAdvisor && <span className="ml-2 text-blue-600">• Class Advisor</span>}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="apply">Apply Leave</TabsTrigger>
              {userInfo?.isClassAdvisor && (
                <TabsTrigger value="approvals">
                  Student Approvals
                  {pendingLeaves.length > 0 && (
                    <Badge className="ml-2 bg-red-100 text-red-700">{pendingLeaves.length}</Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="history">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="apply">
            <div className="grid lg:grid-cols-2 gap-6">
            {/* Apply Leave Form */}
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
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              {userInfo?.isClassAdvisor && (
                <Card className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
                  <div className="text-3xl font-bold">{pendingLeaves.length}</div>
                  <div className="text-yellow-100">Student Leaves to Review</div>
                </Card>
              )}
              <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <div className="text-3xl font-bold">{leaves.length}</div>
                <div className="text-blue-100">My Applications</div>
              </Card>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Approval Workflow</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Faculty leave can be approved by: <span className="font-medium">HOD or Principal</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>
            </TabsContent>

            {/* Student Leave Approvals Tab - Class Advisors Only */}
            {userInfo?.isClassAdvisor && (
              <TabsContent value="approvals">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                    Student Leave Requests
                    {pendingLeaves.length > 0 && (
                      <Badge className="ml-3 bg-red-100 text-red-700">{pendingLeaves.length}</Badge>
                    )}
                  </h2>

                  {pendingLeaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-300 mb-4" />
                      <p className="text-gray-500">No pending student leave requests</p>
                      <p className="text-sm text-gray-400 mt-1">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingLeaves.map((leave) => (
                        <div key={leave.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900">{leave.name}</span>
                                {leave.rollNumber && (
                                  <Badge className="bg-purple-100 text-purple-700">{leave.rollNumber}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {leave.department?.toUpperCase()}
                                {leave.year && ` \u00b7 Year ${leave.year}`}
                                {leave.section && ` \u00b7 Section ${leave.section}`}
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
                            <Button size="sm" variant="outline" onClick={() => openDetailsDialog(leave)}>
                              <Eye className="w-4 h-4 mr-1" /> Details
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openReviewDialog(leave)}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => openReviewDialog(leave)}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            )}

            <TabsContent value="history">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                My Leave History
              </h2>

              {leaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No leave requests found</p>
                  <p className="text-sm text-gray-400 mt-1">Your leave applications will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {leaves.map((leave) => (
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
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Awaiting approval from HOD or Principal
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

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>

      {/* Leave Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Leave Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-100 text-purple-700">
                  {getLeaveTypeLabel(selectedLeave.leaveType)}
                </Badge>
                <Badge className={getStatusColor(selectedLeave.finalStatus)}>
                  {getStatusIcon(selectedLeave.finalStatus)}
                  <span className="ml-1">{selectedLeave.finalStatus}</span>
                </Badge>
              </div>

              {/* Applicant Info (for student leaves being reviewed) */}
              {selectedLeave.name && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-gray-900">{selectedLeave.name}</h3>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {selectedLeave.rollNumber && <p>Roll: {selectedLeave.rollNumber}</p>}
                    {selectedLeave.department && (
                      <p>
                        {selectedLeave.department.toUpperCase()}
                        {selectedLeave.year ? ` \u00b7 Year ${selectedLeave.year}` : ''}
                        {selectedLeave.section ? ` \u00b7 Section ${selectedLeave.section}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Duration:</span> {formatDateRange(selectedLeave.fromDate, selectedLeave.toDate)}
                  {' '}({calculateLeaveDuration(selectedLeave.fromDate, selectedLeave.toDate)} day(s))
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Reason:</span> {selectedLeave.reason}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Applied:</span> {new Date(selectedLeave.appliedAt).toLocaleDateString('en-IN', { 
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
                <h4 className="font-medium text-gray-900">Approval Status</h4>
                
                {/* Faculty Approval (for student leaves) */}
                {selectedLeave.facultyApproval?.status !== 'N/A' && (
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
                {selectedLeave.principalApproval?.status !== 'N/A' && (
                  <div className={`p-3 rounded-lg border ${
                    selectedLeave.principalApproval?.status === 'Approved' ? 'bg-green-50 border-green-200' :
                    selectedLeave.principalApproval?.status === 'Rejected' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Principal</span>
                      <Badge className={
                        selectedLeave.principalApproval?.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        selectedLeave.principalApproval?.status === 'Rejected' ? 'bg-red-100 text-red-700' :
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
                )}
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
                  {selectedLeave.rollNumber && (
                    <Badge className="bg-purple-100 text-purple-700">{selectedLeave.rollNumber}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Department:</span> {selectedLeave.department?.toUpperCase()}
                  {selectedLeave.year && ` \u00b7 Year ${selectedLeave.year}`}
                  {selectedLeave.section && ` \u00b7 Section ${selectedLeave.section}`}
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
                  placeholder="Add remarks for the student..."
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
