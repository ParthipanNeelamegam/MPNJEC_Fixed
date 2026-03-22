import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, ArrowRightLeft, Loader2, AlertTriangle, BookMarked, Library, IndianRupee } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getLibraryDashboard } from '../../services/libraryService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/library/dashboard' },
  { icon: BookOpen, label: 'Books', path: '/library/books' },
  { icon: Users, label: 'Students', path: '/library/students' },
  { icon: ArrowRightLeft, label: 'Transactions', path: '/library/transactions' },
];

interface DashboardStats {
  totalBooks: number;
  totalIssued: number;
  overdueBooks: number;
  activeStudents: number;
  totalFine: number;
  fineCount: number;
}

interface RecentTransaction {
  _id: string;
  bookId: { title: string; author: string; isbn: string };
  studentId: { rollNumber: string; userId: { name: string } };
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'Issued' | 'Returned' | 'Overdue';
  fineAmount: number;
}

interface LowStockBook {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  availableCopies: number;
  totalCopies: number;
}

export default function LibraryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [lowStockBooks, setLowStockBooks] = useState<LowStockBook[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getLibraryDashboard();
      setStats(res.data.stats);
      setRecentTransactions(res.data.recentTransactions || []);
      setLowStockBooks(res.data.lowStockBooks || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Books', value: stats?.totalBooks?.toLocaleString() || '0', color: 'from-blue-500 to-indigo-600', icon: BookOpen },
    { title: 'Total Issued', value: stats?.totalIssued?.toString() || '0', color: 'from-purple-500 to-pink-600', icon: BookMarked },
    { title: 'Overdue Books', value: stats?.overdueBooks?.toString() || '0', color: 'from-red-500 to-rose-600', icon: AlertTriangle },
    { title: 'Active Students', value: stats?.activeStudents?.toString() || '0', color: 'from-green-500 to-emerald-600', icon: Users },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Issued': return <Badge className="bg-blue-100 text-blue-700">Issued</Badge>;
      case 'Returned': return <Badge className="bg-green-100 text-green-700">Returned</Badge>;
      case 'Overdue': return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Library Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Library Dashboard</h1>
          <p className="text-gray-600">Library Management System</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                      <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.title}</div>
                    </Card>
                  );
                })}
              </div>

              {/* Fine Summary Card */}
              {(stats?.totalFine || 0) > 0 && (
                <Card className="p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <IndianRupee className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">₹{stats?.totalFine?.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Outstanding Fines ({stats?.fineCount} students)</div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Quick Actions */}
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="h-20 flex-col bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" onClick={() => navigate('/library/books')}>
                      <BookOpen className="w-6 h-6 mb-1" />
                      <span className="text-xs">Manage Books</span>
                    </Button>
                    <Button className="h-20 flex-col bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" onClick={() => navigate('/library/students')}>
                      <Users className="w-6 h-6 mb-1" />
                      <span className="text-xs">Search Student</span>
                    </Button>
                    <Button className="h-20 flex-col bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" onClick={() => navigate('/library/transactions')}>
                      <ArrowRightLeft className="w-6 h-6 mb-1" />
                      <span className="text-xs">Transactions</span>
                    </Button>
                    <Button className="h-20 flex-col bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700" onClick={() => navigate('/library/books')}>
                      <Library className="w-6 h-6 mb-1" />
                      <span className="text-xs">Add Book</span>
                    </Button>
                  </div>
                </Card>

                {/* Low Stock Alert */}
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Low Stock Alert
                  </h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {lowStockBooks.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">All books well stocked!</p>
                    ) : (
                      lowStockBooks.map((book) => (
                        <div key={book._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{book.title}</div>
                            <div className="text-xs text-gray-500">{book.author}</div>
                          </div>
                          <Badge className={book.availableCopies === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {book.availableCopies}/{book.totalCopies}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
                  <Button variant="outline" size="sm" onClick={() => navigate('/library/transactions')}>
                    View All
                  </Button>
                </div>

                {recentTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No transactions yet</p>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-3 font-medium">Student</th>
                            <th className="pb-3 font-medium">Book</th>
                            <th className="pb-3 font-medium">Issue Date</th>
                            <th className="pb-3 font-medium">Due Date</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Fine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {recentTransactions.map((txn) => (
                            <tr key={txn._id} className="hover:bg-gray-50">
                              <td className="py-3">
                                <div className="font-medium text-gray-900">{txn.studentId?.userId?.name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{txn.studentId?.rollNumber}</div>
                              </td>
                              <td className="py-3">
                                <div className="font-medium text-gray-900">{txn.bookId?.title || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">{txn.bookId?.author}</div>
                              </td>
                              <td className="py-3 text-gray-600">{new Date(txn.issueDate).toLocaleDateString()}</td>
                              <td className="py-3 text-gray-600">{new Date(txn.dueDate).toLocaleDateString()}</td>
                              <td className="py-3">{getStatusBadge(txn.status)}</td>
                              <td className="py-3">
                                {txn.fineAmount > 0 ? (
                                  <span className="text-red-600 font-medium">₹{txn.fineAmount}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {recentTransactions.map((txn) => (
                        <div key={txn._id} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-gray-900 text-sm">{txn.studentId?.userId?.name || 'Unknown'}</div>
                            {getStatusBadge(txn.status)}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">📚 {txn.bookId?.title}</div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Issued: {new Date(txn.issueDate).toLocaleDateString()}</span>
                            {txn.fineAmount > 0 && <span className="text-red-600 font-medium">₹{txn.fineAmount}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}
