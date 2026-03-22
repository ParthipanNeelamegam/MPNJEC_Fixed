import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, Search, Filter, Plus, Edit, Trash2, Phone, UserCog, Crown, ToggleLeft, ToggleRight, Library } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { toast } from 'sonner';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getHODs, updateHOD, deleteHOD } from '../../services/adminService';
import AddHODDialog from './AddHODDialog';

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

interface HOD {
  id: string;
  name: string;
  department: string;
  email: string;
  phone?: string;
  status: string;
  facultyCount?: number;
  studentCount?: number;
  joinedDate?: string;
}

export default function AdminHOD() {
  const [hods, setHODs] = useState<HOD[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHOD, setEditingHOD] = useState<HOD | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingHOD, setDeletingHOD] = useState<HOD | null>(null);

  useEffect(() => {
    fetchHODs();
  }, []);

  const fetchHODs = async () => {
    setLoading(true);
    try {
      const response = await getHODs();
      const apiHODs = response.data.hods
        .filter((h: any) => h.userId && h.name) // Filter out records with missing user data
        .map((h: any) => ({
          id: h.id,
          name: h.name || 'Unknown',
          department: h.department?.toUpperCase() || 'N/A',
          email: h.email || h.user?.email || '-',
          phone: h.phone || '-',
          status: h.status === 'active' ? 'Active' : 'Inactive',
          facultyCount: h.facultyCount || 0,
          studentCount: h.studentCount || 0,
          joinedDate: h.joinedAt ? new Date(h.joinedAt).toLocaleDateString() : '-',
        }));
      setHODs(apiHODs);
    } catch (error) {
      console.error('Failed to fetch HODs:', error);
      toast.error('Failed to fetch HODs');
      setHODs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (hod: HOD) => {
    setEditingHOD(hod);
    setEditForm({
      name: hod.name,
      department: hod.department?.toLowerCase(),
      phone: hod.phone,
      status: hod.status === 'Active' ? 'active' : 'inactive',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingHOD) return;
    setIsSubmitting(true);
    try {
      await updateHOD(editingHOD.id, editForm);
      toast.success('HOD updated successfully');
      setEditDialogOpen(false);
      setEditingHOD(null);
      fetchHODs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update HOD');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (hod: HOD) => {
    try {
      const newStatus = hod.status === 'Active' ? 'inactive' : 'active';
      await updateHOD(hod.id, { status: newStatus });
      toast.success(`HOD ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchHODs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update HOD status');
    }
  };

  const handleDeleteClick = (hod: HOD) => {
    setDeletingHOD(hod);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHOD) return;
    setIsSubmitting(true);
    try {
      await deleteHOD(deletingHOD.id);
      toast.success('HOD removed successfully');
      setDeleteDialogOpen(false);
      setDeletingHOD(null);
      fetchHODs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove HOD');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHODs = hods.filter(hod => {
    const matchesSearch = (hod.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (hod.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || hod.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">HOD Management</h1>
              <p className="text-gray-600">Manage Heads of Department</p>
            </div>
            <AddHODDialog
              trigger={
                <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add HOD
                </Button>
              }
              onSuccess={fetchHODs}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-xl">
              <UserCog className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{hods.length}</div>
              <div className="text-orange-100">Total HODs</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{hods.filter(h => h.status === 'Active').length}</div>
              <div className="text-green-100">Active HODs</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <BookOpen className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{new Set(hods.map(h => h.department)).size}</div>
              <div className="text-blue-100">Departments</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{hods.reduce((acc, h) => acc + (h.facultyCount || 0), 0)}</div>
              <div className="text-purple-100">Total Faculty</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
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
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="MECH">Mechanical</SelectItem>
                  <SelectItem value="CIVIL">Civil</SelectItem>
                  <SelectItem value="EEE">EEE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Loading State */}
          {loading ? (
            <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading HODs...</p>
            </Card>
          ) : filteredHODs.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <UserCog className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No HODs Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || departmentFilter !== 'all' 
                  ? 'No HODs match your search criteria' 
                  : 'Get started by adding the first Head of Department'}
              </p>
              <AddHODDialog
                trigger={
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add HOD
                  </Button>
                }
                onSuccess={fetchHODs}
              />
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Department</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Email</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Faculty</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Students</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHODs.map((hod) => (
                        <tr key={hod.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold">
                                {hod.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{hod.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className="bg-orange-100 text-orange-700">{hod.department}</Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-600">{hod.email}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Badge className={hod.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                {hod.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleToggleStatus(hod)}
                                title={hod.status === 'Active' ? 'Deactivate' : 'Activate'}
                              >
                                {hod.status === 'Active' ? (
                                  <ToggleRight className="w-4 h-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className="bg-blue-100 text-blue-700">{hod.facultyCount || 0}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className="bg-purple-100 text-purple-700">{hod.studentCount || 0}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditClick(hod)}>
                                <Edit className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title={hod.phone && hod.phone !== '-' ? hod.phone : 'No phone'}
                                onClick={() => {
                                  if (hod.phone && hod.phone !== '-') {
                                    window.open(`tel:${hod.phone}`, '_self');
                                  } else {
                                    toast.info('No phone number on record for this HOD');
                                  }
                                }}
                              >
                                <Phone className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(hod)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredHODs.map((hod) => (
                  <Card key={hod.id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">
                          {hod.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{hod.name}</div>
                          <div className="text-sm text-gray-600">{hod.email}</div>
                        </div>
                      </div>
                      <Badge className={hod.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {hod.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="p-3 bg-gray-50 rounded-xl text-center">
                        <div className="text-xs text-gray-600 mb-1">Department</div>
                        <Badge className="bg-orange-100 text-orange-700">{hod.department}</Badge>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl text-center">
                        <div className="text-xs text-gray-600 mb-1">Faculty</div>
                        <div className="font-bold text-gray-900">{hod.facultyCount || 0}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl text-center">
                        <div className="text-xs text-gray-600 mb-1">Students</div>
                        <div className="font-bold text-gray-900">{hod.studentCount || 0}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditClick(hod)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(hod)}
                        title={hod.status === 'Active' ? 'Deactivate' : 'Activate'}
                      >
                        {hod.status === 'Active' ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteClick(hod)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit HOD</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={editForm.department || ''} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cse">CSE</SelectItem>
                  <SelectItem value="ece">ECE</SelectItem>
                  <SelectItem value="mech">Mechanical</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="eee">EEE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status || 'active'} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove HOD?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deletingHOD?.name}</strong> as HOD of {deletingHOD?.department}? 
              This action cannot be undone. The user account will be reverted to faculty role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Removing...' : 'Remove HOD'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}