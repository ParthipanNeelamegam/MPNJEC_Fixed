import { useState, useEffect } from 'react';
import {
  Home, User, BookOpen, Calendar, DollarSign, CalendarDays,
  Loader2, Clock, CheckCircle, XCircle, Send, AlertCircle, Info
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import {
  applyForLeave,
  getMyLeaveRequests,
  getLeaveDetails,
  getLeaveTypeLabel,
  getStatusColor,
  formatDateRange,
  calculateLeaveDuration,
  type LeaveRequest,
} from '../../services/leaveService';
import { getAccessToken } from '../../utils/token';

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
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
  { icon: CalendarDays, label: 'Leave', path: '/student/leave' },
];

export default function StudentLeave() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('apply');

  // Form state
  const [leaveType, setLeaveType] = useState<string>('casual');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUserInfo({
          id: decoded.id,
          name: decoded.name || 'Student',
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
      const res = await getMyLeaveRequests();
      setMyLeaves(res.data.leaves || []);
    } catch (error: any) {
      console.error('Failed to load leaves:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromDate || !toDate || !reason.trim()) {
      toast.error('Please fill in all required fields');
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

      // Reload leaves and switch to history tab
      loadData();
      setActiveTab('history');
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
    } catch {
      toast.error('Failed to load leave details');
      setSelectedLeave(leave);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'Pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const pendingCount = myLeaves.filter(l => l.finalStatus === 'Pending').length;
  const approvedCount = myLeaves.filter(l => l.finalStatus === 'Approved').length;
  const rejectedCount = myLeaves.filter(l => l.finalStatus === 'Rejected').length;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Student Portal" subtitle="" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle={userInfo?.name || ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600">Apply for leave & track your requests</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="p-3 text-center bg-yellow-50 border border-yellow-200">
              <div className="text-xl font-bold text-yellow-700">{pendingCount}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </Card>
            <Card className="p-3 text-center bg-green-50 border border-green-200">
              <div className="text-xl font-bold text-green-700">{approvedCount}</div>
              <div className="text-xs text-green-600">Approved</div>
            </Card>
            <Card className="p-3 text-center bg-red-50 border border-red-200">
              <div className="text-xl font-bold text-red-700">{rejectedCount}</div>
              <div className="text-xs text-red-600">Rejected</div>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="apply">
                <Send className="w-4 h-4 mr-2" />
                Apply Leave
              </TabsTrigger>
              <TabsTrigger value="history">
                <Clock className="w-4 h-4 mr-2" />
                My Requests
                {pendingCount > 0 && (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-700">{pendingCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Apply Leave Tab */}
            <TabsContent value="apply">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Apply for Leave</h2>

                <form onSubmit={handleApplyLeave} className="space-y-4">
                  <div>
                    <Label htmlFor="leaveType" className="text-sm font-medium text-gray-700">
                      Leave Type
                    </Label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger className="mt-1.5">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromDate" className="text-sm font-medium text-gray-700">
                        From Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="mt-1.5"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="toDate" className="text-sm font-medium text-gray-700">
                        To Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="mt-1.5"
                        min={fromDate || undefined}
                        required
                      />
                    </div>
                  </div>

                  {fromDate && toDate && new Date(fromDate) <= new Date(toDate) && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                      Duration: {calculateLeaveDuration(fromDate, toDate)} day(s)
                    </div>
                  )}

                  <div>
                    <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
                      Reason <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please provide a detailed reason for your leave request..."
                      className="mt-1.5 min-h-[100px]"
                      required
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700">
                      Your leave request will be sent to your class advisor, HOD, or Principal for approval.
                      Any one of them can approve or reject your request.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Submit Leave Request</>
                    )}
                  </Button>
                </form>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  My Leave Requests
                  {myLeaves.length > 0 && (
                    <Badge className="ml-3 bg-blue-100 text-blue-700">{myLeaves.length}</Badge>
                  )}
                </h2>

                {myLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No leave requests yet</p>
                    <p className="text-sm text-gray-400 mt-1">Apply for leave using the "Apply Leave" tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myLeaves.map((leave) => (
                      <div
                        key={leave.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => openDetailsDialog(leave)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(leave.finalStatus)}
                            <Badge className={getStatusColor(leave.finalStatus)}>
                              {leave.finalStatus}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-700">
                              {getLeaveTypeLabel(leave.leaveType)}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(leave.appliedAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {formatDateRange(leave.fromDate, leave.toDate)}
                          <span className="text-gray-500 font-normal ml-2">
                            ({calculateLeaveDuration(leave.fromDate, leave.toDate)} day(s))
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">{leave.reason}</p>

                        {/* Approval Status */}
                        <div className="flex gap-4 mt-3 text-xs">
                          {leave.facultyApproval && leave.facultyApproval.status !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Faculty:</span>
                              <Badge className={`text-xs ${getStatusColor(leave.facultyApproval.status)}`}>
                                {leave.facultyApproval.status}
                              </Badge>
                            </div>
                          )}
                          {leave.hodApproval && leave.hodApproval.status !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">HOD:</span>
                              <Badge className={`text-xs ${getStatusColor(leave.hodApproval.status)}`}>
                                {leave.hodApproval.status}
                              </Badge>
                            </div>
                          )}
                          {leave.principalApproval && leave.principalApproval.status !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Principal:</span>
                              <Badge className={`text-xs ${getStatusColor(leave.principalApproval.status)}`}>
                                {leave.principalApproval.status}
                              </Badge>
                            </div>
                          )}
                        </div>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : selectedLeave ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(selectedLeave.finalStatus)}>
                  {selectedLeave.finalStatus}
                </Badge>
                <Badge className="bg-purple-100 text-purple-700">
                  {getLeaveTypeLabel(selectedLeave.leaveType)}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date Range</p>
                  <p className="font-medium text-gray-900">
                    {formatDateRange(selectedLeave.fromDate, selectedLeave.toDate)}
                    <span className="text-gray-500 font-normal ml-2">
                      ({calculateLeaveDuration(selectedLeave.fromDate, selectedLeave.toDate)} day(s))
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reason</p>
                  <p className="text-sm text-gray-700">{selectedLeave.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Applied On</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedLeave.appliedAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Approval Status */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Approval Status</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Class Advisor (Faculty)', approval: selectedLeave.facultyApproval },
                    { label: 'HOD', approval: selectedLeave.hodApproval },
                    { label: 'Principal', approval: selectedLeave.principalApproval },
                  ].filter(item => item.approval && item.approval.status !== 'N/A').map((item) => (
                    <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(item.approval!.status)}>
                          {item.approval!.status}
                        </Badge>
                        {item.approval?.approverName && (
                          <span className="text-xs text-gray-500">by {item.approval.approverName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              {[selectedLeave.facultyApproval, selectedLeave.hodApproval, selectedLeave.principalApproval]
                .filter(a => a?.remarks)
                .map((a, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-amber-600 font-medium mb-1">
                          Remarks{a?.approverName ? ` by ${a.approverName}` : ''}
                        </p>
                        <p className="text-sm text-amber-800">{a?.remarks}</p>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
