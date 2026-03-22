import { useState, useEffect } from 'react';
import { Home, BookOpen, Users, ArrowRightLeft, Loader2, Search, Download, RotateCcw } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import {
  getTransactions,
  returnBook,
  exportTransactionsCSV,
  type LibraryTransaction,
} from '../../services/libraryService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/library/dashboard' },
  { icon: BookOpen, label: 'Books', path: '/library/books' },
  { icon: Users, label: 'Students', path: '/library/students' },
  { icon: ArrowRightLeft, label: 'Transactions', path: '/library/transactions' },
];

export default function LibraryTransactions() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await getTransactions(statusFilter || undefined, search || undefined);
      setTransactions(res.data.transactions || res.data || []);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadTransactions(), 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleReturn = async (transactionId: string) => {
    try {
      await returnBook(transactionId);
      toast.success('Book returned successfully');
      loadTransactions();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to return book');
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await exportTransactionsCSV();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `library-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600">View and manage book transactions</p>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Export CSV
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by student, book title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white min-w-[140px]"
            >
              <option value="">All Status</option>
              <option value="Issued">Issued</option>
              <option value="Returned">Returned</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No transactions found</h3>
              <p className="text-gray-400 mt-1">Transactions will appear once books are issued</p>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card className="bg-white/80 border-0 shadow-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-500">
                        <th className="p-4 font-medium">Student</th>
                        <th className="p-4 font-medium">Book</th>
                        <th className="p-4 font-medium">Issue Date</th>
                        <th className="p-4 font-medium">Due Date</th>
                        <th className="p-4 font-medium">Return Date</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Fine</th>
                        <th className="p-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((txn) => (
                        <tr key={txn._id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{txn.studentId?.userId?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{txn.studentId?.rollNumber} · {txn.studentId?.department}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{txn.bookId?.title || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{txn.bookId?.author}</div>
                          </td>
                          <td className="p-4 text-gray-600">{new Date(txn.issueDate).toLocaleDateString()}</td>
                          <td className="p-4 text-gray-600">{new Date(txn.dueDate).toLocaleDateString()}</td>
                          <td className="p-4 text-gray-600">{txn.returnDate ? new Date(txn.returnDate).toLocaleDateString() : '-'}</td>
                          <td className="p-4">{getStatusBadge(txn.status)}</td>
                          <td className="p-4">
                            {txn.fineAmount > 0 ? <span className="text-red-600 font-medium">₹{txn.fineAmount}</span> : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="p-4 text-right">
                            {txn.status !== 'Returned' && (
                              <Button variant="outline" size="sm" onClick={() => handleReturn(txn._id)}>
                                <RotateCcw className="w-3 h-3 mr-1" /> Return
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {transactions.map((txn) => (
                  <Card key={txn._id} className="p-4 bg-white/80 border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{txn.studentId?.userId?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{txn.studentId?.rollNumber}</div>
                      </div>
                      {getStatusBadge(txn.status)}
                    </div>
                    <div className="text-sm text-gray-700 mb-1">📚 {txn.bookId?.title}</div>
                    <div className="text-xs text-gray-500">{txn.bookId?.author}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2 pt-2 border-t">
                      <span>Issued: {new Date(txn.issueDate).toLocaleDateString()}</span>
                      <span>Due: {new Date(txn.dueDate).toLocaleDateString()}</span>
                      {txn.returnDate && <span>Returned: {new Date(txn.returnDate).toLocaleDateString()}</span>}
                      {txn.fineAmount > 0 && <span className="text-red-600 font-medium">Fine: ₹{txn.fineAmount}</span>}
                    </div>
                    {txn.status !== 'Returned' && (
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => handleReturn(txn._id)}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Return Book
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
    </div>
  );
}