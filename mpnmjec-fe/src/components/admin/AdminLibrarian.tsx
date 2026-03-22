import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, Search, Plus, Edit, Trash2, UserCog, Crown, Library } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { toast } from 'sonner';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getLibrarians, updateLibrarian, deleteLibrarian } from '../../services/adminService';
import type { LibrarianUpdateData } from '../../services/adminService';
import AddLibrarianDialog from './AddLibrarianDialog';

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

interface Librarian {
  id: string;
  name: string;
  email: string;
  username: string;
  status: string;
  createdAt: string;
}

export default function AdminLibrarian() {
  const [librarians, setLibrarians] = useState<Librarian[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLibrarian, setEditingLibrarian] = useState<Librarian | null>(null);
  const [editForm, setEditForm] = useState<LibrarianUpdateData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLibrarian, setDeletingLibrarian] = useState<Librarian | null>(null);

  const loadLibrarians = async () => {
    try {
      setLoading(true);
      const res = await getLibrarians();
      setLibrarians(res.data.librarians || []);
    } catch {
      toast.error('Failed to load librarians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrarians();
  }, []);

  const filteredLibrarians = librarians.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      l.name?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.username?.toLowerCase().includes(term)
    );
  });

  const openEdit = (librarian: Librarian) => {
    setEditingLibrarian(librarian);
    setEditForm({ name: librarian.name, email: librarian.email, status: librarian.status as 'active' | 'inactive' });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLibrarian) return;
    setIsSubmitting(true);
    try {
      await updateLibrarian(editingLibrarian.id, editForm);
      toast.success('Librarian updated');
      setEditDialogOpen(false);
      loadLibrarians();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLibrarian) return;
    try {
      await deleteLibrarian(deletingLibrarian.id);
      toast.success('Librarian deleted');
      setDeleteDialogOpen(false);
      loadLibrarians();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Librarians</h1>
              <p className="text-gray-600">Manage librarian accounts</p>
            </div>
            <AddLibrarianDialog
              trigger={
                <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
                  <Plus className="w-4 h-4 mr-2" /> Add Librarian
                </Button>
              }
              onSuccess={loadLibrarians}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Search */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search librarians..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : filteredLibrarians.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <Library className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No librarians found</h3>
              <p className="text-gray-400 mt-1">Add the first librarian to get started</p>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card className="bg-white/80 border-0 shadow-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-gray-500">
                        <th className="p-4 font-medium">Name</th>
                        <th className="p-4 font-medium">Username</th>
                        <th className="p-4 font-medium">Email</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Created</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLibrarians.map((lib) => (
                        <tr key={lib.id} className="hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900 capitalize">{lib.name}</td>
                          <td className="p-4 font-mono text-gray-600">{lib.username}</td>
                          <td className="p-4 text-gray-600">{lib.email || '-'}</td>
                          <td className="p-4">
                            <Badge className={lib.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {lib.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-600">{new Date(lib.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(lib)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { setDeletingLibrarian(lib); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredLibrarians.map((lib) => (
                  <Card key={lib.id} className="p-4 bg-white/80 border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{lib.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{lib.username}</div>
                      </div>
                      <Badge className={lib.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {lib.status}
                      </Badge>
                    </div>
                    {lib.email && <div className="text-xs text-gray-500 mb-3">{lib.email}</div>}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(lib)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => { setDeletingLibrarian(lib); setDeleteDialogOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Librarian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={editForm.status || 'active'}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm mt-1"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSubmitting} className="bg-gradient-to-r from-teal-600 to-cyan-600">
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Librarian</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="capitalize">{deletingLibrarian?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
