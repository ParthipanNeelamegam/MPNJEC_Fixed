import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { Home, FileCheck, TrendingUp, Building, Award, Loader2, Clock, CheckCircle, XCircle, Users, GraduationCap, UserCog, CalendarDays, Info, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { 
  getPendingLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveDetails,
  getLeaveTypeLabel, 
  getStatusColor, 
  getRoleLabel,
  formatDateRange,
  calculateLeaveDuration,
  type LeaveRequest 
} from '../../services/leaveService.js';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: FileCheck, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: TrendingUp, label: 'Reports', path: '/principal/reports' },
  { icon: Building, label: 'Departments', path: '/principal/departments' },
  { icon: Award, label: 'Achievements', path: '/principal/achievements' },
];

export default function PrincipalLeaveApprovals() {
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes] = await Promise.all([
        getPendingLeaveRequests().catch(() => ({ data: { leaves: [] } })),
        getAllLeaveRequests({ limit: 100 }).catch(() => ({ data: { leaves: [] } }))
      ]);
      setPendingLeaves(pendingRes.data.leaves || []);
      setAllLeaves(allRes.data.leaves || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="w-4 h-4" />;
      case 'faculty':
        return <Users className="w-4 h-4" />;
      case 'hod':
        return <UserCog className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  // Group pending leaves by role
  const studentLeaves = pendingLeaves.filter(l => l.applicantRole === 'student');
  const facultyLeaves = pendingLeaves.filter(l => l.applicantRole === 'faculty');
  const hodLeaves = pendingLeaves.filter(l => l.applicantRole === 'hod');

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leave Approvals</h1>
          <p className="text-gray-600">Review and approve leave requests from all departments (any single approval finalizes the request)</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
              <Clock className="w-6 h-6 mb-2" />
              <div className="text-2xl font-bold">{pendingLeaves.length}</div>
              <div className="text-yellow-100 text-sm">Total Pending</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <GraduationCap className="w-6 h-6 mb-2" />
              <div className="text-2xl font-bold">{studentLeaves.length}</div>
              <div className="text-blue-100 text-sm">Student Leaves</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <Users className="w-6 h-6 mb-2" />
              <div className="text-2xl font-bold">{facultyLeaves.length}</div>
              <div className="text-purple-100 text-sm">Faculty Leaves</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <UserCog className="w-6 h-6 mb-2" />
              <div className="text-2xl font-bold">{hodLeaves.length}</div>
              <div className="text-green-100 text-sm">HOD Leaves</div>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending">
                Pending
                {pendingLeaves.length > 0 && (
                  <Badge className="ml-2 bg-red-100 text-red-700">{pendingLeaves.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="students">
                Students
                {studentLeaves.length > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-700">{studentLeaves.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="faculty">
                Faculty
                {facultyLeaves.length > 0 && (
                  <Badge className="ml-2 bg-purple-100 text-purple-700">{facultyLeaves.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="hod">
                HOD
                {hodLeaves.length > 0 && (
                  <Badge className="ml-2 bg-green-100 text-green-700">{hodLeaves.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* All Pending Tab */}
            <TabsContent value="pending">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">All Pending Leave Requests</h2>
                
                {pendingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-300 mb-4" />
                    <p className="text-gray-500">No pending leave requests</p>
                    <p className="text-sm text-gray-400 mt-1">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <LeaveCard 
                        key={leave.id} 
                        leave={leave} 
                        onReview={() => openReviewDialog(leave)}
                        onViewDetails={() => openDetailsDialog(leave)}
                        getRoleIcon={getRoleIcon}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Student Leave Requests
                </h2>
                
                {studentLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-300 mb-4" />
                    <p className="text-gray-500">No pending student leave requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentLeaves.map((leave) => (
                      <LeaveCard 
                        key={leave.id} 
                        leave={leave} 
                        onReview={() => openReviewDialog(leave)}
                        onViewDetails={() => openDetailsDialog(leave)}
                        getRoleIcon={getRoleIcon}
                        showApprovalChain
                      />
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Faculty Tab */}
            <TabsContent value="faculty">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Faculty Leave Requests
                </h2>
                
                {facultyLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-300 mb-4" />
                    <p className="text-gray-500">No pending faculty leave requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {facultyLeaves.map((leave) => (
                      <LeaveCard 
                        key={leave.id} 
                        leave={leave} 
                        onReview={() => openReviewDialog(leave)}
                        onViewDetails={() => openDetailsDialog(leave)}
                        getRoleIcon={getRoleIcon}
                        showApprovalChain
                      />
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* HOD Tab */}
            <TabsContent value="hod">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-green-600" />
                  HOD Leave Requests
                </h2>
                
                {hodLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-300 mb-4" />
                    <p className="text-gray-500">No pending HOD leave requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hodLeaves.map((leave) => (
                      <LeaveCard 
                        key={leave.id} 
                        leave={leave} 
                        onReview={() => openReviewDialog(leave)}
                        onViewDetails={() => openDetailsDialog(leave)}
                        getRoleIcon={getRoleIcon}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Leave History</h2>
                
                {allLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No leave records found</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {allLeaves.map((leave) => (
                      <div 
                        key={leave.id}
                        onClick={() => openDetailsDialog(leave)}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{leave.name}</span>
                            <Badge className="bg-gray-100 text-gray-700">
                              {getRoleIcon(leave.applicantRole)}
                              <span className="ml-1">{getRoleLabel(leave.applicantRole)}</span>
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-700">{leave.department}</Badge>
                          </div>
                          <Badge className={getStatusColor(leave.finalStatus)}>
                            {getStatusIcon(leave.finalStatus)}
                            <span className="ml-1">{leave.finalStatus}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDateRange(leave.fromDate, leave.toDate)} ({calculateLeaveDuration(leave.fromDate, leave.toDate)} days)
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{leave.reason}</p>
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
              {/* Applicant Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-gray-100 text-gray-700">
                    {getRoleIcon(selectedLeave.applicantRole)}
                    <span className="ml-1">{getRoleLabel(selectedLeave.applicantRole)}</span>
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
                
                {/* Faculty Approval (for students) */}
                {selectedLeave.applicantRole === 'student' && selectedLeave.facultyApproval?.status !== 'N/A' && (
                  <div className={`p-3 rounded-lg border ${
                    selectedLeave.facultyApproval?.status === 'Approved' ? 'bg-green-50 border-green-200' :
                    selectedLeave.facultyApproval?.status === 'Rejected' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Faculty</span>
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
                  <Badge className="bg-gray-100 text-gray-700">
                    {getRoleIcon(selectedLeave.applicantRole)}
                    <span className="ml-1">{getRoleLabel(selectedLeave.applicantRole)}</span>
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

// Leave Card Component
interface LeaveCardProps {
  leave: LeaveRequest;
  onReview: () => void;
  onViewDetails: () => void;
  getRoleIcon: (role: string) => JSX.Element;
  showApprovalChain?: boolean;
}

function LeaveCard({ leave, onReview, onViewDetails, getRoleIcon, showApprovalChain }: LeaveCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-gray-900">{leave.name}</span>
            <Badge className="bg-gray-100 text-gray-700">
              {getRoleIcon(leave.applicantRole)}
              <span className="ml-1">{getRoleLabel(leave.applicantRole)}</span>
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

      {/* Show prior approvals */}
      {showApprovalChain && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {leave.applicantRole === 'student' && leave.facultyApproval?.status === 'Approved' && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Faculty Approved
            </Badge>
          )}
          {(leave.applicantRole === 'student' || leave.applicantRole === 'faculty') && 
           leave.hodApproval?.status === 'Approved' && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              HOD Approved
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={onViewDetails}
        >
          <Eye className="w-4 h-4 mr-1" />
          Details
        </Button>
        <Button 
          size="sm" 
          onClick={onReview}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Approve
        </Button>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={onReview}
        >
          <XCircle className="w-4 h-4 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}
