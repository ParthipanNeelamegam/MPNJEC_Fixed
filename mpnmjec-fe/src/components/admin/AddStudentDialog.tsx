import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { createStudent, type StudentCreateResponse } from '../../services/adminService';
import { Copy, CheckCircle } from 'lucide-react';

interface AddStudentDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function AddStudentDialog({ trigger, onSuccess }: AddStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    fatherName: '',
    motherName: '',
    dob: '',
    aadhaar: '',
    mobile: '',
    parentMobile: '',
    address: '',
    rollNumber: '',
    department: '',
    year: '',
    section: '',
    admissionYear: new Date().getFullYear().toString(),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      fatherName: '',
      motherName: '',
      dob: '',
      aadhaar: '',
      mobile: '',
      parentMobile: '',
      address: '',
      rollNumber: '',
      department: '',
      year: '',
      section: '',
      admissionYear: new Date().getFullYear().toString(),
    });
    setCredentials(null);
    setCopied(null);
  };

  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.rollNumber || !formData.department || !formData.year) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createStudent({
        name: formData.name,
        email: formData.email,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        dob: formData.dob || undefined,
        aadhaar: formData.aadhaar,
        mobile: formData.mobile,
        parentMobile: formData.parentMobile,
        address: formData.address,
        rollNumber: formData.rollNumber,
        department: formData.department,
        year: parseInt(formData.year),
        section: formData.section,
        admissionYear: parseInt(formData.admissionYear),
      });
      
      const data: StudentCreateResponse = response.data;
      setCredentials(data.credentials);
      toast.success('Student added successfully');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add student';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{credentials ? 'Student Created - Credentials' : 'Add New Student'}</DialogTitle>
        </DialogHeader>

        {credentials ? (
          <div className="py-4 space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Student created successfully!</span>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Please share these credentials with the student. The password will not be shown again.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <span className="text-sm text-gray-500">Username:</span>
                    <p className="font-mono font-medium">{credentials.username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.username, 'username')}
                  >
                    {copied === 'username' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <span className="text-sm text-gray-500">Password:</span>
                    <p className="font-mono font-medium">{credentials.password}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.password, 'password')}
                  >
                    {copied === 'password' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetForm();
                }}
              >
                Add Another Student
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-name">Full Name *</Label>
                  <Input
                    id="student-name"
                    name="name"
                    placeholder="Enter student name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email *</Label>
                  <Input
                    id="student-email"
                    name="email"
                    type="email"
                    placeholder="student@college.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-father">Father's Name</Label>
                  <Input
                    id="student-father"
                    name="fatherName"
                    placeholder="Father's name"
                    value={formData.fatherName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-mother">Mother's Name</Label>
                  <Input
                    id="student-mother"
                    name="motherName"
                    placeholder="Mother's name"
                    value={formData.motherName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-dob">Date of Birth</Label>
                  <Input
                    id="student-dob"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-aadhaar">Aadhaar Number</Label>
                  <Input
                    id="student-aadhaar"
                    name="aadhaar"
                    placeholder="1234 5678 9012"
                    value={formData.aadhaar}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-mobile">Mobile Number</Label>
                  <Input
                    id="student-mobile"
                    name="mobile"
                    placeholder="9876543210"
                    value={formData.mobile}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-parent-mobile">Parent Mobile Number</Label>
                  <Input
                    id="student-parent-mobile"
                    name="parentMobile"
                    placeholder="9876543210"
                    value={formData.parentMobile}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-address">Address</Label>
                <Input
                  id="student-address"
                  name="address"
                  placeholder="Full address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Academic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-roll">Roll Number *</Label>
                  <Input
                    id="student-roll"
                    name="rollNumber"
                    placeholder="CS21B001"
                    value={formData.rollNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select value={formData.department} onValueChange={(v) => handleSelectChange('department', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cse">CSE</SelectItem>
                      <SelectItem value="ece">ECE</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="eee">EEE</SelectItem>
                      <SelectItem value="mech">Mechanical</SelectItem>
                      <SelectItem value="civil">Civil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Select value={formData.year} onValueChange={(v) => handleSelectChange('year', v)}>
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
                <div className="space-y-2">
                  <Label htmlFor="student-section">Section</Label>
                  <Input
                    id="student-section"
                    name="section"
                    placeholder="A"
                    value={formData.section}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-admission-year">Admission Year</Label>
                  <Input
                    id="student-admission-year"
                    name="admissionYear"
                    type="number"
                    placeholder="2024"
                    value={formData.admissionYear}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Student'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
