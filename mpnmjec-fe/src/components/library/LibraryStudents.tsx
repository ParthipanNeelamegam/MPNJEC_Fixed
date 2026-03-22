import { useState, useEffect } from 'react';
import { Home, BookOpen, Users, ArrowRightLeft, Loader2, Search, BookMarked, ChevronLeft } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import {
  getLibraryStudents,
  getStudentLibraryDetails,
  getBooks,
  issueBook,
  returnBook,
  type LibraryStudent,
  type Book,
  type LibraryTransaction,
} from '../../services/libraryService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/library/dashboard' },
  { icon: BookOpen, label: 'Books', path: '/library/books' },
  { icon: Users, label: 'Students', path: '/library/students' },
  { icon: ArrowRightLeft, label: 'Transactions', path: '/library/transactions' },
];

interface StudentDetails {
  student: LibraryStudent;
  activeBooks: LibraryTransaction[];
  history: LibraryTransaction[];
}

export default function LibraryStudents() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<LibraryStudent[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  // Map year to its 2 semesters
  const getSemestersForYear = (year: string) => {
    const y = parseInt(year);
    if (!y || y < 1 || y > 4) return [];
    return [y * 2 - 1, y * 2];
  };

  // Student detail view
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);

  // Issue book dialog
  const [showIssue, setShowIssue] = useState(false);
  const [issueStudentId, setIssueStudentId] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [booksLoading, setBooksLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (search) filters.search = search;
      if (deptFilter) filters.department = deptFilter.toLowerCase();
      if (yearFilter) filters.year = yearFilter;
      if (semesterFilter) filters.semester = semesterFilter;
      const res = await getLibraryStudents(filters);
      setStudents(res.data.students || res.data || []);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadStudents(), 400);
    return () => clearTimeout(timer);
  }, [search, deptFilter, yearFilter, semesterFilter]);

  const viewStudentDetails = async (studentId: string) => {
    try {
      const res = await getStudentLibraryDetails(studentId);
      setSelectedStudent(res.data);
    } catch {
      toast.error('Failed to load student details');
    }
  };

  const openIssueDialog = (studentId: string) => {
    setIssueStudentId(studentId);
    setSelectedBookId('');
    setBookSearch('');
    setAvailableBooks([]);
    setShowIssue(true);
  };

  const searchBooks = async () => {
    if (!bookSearch.trim()) return;
    try {
      setBooksLoading(true);
      const res = await getBooks(bookSearch);
      const allBooks: Book[] = res.data.books || res.data || [];
      setAvailableBooks(allBooks.filter((b: Book) => b.availableCopies > 0));
    } catch {
      toast.error('Failed to search books');
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    if (bookSearch.trim().length >= 2) {
      const timer = setTimeout(() => searchBooks(), 400);
      return () => clearTimeout(timer);
    }
  }, [bookSearch]);

  const handleIssue = async () => {
    if (!selectedBookId || !issueStudentId) {
      toast.error('Please select a book');
      return;
    }
    try {
      setIssuing(true);
      await issueBook(issueStudentId, selectedBookId);
      toast.success('Book issued successfully');
      setShowIssue(false);
      // Refresh student details if viewing
      if (selectedStudent) {
        viewStudentDetails(selectedStudent.student._id);
      }
      loadStudents();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to issue book');
    } finally {
      setIssuing(false);
    }
  };

  const handleReturn = async (transactionId: string) => {
    try {
      await returnBook(transactionId);
      toast.success('Book returned successfully');
      if (selectedStudent) {
        viewStudentDetails(selectedStudent.student._id);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to return book');
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

  // Student detail view
  if (selectedStudent) {
    const s = selectedStudent.student;
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Library Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 p-4 md:p-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="mb-2">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Students
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{s.userId?.name || 'Student'}</h1>
                <p className="text-gray-600">{s.rollNumber} · {s.department} · Year {s.year} · Section {s.section}</p>
              </div>
              <Button onClick={() => openIssueDialog(s._id)} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={s.libraryCardsAvailable === 0}>
                <BookMarked className="w-4 h-4 mr-2" /> Issue Book
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {/* Library Cards Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-white/80 border-0 shadow-lg">
                <div className="text-sm text-gray-600">Total Cards</div>
                <div className="text-2xl font-bold">{s.libraryCardsTotal}</div>
              </Card>
              <Card className="p-4 bg-white/80 border-0 shadow-lg">
                <div className="text-sm text-gray-600">Available Cards</div>
                <div className="text-2xl font-bold text-green-600">{s.libraryCardsAvailable}</div>
              </Card>
              <Card className="p-4 bg-white/80 border-0 shadow-lg">
                <div className="text-sm text-gray-600">Books Issued</div>
                <div className="text-2xl font-bold text-blue-600">{selectedStudent.activeBooks.length}</div>
              </Card>
            </div>

            {/* Active Books */}
            <Card className="p-6 bg-white/80 border-0 shadow-lg mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Issued Books</h2>
              {selectedStudent.activeBooks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No books currently issued</p>
              ) : (
                <div className="space-y-3">
                  {selectedStudent.activeBooks.map((txn) => (
                    <div key={txn._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{txn.bookId?.title}</div>
                        <div className="text-xs text-gray-500">{txn.bookId?.author} · ISBN: {txn.bookId?.isbn}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Issued: {new Date(txn.issueDate).toLocaleDateString()} · Due: {new Date(txn.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(txn.status)}
                        {txn.fineAmount > 0 && <span className="text-red-600 text-sm font-medium">₹{txn.fineAmount}</span>}
                        <Button variant="outline" size="sm" onClick={() => handleReturn(txn._id)}>Return</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* History */}
            <Card className="p-6 bg-white/80 border-0 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
              {selectedStudent.history.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No previous transactions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-3 font-medium">Book</th>
                        <th className="pb-3 font-medium">Issued</th>
                        <th className="pb-3 font-medium">Returned</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Fine</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedStudent.history.map((txn) => (
                        <tr key={txn._id} className="hover:bg-gray-50">
                          <td className="py-3">
                            <div className="font-medium text-gray-900">{txn.bookId?.title}</div>
                            <div className="text-xs text-gray-500">{txn.bookId?.author}</div>
                          </td>
                          <td className="py-3 text-gray-600">{new Date(txn.issueDate).toLocaleDateString()}</td>
                          <td className="py-3 text-gray-600">{txn.returnDate ? new Date(txn.returnDate).toLocaleDateString() : '-'}</td>
                          <td className="py-3">{getStatusBadge(txn.status)}</td>
                          <td className="py-3">{txn.fineAmount > 0 ? <span className="text-red-600 font-medium">₹{txn.fineAmount}</span> : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </main>
          <MobileNav items={navItems} />
        </div>

        {/* Issue Book Dialog */}
        <Dialog open={showIssue} onOpenChange={setShowIssue}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Issue Book to {s.userId?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Search Book</Label>
                <Input
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Search by title, author, or ISBN..."
                  className="mt-1"
                />
              </div>
              {booksLoading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>}
              {availableBooks.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {availableBooks.map((book) => (
                    <div
                      key={book._id}
                      onClick={() => setSelectedBookId(book._id)}
                      className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${
                        selectedBookId === book._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{book.title}</div>
                      <div className="text-xs text-gray-500">{book.author} · {book.availableCopies} copies available</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
              <Button onClick={handleIssue} disabled={!selectedBookId || issuing} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                {issuing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Issue Book
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Student list view
  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Library Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Search students and manage book issues</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white min-w-[140px]"
            >
              <option value="">All Depts</option>
              {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSBS'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setSemesterFilter('');
              }}
              className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white min-w-[110px]"
            >
              <option value="">All Years</option>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
            {yearFilter && (
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white min-w-[130px]"
              >
                <option value="">All Semesters</option>
                {getSemestersForYear(yearFilter).map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No students found</h3>
              <p className="text-gray-400 mt-1">Try adjusting your search or filters</p>
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
                        <th className="p-4 font-medium">Roll Number</th>
                        <th className="p-4 font-medium">Department</th>
                        <th className="p-4 font-medium">Year</th>
                        <th className="p-4 font-medium">Library Cards</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{student.userId?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{student.userId?.email}</div>
                          </td>
                          <td className="p-4 font-mono text-gray-600">{student.rollNumber}</td>
                          <td className="p-4"><Badge variant="outline">{student.department}</Badge></td>
                          <td className="p-4 text-gray-600">Year {student.year} · Sec {student.section}</td>
                          <td className="p-4">
                            <Badge className={student.libraryCardsAvailable > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {student.libraryCardsAvailable}/{student.libraryCardsTotal}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="outline" size="sm" onClick={() => viewStudentDetails(student._id)} className="mr-2">View</Button>
                            <Button size="sm" onClick={() => openIssueDialog(student._id)} disabled={student.libraryCardsAvailable === 0}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                              <BookMarked className="w-3 h-3 mr-1" /> Issue
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {students.map((student) => (
                  <Card key={student._id} className="p-4 bg-white/80 border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{student.userId?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{student.rollNumber}</div>
                      </div>
                      <Badge className={student.libraryCardsAvailable > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {student.libraryCardsAvailable}/{student.libraryCardsTotal} cards
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">{student.department} · Year {student.year} · Sec {student.section}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => viewStudentDetails(student._id)}>View Details</Button>
                      <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        onClick={() => openIssueDialog(student._id)} disabled={student.libraryCardsAvailable === 0}>
                        <BookMarked className="w-3 h-3 mr-1" /> Issue
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Issue Book Dialog (from list view) */}
      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Search Book</Label>
              <Input
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search by title, author, or ISBN..."
                className="mt-1"
              />
            </div>
            {booksLoading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>}
            {availableBooks.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {availableBooks.map((book) => (
                  <div
                    key={book._id}
                    onClick={() => setSelectedBookId(book._id)}
                    className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${
                      selectedBookId === book._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm">{book.title}</div>
                    <div className="text-xs text-gray-500">{book.author} · {book.availableCopies} copies available</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={!selectedBookId || issuing} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              {issuing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Issue Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}