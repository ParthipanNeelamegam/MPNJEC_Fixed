import { useEffect, useState } from 'react';
import { Home, User, BookOpen, Calendar, DollarSign, Award, Library, Loader2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getStudentLibraryCard } from '../../services/studentService';
import { toast } from 'sonner';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
  { icon: Library, label: 'Library', path: '/student/library' },
  { icon: Award, label: 'Certificates', path: '/student/certificates' },
];

interface BorrowedBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  issueDate: string;
  dueDate: string;
  status: string;
  fineAmount: number;
}

interface LibraryCard {
  studentName: string;
  rollNumber: string;
  libraryCardsTotal: number;
  libraryCardsAvailable: number;
  borrowedCount: number;
  totalFine: number;
  borrowedBooks: BorrowedBook[];
}

const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('en-IN') : '-';

export default function StudentLibrary() {
  const [loading, setLoading] = useState(true);
  const [libraryCard, setLibraryCard] = useState<LibraryCard | null>(null);

  useEffect(() => {
    const fetchLibraryCard = async () => {
      try {
        setLoading(true);
        const res = await getStudentLibraryCard();
        const card = res.data.libraryCard;
        setLibraryCard(card);
        if ((card?.totalFine || 0) > 0) {
          toast.warning(`Library fine pending: Rs.${Number(card.totalFine).toLocaleString('en-IN')}`);
        }
      } catch (error) {
        toast.error('Failed to load library card details');
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryCard();
  }, []);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Library Card</h1>
          <p className="text-gray-600">Borrowed books, due dates, and fine details</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {libraryCard?.totalFine ? (
            <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">Library fine pending: Rs.{libraryCard.totalFine.toLocaleString('en-IN')}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-5 bg-white/80 border-0 shadow-lg">
              <div className="text-sm text-gray-600">Total Cards</div>
              <div className="text-3xl font-bold text-gray-900">{libraryCard?.libraryCardsTotal || 0}</div>
            </Card>
            <Card className="p-5 bg-white/80 border-0 shadow-lg">
              <div className="text-sm text-gray-600">Available</div>
              <div className="text-3xl font-bold text-green-600">{libraryCard?.libraryCardsAvailable || 0}</div>
            </Card>
            <Card className="p-5 bg-white/80 border-0 shadow-lg">
              <div className="text-sm text-gray-600">Borrowed</div>
              <div className="text-3xl font-bold text-blue-600">{libraryCard?.borrowedCount || 0}</div>
            </Card>
            <Card className="p-5 bg-white/80 border-0 shadow-lg">
              <div className="text-sm text-gray-600">Fine Amount</div>
              <div className="text-3xl font-bold text-red-600">Rs.{(libraryCard?.totalFine || 0).toLocaleString('en-IN')}</div>
            </Card>
          </div>

          <Card className="p-6 bg-white/80 border-0 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Borrowed Books</h2>
            {!libraryCard?.borrowedBooks?.length ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">No books currently borrowed</div>
            ) : (
              <div className="space-y-3">
                {libraryCard.borrowedBooks.map((book) => (
                  <div key={book.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{book.title}</h3>
                        <p className="text-sm text-gray-600">{book.author} | ISBN: {book.isbn}</p>
                        <p className="text-sm text-gray-500 mt-1">Issued: {formatDate(book.issueDate)} | Due: {formatDate(book.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={book.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                          {book.status}
                        </Badge>
                        <Badge className={book.fineAmount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                          Fine Rs.{book.fineAmount.toLocaleString('en-IN')}
                        </Badge>
                      </div>
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
