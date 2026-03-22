import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, UserCog, Crown, Edit, Mail, Phone, Calendar, Building, Trash2, ToggleLeft, ToggleRight, Library } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getPrincipal, updatePrincipal, deletePrincipal } from '../../services/adminService';
import AddPrincipalDialog from './AddPrincipalDialog';

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

interface Principal {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  joinedAt?: string;
  stats?: {
    totalDepartments: number;
    totalHODs: number;
    totalFaculty: number;
    totalStudents: number;
  };
}

export default function AdminPrincipal() {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchPrincipal();
  }, []);

  const fetchPrincipal = async () => {
    setLoading(true);
    try {
      const response = await getPrincipal();
      if (response.data.principal) {
        const p = response.data.principal;
        setPrincipal({
          id: p.id,
          name: p.name,
          email: p.email || p.user?.email || '-',
          phone: p.phone || '-',
          // FIX: check both status field and isActive from user
          status: (p.status === 'active' || p.isActive === true) ? 'Active' : 'Active', // default Active if principal exists
          joinedAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '-',
          stats: p.stats || {
            totalDepartments: 5,
            totalHODs: 0,
            totalFaculty: 0,
            totalStudents: 0,
          },
        });
      } else {
        setPrincipal(null);
      }
    } catch (error) {
      console.error('Failed to fetch principal:', error);
      setPrincipal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!principal) return;
    setEditForm({
      name: principal.name,
      phone: principal.phone,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!principal) return;
    setIsSubmitting(true);
    try {
      await updatePrincipal(principal.id, editForm);
      toast.success('Principal updated successfully');
      setEditDialogOpen(false);
      fetchPrincipal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update principal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!principal) return;
    setIsSubmitting(true);
    try {
      await deletePrincipal(principal.id);
      toast.success('Principal removed successfully');
      setDeleteDialogOpen(false);
      fetchPrincipal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove principal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!principal) return;
    try {
      const newStatus = principal.status === 'Active' ? 'inactive' : 'active';
      await updatePrincipal(principal.id, { status: newStatus });
      toast.success(`Principal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchPrincipal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update principal status');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Principal Management</h1>
              <p className="text-gray-600">Manage the college principal</p>
            </div>
            <AddPrincipalDialog
              trigger={
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                  <Crown className="w-4 h-4 mr-2" />
                  {principal ? 'Change Principal' : 'Add Principal'}
                </Button>
              }
              onSuccess={fetchPrincipal}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Loading State */}
          {loading ? (
            <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading principal information...</p>
            </Card>
          ) : principal ? (
            <>
              {/* Principal Profile Card */}
              <Card className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-0 shadow-2xl mb-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl md:text-5xl font-bold">
                    {principal.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <h2 className="text-2xl md:text-3xl font-bold">{principal.name}</h2>
                      <div className="flex items-center gap-2">
                        <Badge className={principal.status === 'Active' ? 'bg-green-500/80 text-white' : 'bg-white/20 text-white'}>
                          {principal.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-white hover:bg-white/20"
                          onClick={handleToggleStatus}
                          title={principal.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {principal.status === 'Active' ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-indigo-100 text-lg mb-4">Principal</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 text-indigo-100">
                        <Mail className="w-4 h-4" />
                        <span>{principal.email}</span>
                      </div>
                      {principal.phone && principal.phone !== '-' && (
                        <div className="flex items-center gap-2 text-indigo-100">
                          <Phone className="w-4 h-4" />
                          <span>{principal.phone}</span>
                        </div>
                      )}
                      {principal.joinedAt && principal.joinedAt !== '-' && (
                        <div className="flex items-center gap-2 text-indigo-100">
                          <Calendar className="w-4 h-4" />
                          <span>Since {principal.joinedAt}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={handleEditClick}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="bg-red-500/80 hover:bg-red-600 text-white border-0"
                      onClick={handleDeleteClick}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <Building className="w-8 h-8 text-indigo-600 mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{principal.stats?.totalDepartments || 0}</div>
                  <div className="text-gray-600">Departments</div>
                </Card>
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <UserCog className="w-8 h-8 text-orange-600 mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{principal.stats?.totalHODs || 0}</div>
                  <div className="text-gray-600">HODs</div>
                </Card>
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <BookOpen className="w-8 h-8 text-blue-600 mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{principal.stats?.totalFaculty || 0}</div>
                  <div className="text-gray-600">Faculty</div>
                </Card>
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <Users className="w-8 h-8 text-green-600 mb-3" />
                  <div className="text-3xl font-bold text-gray-900">{principal.stats?.totalStudents || 0}</div>
                  <div className="text-gray-600">Students</div>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => window.location.href = '/admin/hod'}>
                    <UserCog className="w-6 h-6 text-orange-600" />
                    <span>Manage HODs</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => window.location.href = '/admin/faculty'}>
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <span>Manage Faculty</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => window.location.href = '/admin/students'}>
                    <Users className="w-6 h-6 text-green-600" />
                    <span>Manage Students</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => window.location.href = '/admin/certificates'}>
                    <Award className="w-6 h-6 text-purple-600" />
                    <span>Certificates</span>
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            /* No Principal State */
            <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <Crown className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No Principal Assigned</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                The college doesn't have a principal assigned yet. Add a principal to enable college-level administration.
              </p>
              <AddPrincipalDialog
                trigger={
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-lg py-6 px-8">
                    <Crown className="w-5 h-5 mr-2" />
                    Add Principal
                  </Button>
                }
                onSuccess={fetchPrincipal}
              />
            </Card>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Principal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-principal-name">Name</Label>
              <Input
                id="edit-principal-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-principal-phone">Phone</Label>
              <Input
                id="edit-principal-phone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
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
            <AlertDialogTitle>Remove Principal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{principal?.name}</strong> as Principal? 
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
              {isSubmitting ? 'Removing...' : 'Remove Principal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
