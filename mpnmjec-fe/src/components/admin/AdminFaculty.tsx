import { useState, useEffect } from 'react';
import { Home, Users, BookOpen, DollarSign, Award, Search, Filter, Plus, Edit, Trash2, Phone, UserCog, Crown, X, Library } from 'lucide-react';
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
import { getFaculty, updateFaculty, deleteFaculty, getCourses, assignCoursesToFaculty, removeCourseFromFaculty } from '../../services/adminService';
import type { FacultyUpdateData } from '../../services/adminService';
import AddFacultyDialog from './AddFacultyDialog';

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
const fallbackFaculty = [
  { id: 1, empId: 'FAC001', name: 'Dr. Ramesh Kumar', department: 'CSE', designation: 'Professor', status: 'Active', courses: 3, experience: 15 },
  { id: 2, empId: 'FAC002', name: 'Dr. Lakshmi Narayanan', department: 'CSE', designation: 'Associate Professor', status: 'Active', courses: 2, experience: 10 },
  { id: 3, empId: 'FAC003', name: 'Prof. Suresh Babu', department: 'ECE', designation: 'Assistant Professor', status: 'Active', courses: 4, experience: 8 },
  { id: 4, empId: 'FAC004', name: 'Dr. Meena Sundaram', department: 'Mech', designation: 'Professor', status: 'Active', courses: 2, experience: 18 },
  { id: 5, empId: 'FAC005', name: 'Prof. Anitha Raj', department: 'CSE', designation: 'Assistant Professor', status: 'On Leave', courses: 3, experience: 5 },
  { id: 6, empId: 'FAC006', name: 'Dr. Vijay Kumar', department: 'ECE', designation: 'Professor', status: 'Active', courses: 2, experience: 20 },
];

interface Course {
  _id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  year?: number;
  section?: string;
}

interface Faculty {
  id: string;
  empId: string;
  name: string;
  department: string;
  designation: string;
  status: string;
  courses: number;
  experience: number;
  assignedCourses: Course[];
}

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editForm, setEditForm] = useState<FacultyUpdateData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | null>(null);

  // Course assignment state
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningFaculty, setAssigningFaculty] = useState<Faculty | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  useEffect(() => {
    fetchFaculty();
    fetchCourses();
  }, []);

  const fetchFaculty = async () => {
    try {
      const response = await getFaculty();
      const apiFaculty = response.data.faculty
        .filter((f: any) => f.userId && f.name) // Filter out records with missing user data
        .map((f: any) => ({
          id: f.id,
          empId: f.empId || '',
          name: f.name || 'Unknown',
          department: f.department?.toUpperCase() || 'N/A',
          designation: f.designation || 'N/A',
          status: f.status === 'active' ? 'Active' : 'On Leave',
          courses: f.assignedCourses?.length || 0,
          experience: f.experience || 0,
          assignedCourses: f.assignedCourses || [],
        }));
      setFaculty(apiFaculty);
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
      setFaculty(fallbackFaculty.map(f => ({ ...f, id: String(f.id), assignedCourses: [] })));
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const handleEditClick = (member: Faculty) => {
    setEditingFaculty(member);
    setEditForm({
      name: member.name,
      empId: member.empId,
      department: member.department.toLowerCase(),
      designation: member.designation,
      experience: member.experience,
    });
    // If member has empId property, ensure it's set (for API compatibility)
    if ((member as any).empId) {
      setEditForm(prev => ({ ...prev, empId: (member as any).empId }));
    }
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingFaculty) return;
    setIsSubmitting(true);
    try {
      await updateFaculty(editingFaculty.id, editForm);
      toast.success('Faculty updated successfully');
      setEditDialogOpen(false);
      setEditingFaculty(null);
      fetchFaculty();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (member: Faculty) => {
    setDeletingFaculty(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFaculty) return;
    setIsSubmitting(true);
    try {
      await deleteFaculty(deletingFaculty.id);
      toast.success('Faculty deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingFaculty(null);
      fetchFaculty();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCoursesClick = (member: Faculty) => {
    setAssigningFaculty(member);
    setSelectedCourseIds(member.assignedCourses?.map(c => c._id) || []);
    setAssignDialogOpen(true);
  };

  const handleAssignCoursesSubmit = async () => {
    if (!assigningFaculty) return;
    setIsSubmitting(true);
    try {
      await assignCoursesToFaculty(assigningFaculty.id, selectedCourseIds);
      toast.success('Courses assigned successfully');
      setAssignDialogOpen(false);
      setAssigningFaculty(null);
      fetchFaculty();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign courses');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCourse = async (facultyId: string, courseId: string) => {
    try {
      await removeCourseFromFaculty(facultyId, courseId);
      toast.success('Course removed');
      fetchFaculty();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove course');
    }
  };

  const filteredFaculty = faculty.filter(member => {
    const matchesSearch = (member.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (member.empId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || member.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Admin Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Faculty Management</h1>
              <p className="text-gray-600">Manage faculty records and information</p>
            </div>
            <AddFacultyDialog
              trigger={
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Faculty
                </Button>
              }
              onSuccess={fetchFaculty}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{faculty.length}</div>
              <div className="text-blue-100">Total Faculty</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <Users className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{faculty.filter(f => f.status === 'Active').length}</div>
              <div className="text-green-100">Active Faculty</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <BookOpen className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">3</div>
              <div className="text-purple-100">Departments</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">12</div>
              <div className="text-amber-100">Avg Experience</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name or employee ID..."
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
                  <SelectItem value="Mech">Mechanical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
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
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Emp ID</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Department</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Designation</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Experience</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{member.empId}</td>
                      <td className="py-4 px-4 text-gray-900">{member.name}</td>
                      <td className="py-4 px-4">
                        <Badge className="bg-blue-100 text-blue-700">{member.department}</Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-900">{member.designation}</td>
                      <td className="py-4 px-4">
                        <Badge className={member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className="bg-purple-100 text-purple-700">{member.experience} yrs</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditClick(member)}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleAssignCoursesClick(member)}>
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Phone className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDeleteClick(member)}>
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
            {filteredFaculty.map((member) => (
              <Card key={member.id} className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{member.name}</div>
                    <div className="text-sm text-gray-600">{member.empId}</div>
                  </div>
                  <Badge className={member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {member.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Department</div>
                    <Badge className="bg-blue-100 text-blue-700">{member.department}</Badge>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-xs text-gray-600 mb-1">Designation</div>
                    <div className="font-bold text-gray-900 text-sm">{member.designation}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                    <div className="text-xs text-gray-600 mb-1">Courses</div>
                    <div className="flex flex-wrap gap-1">
                      {member.assignedCourses && member.assignedCourses.length > 0 ? (
                        member.assignedCourses.map((course) => (
                          <Badge key={course._id} className="bg-indigo-100 text-indigo-700 flex items-center gap-1">
                            {course.code}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-red-600"
                              onClick={() => handleRemoveCourse(member.id, course._id)}
                            />
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No courses assigned</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                    <div className="text-xs text-gray-600 mb-1">Experience</div>
                    <Badge className="bg-purple-100 text-purple-700">{member.experience} yrs</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditClick(member)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAssignCoursesClick(member)}>
                    <BookOpen className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteClick(member)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Edit Faculty Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
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
              <Label htmlFor="edit-empId">Employee ID</Label>
              <Input
                id="edit-empId"
                value={editForm.empId || ''}
                onChange={(e) => setEditForm({ ...editForm, empId: e.target.value })}
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
                <Label htmlFor="edit-exp">Experience (yrs)</Label>
                <Input
                  id="edit-exp"
                  type="number"
                  value={editForm.experience || ''}
                  onChange={(e) => setEditForm({ ...editForm, experience: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-designation">Designation</Label>
              <Select value={editForm.designation || ''} onValueChange={(v) => setEditForm({ ...editForm, designation: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professor">Professor</SelectItem>
                  <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                  <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingFaculty?.name}? This will mark the faculty as inactive.
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

      {/* Assign Courses Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Courses to {assigningFaculty?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-sm text-gray-600 mb-4">
              Select courses to assign. Currently assigned courses are pre-selected.
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {courses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No courses available</p>
              ) : (
                courses.map((course) => (
                  <label
                    key={course._id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.includes(course._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCourseIds([...selectedCourseIds, course._id]);
                        } else {
                          setSelectedCourseIds(selectedCourseIds.filter(id => id !== course._id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{course.code} - {course.name}</div>
                      <div className="text-sm text-gray-500">
                        {course.department?.toUpperCase()} | Sem {course.semester}
                        {course.year && ` | Year ${course.year}`}
                        {course.section && ` | Sec ${course.section}`}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignCoursesSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Courses'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
