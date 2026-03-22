import { useState, useEffect } from 'react';
import { Home, User, BookOpen, Calendar, DollarSign, CreditCard, Download, CheckCircle, Clock, Award, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { useNavigate } from 'react-router-dom';
import { getStudentFeeStructure, getPaymentHistory, getFeesSummary } from '../../services/studentService';
import { toast } from 'sonner';

interface FeeItem {
  name: string;
  amount: number;
}

interface Payment {
  date: string;
  amount: number;
  receiptNumber?: string;
  receipt?: string;
  status: string;
  method: string;
  _id?: string;
}

interface FeeSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  dueDate?: string;
  academicYear?: string;
  semester?: number;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

export default function StudentFees() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feeStructure, setFeeStructure] = useState<FeeItem[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [feeRes, historyRes, summaryRes] = await Promise.all([
          getStudentFeeStructure(),
          getPaymentHistory(),
          getFeesSummary(),
        ]);

        // feeStructure: array of {name, amount} from Fee.feeStructure
        setFeeStructure(feeRes.data.feeStructure || []);

        // payments: flat array of payment objects
        setPaymentHistory((historyRes.data.payments || []).map((p: any) => ({
          date: p.date ? new Date(p.date).toLocaleDateString('en-IN') : '-',
          amount: p.amount || 0,
          receiptNumber: p.receiptNumber || p.receipt || '-',
          receipt: p.receiptNumber || p._id || '',
          status: 'Success',
          method: p.method || 'Online',
          _id: p._id,
        })));

        // summary: {totalAmount, paidAmount, pendingAmount, status}
        if (summaryRes.data.fees) {
          setSummary(summaryRes.data.fees);
        }
      } catch (error) {
        console.error('Failed to fetch fee data:', error);
        toast.error('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalPaid = summary?.paidAmount ?? 0;
  const totalPending = summary?.pendingAmount ?? 0;
  const totalAmount = summary?.totalAmount ?? (totalPaid + totalPending);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-600">Manage your fee payments and transactions</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Fee Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="w-8 h-8" />
                <Badge className="bg-white/20 text-white border-0">Paid</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">₹{totalPaid.toLocaleString()}</div>
              <div className="text-green-100">Amount Paid</div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8" />
                <Badge className="bg-white/20 text-white border-0">Pending</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">₹{totalPending.toLocaleString()}</div>
              <div className="text-amber-100">Amount Pending</div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8" />
                <Badge className="bg-white/20 text-white border-0">Total</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">₹{totalAmount.toLocaleString()}</div>
              <div className="text-blue-100">Total Fee</div>
            </Card>
          </div>

           
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fee Structure */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Fee Structure {summary?.semester ? `- Semester ${summary.semester}` : ''} {summary?.academicYear ? `(${summary.academicYear})` : ''}
              </h2>
              {feeStructure.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No fee structure available</p>
              ) : (
                <div className="space-y-3">
                  {feeStructure.map((fee, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900">{fee.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">₹{fee.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Amount Due:</span>
                  <span className="text-2xl font-bold text-blue-600">₹{totalPending.toLocaleString()}</span>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-base font-medium shadow-lg shadow-green-500/30">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay Now - ₹{totalPending.toLocaleString()}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Payment Options</DialogTitle>
                    <DialogDescription>Choose your preferred payment method</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                      <div className="text-center">
                        <h3 className="font-bold text-gray-900 mb-2">Scan QR to Pay</h3>
                        <p className="text-sm text-gray-600 mb-4">Use any UPI app to scan and pay</p>
                        <div className="flex justify-center mb-4">
                          <div className="p-4 bg-white rounded-2xl shadow-lg">
                            <QRCodeSVG 
                              value="upi://pay?pa=college@upi&pn=CollegeName&am=15000&cu=INR" 
                              size={180}
                              level="H"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">college@upi</p>
                      </div>
                    </Card>

                    <div className="space-y-2">
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <span className="mr-auto">Net Banking</span>
                      </Button>
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <span className="mr-auto">Debit/Credit Card</span>
                      </Button>
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <span className="mr-auto">Pay at College Office</span>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>

            {/* Payment History */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
              <div className="space-y-3">
                {paymentHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">No payment history</p>
                ) : (
                  <div className="space-y-3">
                  {paymentHistory.map((payment, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-gray-900">{payment.date}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-700">{payment.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Receipt: {payment.receiptNumber || '-'}</div>
                        <div className="text-sm text-gray-600">Method: {payment.method}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">₹{payment.amount.toLocaleString()}</div>
                        {payment.receipt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 text-blue-600"
                            onClick={() => navigate(`/student/receipt/${payment.receipt}`)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                )}
              </div>

              {/* Scholarship Section */}
              <div className="mt-6">
                <h3 className="font-bold text-gray-900 mb-3">Scholarship Information</h3>
                <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <Award className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Merit Scholarship 2025</h4>
                      <p className="text-sm text-gray-600 mb-2">Based on previous semester performance</p>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-amber-100 text-amber-700">Applied</Badge>
                        <span className="text-lg font-bold text-amber-600">₹10,000</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Status: Under Review</p>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}