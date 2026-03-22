import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, Search, Filter, Download, TrendingUp, CheckCircle, Clock, AlertCircle, UserCog, Crown, Loader2, Library, Plus, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getFeeRecords, getFeeSummary, createFeeRecord, recordPayment, getStudents } from '../../services/adminService';
import { toast } from 'sonner';

interface FeeRecord {
  id: string;
  studentId: string;
  roll: string;
  name: string;
  department: string;
  year: number;
  totalFee: number;
  paid: number;
  pending: number;
  status: string;
  lastPayment: string;
}

interface DepartmentSummary {
  dept: string;
  students: number;
  collected: number;
  pending: number;
  percentage: number;
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

export default function AdminFees() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [departmentSummary, setDepartmentSummary] = useState<DepartmentSummary[]>([]);

  // Add Fee dialog
  const [showAddFeeDialog, setShowAddFeeDialog] = useState(false);
  const [addingFee, setAddingFee] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [addFeeData, setAddFeeData] = useState({
    studentId: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    semester: '1',
    totalAmount: '',
    dueDate: '',
  });

  // Record Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecord | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash' as 'online' | 'cash' | 'cheque' | 'dd',
    transactionId: '',
    remarks: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, summaryRes] = await Promise.all([
        getFeeRecords(),
        getFeeSummary(),
      ]);

      const rawRecords = recordsRes.data?.fees || [];
      const rawSummary = summaryRes.data?.departmentSummary || [];

      setFeeRecords(rawRecords.map((fee: any) => ({
        id: fee._id,
        studentId: fee.studentId || fee._id,
        roll: fee.rollNumber || '-',
        name: fee.studentName || 'Unknown',
        department: fee.department || '-',
        year: fee.year || '-',
        totalFee: fee.totalAmount || 0,
        paid: fee.paidAmount || 0,
        pending: fee.pendingAmount || 0,
        status: fee.status || 'pending',
        lastPayment: fee.lastPaymentDate
          ? new Date(fee.lastPaymentDate).toLocaleDateString('en-IN')
          : '-',
      })));

      setDepartmentSummary(rawSummary.map((s: any) => ({
        dept: s.department || '-',
        students: s.totalStudents || 0,
        collected: s.collectedAmount || 0,
        pending: s.pendingAmount || 0,
        percentage: s.collectionRate || 0,
      })));
    } catch (error) {
      toast.error('Failed to load fee records');
    } finally {
      setLoading(false);
    }
  };

  const openAddFeeDialog = async () => {
    try {
      const res = await getStudents();
      setAllStudents(res.data?.students || []);
    } catch {
      toast.error('Failed to load students');
    }
    setShowAddFeeDialog(true);
  };

  const handleAddFee = async () => {
    if (!addFeeData.studentId || !addFeeData.totalAmount || !addFeeData.dueDate) {
      toast.error('Student, total amount and due date are required');
      return;
    }
    try {
      setAddingFee(true);
      await createFeeRecord({
        studentId: addFeeData.studentId,
        academicYear: addFeeData.academicYear,
        semester: parseInt(addFeeData.semester),
        totalAmount: parseFloat(addFeeData.totalAmount),
        dueDate: addFeeData.dueDate,
      });
      toast.success('Fee record created successfully');
      setShowAddFeeDialog(false);
      setAddFeeData({ studentId: '', academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, semester: '1', totalAmount: '', dueDate: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create fee record');
    } finally {
      setAddingFee(false);
    }
  };

  const openPaymentDialog = (record: FeeRecord) => {
    setSelectedFeeRecord(record);
    setPaymentData({ amount: '', method: 'cash', transactionId: '', remarks: '' });
    setShowPaymentDialog(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (!selectedFeeRecord) return;
    try {
      setRecordingPayment(true);
      await recordPayment(selectedFeeRecord.id, {
        amount: parseFloat(paymentData.amount),
        method: paymentData.method,
        transactionId: paymentData.transactionId || undefined,
        remarks: paymentData.remarks || undefined,
      });
      toast.success('Payment recorded successfully');
      setShowPaymentDialog(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('No records to export');
      return;
    }
    const headers = ['Roll No', 'Name', 'Department', 'Year', 'Total Fee', 'Paid', 'Pending', 'Status', 'Last Payment'];
    const rows = filteredRecords.map(r => [
      r.roll, r.name, r.department, r.year,
      r.totalFee, r.paid, r.pending, r.status, r.lastPayment,
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fee_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const filteredRecords = feeRecords.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.roll.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' ||
      record.department.toLowerCase() === departmentFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalCollected = feeRecords.reduce((sum, r) => sum + r.paid, 0);
  const totalPending = feeRecords.reduce((sum, r) => sum + r.pending, 0);
  const collectionRate = totalCollected + totalPending > 0
    ? Math.round((totalCollected / (totalCollected + totalPending)) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    if (status === 'partial') return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
    if (status === 'overdue') return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
    return <Badge className="bg-gray-100 text-gray-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fee Management</h1>
              <p className="text-gray-600">Track and manage student fee collections</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={openAddFeeDialog}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Fee Record
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CheckCircle className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">₹{(totalCollected / 100000).toFixed(1)}L</div>
              <div className="text-green-100">Total Collected</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl">
              <Clock className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">₹{(totalPending / 100000).toFixed(1)}L</div>
              <div className="text-amber-100">Total Pending</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <TrendingUp className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{collectionRate}%</div>
              <div className="text-blue-100">Collection Rate</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{feeRecords.length}</div>
              <div className="text-purple-100">Total Students</div>
            </Card>
          </div>

          {/* Department Summary */}
          {departmentSummary.length > 0 && (
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Department-wise Collection Summary</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {departmentSummary.map((dept, index) => (
                  <Card key={index} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-blue-100 text-blue-700">{dept.dept}</Badge>
                      <span className="text-2xl font-bold text-gray-900">{dept.percentage}%</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-bold text-gray-900">{dept.students}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Collected:</span>
                        <span className="font-bold text-green-600">₹{(dept.collected / 100000).toFixed(1)}L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-bold text-amber-600">₹{(dept.pending / 100000).toFixed(1)}L</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-300"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cse">CSE</SelectItem>
                  <SelectItem value="ece">ECE</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="eee">EEE</SelectItem>
                  <SelectItem value="mech">Mechanical</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Table */}
          {filteredRecords.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No fee records found</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Fee Record" to create one</p>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Roll No.</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Dept</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Total Fee</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Paid</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Pending</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Last Payment</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">{record.roll}</td>
                          <td className="py-4 px-4 text-gray-900">{record.name}</td>
                          <td className="py-4 px-4">
                            <Badge className="bg-blue-100 text-blue-700">{record.department}</Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-900">₹{record.totalFee.toLocaleString()}</td>
                          <td className="py-4 px-4 text-green-600 font-bold">₹{record.paid.toLocaleString()}</td>
                          <td className="py-4 px-4 text-amber-600 font-bold">₹{record.pending.toLocaleString()}</td>
                          <td className="py-4 px-4">{getStatusBadge(record.status)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{record.lastPayment}</td>
                          <td className="py-4 px-4">
                            {record.status !== 'paid' && record.totalFee > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => openPaymentDialog(record)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Payment
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredRecords.map((record) => (
                  <Card key={record.id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900 mb-1">{record.name}</div>
                        <div className="text-sm text-gray-600">{record.roll}</div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Total Fee</div>
                        <div className="font-bold text-gray-900">₹{record.totalFee.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Paid</div>
                        <div className="font-bold text-green-600">₹{record.paid.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Pending</div>
                        <div className="font-bold text-amber-600">₹{record.pending.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Last Payment</div>
                        <div className="text-sm font-medium text-gray-900">{record.lastPayment}</div>
                      </div>
                    </div>
                    {record.status !== 'paid' && record.totalFee > 0 && (
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => openPaymentDialog(record)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Record Payment
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Add Fee Record Dialog */}
      <Dialog open={showAddFeeDialog} onOpenChange={setShowAddFeeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Fee Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student <span className="text-red-500">*</span></Label>
              <Select value={addFeeData.studentId} onValueChange={(v) => setAddFeeData({ ...addFeeData, studentId: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((s: any) => (
                    <SelectItem key={s.id || s._id} value={s.id || s._id}>
                      {s.name} — {s.rollNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Academic Year</Label>
                <Input
                  className="mt-1.5"
                  value={addFeeData.academicYear}
                  onChange={(e) => setAddFeeData({ ...addFeeData, academicYear: e.target.value })}
                  placeholder="2025-2026"
                />
              </div>
              <div>
                <Label>Semester</Label>
                <Select value={addFeeData.semester} onValueChange={(v) => setAddFeeData({ ...addFeeData, semester: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Amount (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={addFeeData.totalAmount}
                  onChange={(e) => setAddFeeData({ ...addFeeData, totalAmount: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label>Due Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={addFeeData.dueDate}
                  onChange={(e) => setAddFeeData({ ...addFeeData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddFeeDialog(false)}>
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleAddFee}
                disabled={addingFee}
              >
                {addingFee ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {addingFee ? 'Creating...' : 'Create Fee Record'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedFeeRecord && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-900">{selectedFeeRecord.name}</p>
                <p className="text-sm text-gray-600">{selectedFeeRecord.roll}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-amber-600 font-semibold">Pending: ₹{selectedFeeRecord.pending.toLocaleString()}</span>
                  <span className="text-green-600">Paid: ₹{selectedFeeRecord.paid.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <Label>Amount (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder={`Max: ${selectedFeeRecord.pending}`}
                  max={selectedFeeRecord.pending}
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentData.method} onValueChange={(v: any) => setPaymentData({ ...paymentData, method: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="dd">Demand Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(paymentData.method === 'online' || paymentData.method === 'cheque') && (
                <div>
                  <Label>Transaction / Cheque ID</Label>
                  <Input
                    className="mt-1.5"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                    placeholder="Reference number"
                  />
                </div>
              )}
              <div>
                <Label>Remarks</Label>
                <Input
                  className="mt-1.5"
                  value={paymentData.remarks}
                  onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                  <X className="w-4 h-4 mr-2" />Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                  onClick={handleRecordPayment}
                  disabled={recordingPayment}
                >
                  {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {recordingPayment ? 'Saving...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}