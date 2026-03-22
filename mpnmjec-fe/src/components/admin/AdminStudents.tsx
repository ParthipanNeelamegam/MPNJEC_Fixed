import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, Search, Filter, Plus, Edit, Trash2, Mail, UserCog, Crown, Library } from 'lucide-react';
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
import { getStudents, updateStudent, deleteStudent } from '../../services/adminService';
import type { StudentUpdateData } from '../../services/adminService';
import AddStudentDialog from './AddStudentDialog';

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

// Fallback data if API fails
const fallbackStudents = [
  { id: 1, roll: 'CS21B001', name: 'Rajesh Kumar', department: 'CSE', year: 3, section: 'A', status: 'Active', attendance: 87, cgpa: 8.5 },
  { id: 2, roll: 'CS21B002', name: 'Priya Sharma', department: 'CSE', year: 3, section: 'A', status: 'Active', attendance: 92, cgpa: 8.8 },
  { id: 3, roll: 'CS21B003', name: 'Karthik Raja', department: 'CSE', year: 3, section: 'B', status: 'Active', attendance: 78, cgpa: 7.5 },
  { id: 4, roll: 'CS21B004', name: 'Divya Lakshmi', department: 'CSE', year: 3, section: 'A', status: 'Active', attendance: 95, cgpa: 9.2 },
  { id: 5, roll: 'EC21B001', name: 'Arun Prasad', department: 'ECE', year: 3, section: 'A', status: 'Active', attendance: 88, cgpa: 8.2 },
  { id: 6, roll: 'ME21B001', name: 'Kavya Suresh', department: 'Mech', year: 3, section: 'B', status: 'Active', attendance: 91, cgpa: 8.9 },
  { id: 7, roll: 'CS21B005', name: 'Manoj Kumar', department: 'CSE', year: 3, section: 'C', status: 'Inactive', attendance: 75, cgpa: 7.1 },
  { id: 8, roll: 'CS21B006', name: 'Sneha Reddy', department: 'CSE', year: 3, section: 'A', status: 'Active', attendance: 94, cgpa: 9.1 },
];

interface Student {
  id: string;
  roll: string;
  name: string;
  department: string;
  year: number;
  section: string;
  status: string;
  attendance: number;
  cgpa: number;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<StudentUpdateData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await getStudents();
      const apiStudents = response.data.students
        .filter((s: any) => s.userId && s.name) // Filter out records with missing user data
        .map((s: any) => ({
          id: s.id,
          roll: s.rollNumber || '',
          name: s.name || 'Unknown',
          department: s.department?.toUpperCase() || 'N/A',
          year: s.year || 1,
          section: s.section || '',
          status: s.status === 'active' ? 'Active' : 'Inactive',
          attendance: s.attendance || 0,
          cgpa: s.cgpa || 0,
        }));
      setStudents(apiStudents);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents(fallbackStudents.map(s => ({ ...s, id: String(s.id) })));
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name,
      rollNumber: student.roll, // fallback for legacy fallbackStudents
      department: student.department.toLowerCase(),
      year: student.year,
      section: student.section,
      cgpa: student.cgpa,
      attendance: student.attendance,
    });
    // If student has rollNumber, use it (from API), else fallback to roll (from fallbackStudents)
    if ((student as any).rollNumber) {
      setEditForm(prev => ({ ...prev, rollNumber: (student as any).rollNumber }));
    }
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      await updateStudent(editingStudent.id, editForm);
      toast.success('Student updated successfully');
      setEditDialogOpen(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (student: Student) => {
    setDeletingStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setIsSubmitting(true);
    try {
      await deleteStudent(deletingStudent.id);
      toast.success('Student deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (student.name?.toLowerCase() || '').includes(searchLower) || 
                         (student.roll?.toLowerCase() || '').includes(searchLower);
    const matchesDept = departmentFilter === 'all' || student.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600">Manage student records and information</p>
            </div>
            <AddStudentDialog
              trigger={
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              }
              onSuccess={fetchStudents}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{students.length}</div>
              <div className="text-blue-100">Total Students</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{students.filter(s => s.status === 'Active').length}</div>
              <div className="text-green-100">Active Students</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <BookOpen className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">3</div>
              <div className="text-purple-100">Departments</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">8.4</div>
              <div className="text-amber-100">Avg CGPA</div>
            </Card>
          </div>

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
                  <SelectItem value="CSE">CSE</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="EEE">EEE</SelectItem>
                  <SelectItem value="Mech">Mechanical</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Desktop Table */}
          <Card className="hidden md:block p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Roll No.</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Department</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Year/Sec</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Attendance</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">CGPA</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{student.roll}</td>
                      <td className="py-4 px-4 text-gray-900">{student.name}</td>
                      <td className="py-4 px-4">
                        <Badge className="bg-blue-100 text-blue-700">{student.department}</Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-900">{student.year}{student.section}</td>
                      <td className="py-4 px-4">
                        <Badge className={student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-900">{student.attendance}%</td>
                      <td className="py-4 px-4">
                        <Badge className="bg-purple-100 text-purple-700">{student.cgpa}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditClick(student)}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Mail className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(student)}>
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
            {filteredStudents.map((student) => (
              <Card key={student.id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{student.name}</div>
                    <div className="text-sm text-gray-600">{student.roll}</div>
                  </div>
                  <Badge className={student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {student.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Department</div>
                    <Badge className="bg-blue-100 text-blue-700">{student.department}</Badge>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Year/Section</div>
                    <div className="font-bold text-gray-900">{student.year}{student.section}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Attendance</div>
                    <div className="font-bold text-gray-900">{student.attendance}%</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">CGPA</div>
                    <Badge className="bg-purple-100 text-purple-700">{student.cgpa}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditClick(student)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteClick(student)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-roll">Roll Number</Label>
              <Input
                id="edit-roll"
                value={editForm.rollNumber || ''}
                onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-dept">Department</Label>
                <Select value={editForm.department || ''} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cse">CSE</SelectItem>
                    <SelectItem value="ece">ECE</SelectItem>
                    <SelectItem value="mech">Mechanical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-year">Year</Label>
                <Select value={String(editForm.year || '')} onValueChange={(v) => setEditForm({ ...editForm, year: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-section">Section</Label>
                <Input
                  id="edit-section"
                  value={editForm.section || ''}
                  onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cgpa">CGPA</Label>
                <Input
                  id="edit-cgpa"
                  type="number"
                  step="0.1"
                  value={editForm.cgpa || ''}
                  onChange={(e) => setEditForm({ ...editForm, cgpa: parseFloat(e.target.value) })}
                />
              </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingStudent?.name}? This will mark the student as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
