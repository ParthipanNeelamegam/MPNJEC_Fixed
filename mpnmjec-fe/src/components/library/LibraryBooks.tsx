import { useState, useEffect } from 'react';
import { Home, BookOpen, Users, ArrowRightLeft, Loader2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getBooks, createBook, updateBook, deleteBook, type Book, type BookData } from '../../services/libraryService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/library/dashboard' },
  { icon: BookOpen, label: 'Books', path: '/library/books' },
  { icon: Users, label: 'Students', path: '/library/students' },
  { icon: ArrowRightLeft, label: 'Transactions', path: '/library/transactions' },
];

const CATEGORIES = ['All', 'Fiction', 'Non-Fiction', 'Science', 'Engineering', 'Mathematics', 'Computer Science', 'History', 'Literature', 'Reference', 'Other'];

const emptyForm: BookData = { title: '', author: '', isbn: '', category: '', totalCopies: 1 };

export default function LibraryBooks() {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const res = await getBooks(search || undefined, categoryFilter || undefined);
      setBooks(res.data.books || res.data || []);
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadBooks(), 400);
    return () => clearTimeout(timer);
  }, [search, categoryFilter]);

  const openAdd = () => {
    setEditingBook(null);
    setForm({ ...emptyForm });
    setShowDialog(true);
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setForm({ title: book.title, author: book.author, isbn: book.isbn, category: book.category, totalCopies: book.totalCopies });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.author || !form.isbn || !form.category) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setSaving(true);
      if (editingBook) {
        await updateBook(editingBook._id, form);
        toast.success('Book updated successfully');
      } else {
        await createBook(form);
        toast.success('Book added successfully');
      }
      setShowDialog(false);
      loadBooks();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteBook(deleteConfirm._id);
      toast.success('Book deleted');
      setDeleteConfirm(null);
      loadBooks();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete book');
    }
  };

  const getStockBadge = (book: Book) => {
    if (book.availableCopies === 0) return <Badge className="bg-red-100 text-red-700">Out of Stock</Badge>;
    if (book.availableCopies <= 2) return <Badge className="bg-amber-100 text-amber-700">{book.availableCopies} left</Badge>;
    return <Badge className="bg-green-100 text-green-700">{book.availableCopies} available</Badge>;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Library Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Books</h1>
              <p className="text-gray-600">Manage library book inventory</p>
            </div>
            <Button onClick={openAdd} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Add Book
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 px-3 text-sm bg-white min-w-[160px]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : books.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No books found</h3>
              <p className="text-gray-400 mt-1">Add your first book to get started</p>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card className="bg-white/80 border-0 shadow-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-500">
                        <th className="p-4 font-medium">Title & Author</th>
                        <th className="p-4 font-medium">ISBN</th>
                        <th className="p-4 font-medium">Category</th>
                        <th className="p-4 font-medium">Stock</th>
                        <th className="p-4 font-medium">Issued</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {books.map((book) => (
                        <tr key={book._id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{book.title}</div>
                            <div className="text-xs text-gray-500">{book.author}</div>
                          </td>
                          <td className="p-4 text-gray-600 font-mono text-xs">{book.isbn}</td>
                          <td className="p-4"><Badge variant="outline">{book.category}</Badge></td>
                          <td className="p-4">{getStockBadge(book)}</td>
                          <td className="p-4 text-gray-600">{book.issuedCopies}/{book.totalCopies}</td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(book)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteConfirm(book)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {books.map((book) => (
                  <Card key={book._id} className="p-4 bg-white/80 border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{book.title}</div>
                        <div className="text-xs text-gray-500">{book.author}</div>
                      </div>
                      {getStockBadge(book)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span className="font-mono">{book.isbn}</span>
                      <Badge variant="outline" className="text-xs">{book.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-500">Issued: {book.issuedCopies}/{book.totalCopies}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(book)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setDeleteConfirm(book)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Book title" className="mt-1" />
            </div>
            <div>
              <Label>Author *</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" className="mt-1" />
            </div>
            <div>
              <Label>ISBN *</Label>
              <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="ISBN number" className="mt-1" disabled={!!editingBook} />
            </div>
            <div>
              <Label>Category *</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm mt-1"
              >
                <option value="">Select category</option>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Total Copies *</Label>
              <Input type="number" min={1} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: parseInt(e.target.value) || 1 })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingBook ? 'Update' : 'Add Book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-4">
            Are you sure you want to delete <strong>{deleteConfirm?.title}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}