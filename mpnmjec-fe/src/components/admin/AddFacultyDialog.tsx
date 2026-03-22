import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { createFaculty } from '../../services/adminService';
import { Copy, CheckCircle } from 'lucide-react';

interface AddFacultyDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function AddFacultyDialog({ trigger, onSuccess }: AddFacultyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    empId: '',
    department: '',
    designation: '',
    experience: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      empId: '',
      department: '',
      designation: '',
      experience: '',
    });
    setCredentials(null);
    setCopied(null);
  };

  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.empId || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createFaculty({
        name: formData.name,
        email: formData.email || undefined,
        empId: formData.empId,
        department: formData.department,
        designation: formData.designation,
        experience: formData.experience ? parseInt(formData.experience) : 0,
      });
      
      // Get credentials from response
      const data = response.data;
      const username = data.faculty?.username || formData.empId.toLowerCase();
      const password = data.generatedPassword;
      
      if (password) {
        setCredentials({ username, password });
      }
      
      toast.success('Faculty added successfully');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add faculty';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{credentials ? 'Faculty Created - Credentials' : 'Add New Faculty'}</DialogTitle>
          {credentials && <DialogDescription>Copy the credentials below to share with the faculty member</DialogDescription>}
        </DialogHeader>

        {credentials ? (
          <div className="py-4 space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Faculty created successfully!</span>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Please share these credentials with the faculty member. The password will not be shown again.
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

            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="faculty-name">Full Name *</Label>
            <Input
              id="faculty-name"
              name="name"
              placeholder="Enter faculty name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty-email">Email (optional)</Label>
            <Input
              id="faculty-email"
              name="email"
              type="email"
              placeholder="faculty@college.edu"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty-empid">Employee ID *</Label>
            <Input
              id="faculty-empid"
              name="empId"
              placeholder="FAC001"
              value={formData.empId}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="mech">Mechanical</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="eee">EEE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Select value={formData.designation} onValueChange={(v) => handleSelectChange('designation', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professor">Professor</SelectItem>
                  <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                  <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                  <SelectItem value="Lecturer">Lecturer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty-exp">Experience (Years)</Label>
            <Input
              id="faculty-exp"
              name="experience"
              type="number"
              placeholder="5"
              value={formData.experience}
              onChange={handleInputChange}
            />
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
              {isSubmitting ? 'Adding...' : 'Add Faculty'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
