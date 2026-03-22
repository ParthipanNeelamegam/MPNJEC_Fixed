import { Home, User, BookOpen, Calendar as CalendarIcon, DollarSign, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Calendar } from '../ui/calendar';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { useState, useEffect } from 'react';
import { applyLeave, getMyLeaves, fetchStudentAttendance, type LeaveApplication } from '../../services/studentModuleService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: CalendarIcon, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

type SubjectAttendance = {
  subject: string;
  total: number;
  attended: number;
  percentage: number;
};

export default function StudentAttendance() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Attendance state
  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendance[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number>(0);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  
  // Leave state
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [leavesLoading, setLeavesLoading] = useState<boolean>(true);
  const [leavesError, setLeavesError] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState<Date | undefined>(undefined);
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  useEffect(() => {
    loadAttendance();
    loadLeaves();
  }, []);

  const loadAttendance = async () => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const res = await fetchStudentAttendance();
      if (res.data.message && !res.data.subjectAttendance) {
        // No attendance data or student profile not found
        setAttendanceError(res.data.message);
        setSubjectAttendance([]);
        setOverallPercentage(0);
      } else {
        // Transform subject attendance from object to array
        const subjects = res.data.subjectAttendance || {};
        const subjectArr: SubjectAttendance[] = Object.entries(subjects).map(([subject, data]: [string, any]) => ({
          subject,
          total: data.total,
          attended: data.attended,
          percentage: data.total > 0 ? (data.attended / data.total) * 100 : 0,
        }));
        setSubjectAttendance(subjectArr);
        setOverallPercentage(parseFloat(res.data.overallPercentage) || 0);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load attendance';
      setAttendanceError(errorMsg);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadLeaves = async () => {
    setLeavesLoading(true);
    setLeavesError(null);
    try {
      const res = await getMyLeaves();
      setLeaves(res.data.leaves || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load leaves';
      setLeavesError(errorMsg);
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  };

  const handleApplyLeave = async () => {
    if (!leaveDate || !leaveReason.trim()) {
      toast.error("Please select a date and provide a reason");
      return;
    }

    setSubmittingLeave(true);
    try {
      await applyLeave(leaveDate.toISOString(), leaveReason.trim());
      toast.success("Leave application submitted successfully");
      setLeaveDialogOpen(false);
      setLeaveDate(undefined);
      setLeaveReason('');
      loadLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to submit leave application");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  // Check if student profile exists (no "Student profile not found" error)
  const hasStudentProfile = !attendanceError?.includes('Student profile not found') && 
                           !leavesError?.includes('Student profile not found');

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Tracker</h1>
          <p className="text-gray-600">Monitor your attendance and stay on track</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Student Profile Not Found Warning */}
          {!hasStudentProfile && (
            <Card className="p-4 mb-6 bg-amber-50 border-amber-200 border">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Student Profile Not Set Up</p>
                  <p className="text-sm text-amber-700">Please contact the admin to complete your student profile setup.</p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="md:col-span-2 p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Subject-wise Attendance</h2>
              {attendanceLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, idx) => (
                    <div key={idx} className="h-12 bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : attendanceError && hasStudentProfile ? (
                <p className="text-gray-500 text-center py-8">{attendanceError}</p>
              ) : subjectAttendance.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No attendance data available</p>
              ) : (
                <div className="space-y-4">
                  {subjectAttendance.map((subject, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{subject.subject}</span>
                        <div className="text-right">
                          <span className="font-bold text-gray-900">{subject.percentage.toFixed(1)}%</span>
                          <span className="text-sm text-gray-600 ml-2">({subject.attended}/{subject.total})</span>
                        </div>
                      </div>
                      <Progress 
                        value={subject.percentage} 
                        className={`h-3 ${
                          subject.percentage >= 85 ? '[&>div]:bg-green-500' :
                          subject.percentage >= 75 ? '[&>div]:bg-amber-500' :
                          '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Overall Attendance:</span>
                  <span className="text-3xl font-bold text-blue-600">{overallPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Calendar</h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
  
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
             
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <span className="text-sm text-gray-600">Holiday</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Leave Request Section */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Leave Applications</h2>
              <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!hasStudentProfile}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Apply for Leave
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply for Leave</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Select Date <span className="text-red-500">*</span></label>
                      <Calendar
                        mode="single"
                        selected={leaveDate}
                        onSelect={setLeaveDate}
                        className="rounded-md border"
                        disabled={(date) => date < new Date()}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Reason for Leave <span className="text-red-500">*</span></label>
                      <Textarea
                        placeholder="Please provide the reason for your leave..."
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        rows={3}
                        required
                      />
                      {!leaveReason.trim() && <p className="text-xs text-red-500 mt-1">Reason is required</p>}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleApplyLeave} 
                      disabled={submittingLeave || !leaveDate || !leaveReason.trim()}
                    >
                      {submittingLeave ? "Submitting..." : "Submit Application"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {leavesLoading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, idx) => (
                  <div key={idx} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : leavesError && hasStudentProfile ? (
              <p className="text-red-500 text-center py-8">{leavesError}</p>
            ) : leaves.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No leave applications yet</p>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {new Date(leave.date).toLocaleDateString('en-IN', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                          {getStatusBadge(leave.status)}
                        </div>
                        <p className="text-gray-600 text-sm">{leave.reason}</p>
                        {leave.remarks && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            Faculty remarks: {leave.remarks}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        Applied: {new Date(leave.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}

