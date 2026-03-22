import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import { createHOD, getFaculty } from '../../services/adminService';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

interface AddHODDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

interface FacultyOption {
  id: string;
  name: string;
  empId: string;
  department: string;
}

export default function AddHODDialog({ trigger, onSuccess }: AddHODDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createMode, setCreateMode] = useState<'new' | 'promote'>('new');
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    department: '',
    facultyId: '',
  });

  useEffect(() => {
    if (isOpen && createMode === 'promote') {
      fetchFaculty();
    }
  }, [isOpen, createMode]);

  const fetchFaculty = async () => {
    try {
      const res = await getFaculty();
      setFacultyList(res.data.faculty || []);
    } catch (error) {
      console.error('Failed to fetch faculty:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If selecting a faculty for promotion, auto-fill department
    if (name === 'facultyId' && createMode === 'promote') {
      const selectedFaculty = facultyList.find(f => f.id === value);
      if (selectedFaculty) {
        setFormData(prev => ({ ...prev, department: selectedFaculty.department }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      department: '',
      facultyId: '',
    });
    setCredentials(null);
    setCreateMode('new');
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }

    if (createMode === 'new' && (!formData.name || (!formData.email && !formData.username))) {
      toast.error('Please fill in required fields');
      return;
    }

    if (createMode === 'promote' && !formData.facultyId) {
      toast.error('Please select a faculty member to promote');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = { department: formData.department };
      
      if (createMode === 'promote') {
        payload.facultyId = formData.facultyId;
      } else {
        payload.name = formData.name;
        if (formData.email) payload.email = formData.email;
        if (formData.username) payload.username = formData.username;
        if (formData.password) payload.password = formData.password;
      }

      const res = await createHOD(payload);
      
      // If credentials are returned, show them
      if (res.data.credentials) {
        setCredentials(res.data.credentials);
        toast.success('HOD created successfully! Save the credentials.');
      } else {
        toast.success('HOD assigned successfully');
        setIsOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create HOD';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
    if (credentials) {
      onSuccess?.();
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
          <DialogTitle>Add Head of Department</DialogTitle>
        </DialogHeader>

        {credentials ? (
          <div className="py-4 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">HOD Created Successfully!</h3>
              <p className="text-sm text-green-700 mb-4">Save these credentials. They will only be shown once.</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="text-xs text-gray-500">Username</span>
                    <p className="font-mono font-semibold">{credentials.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(credentials.username, 'username')}
                  >
                    {copied === 'username' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="text-xs text-gray-500">Password</span>
                    <p className="font-mono font-semibold">
                      {showPassword ? credentials.password : '••••••••'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(credentials.password, 'password')}
                    >
                      {copied === 'password' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Creation Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  createMode === 'new' ? 'bg-white shadow' : 'text-gray-600'
                }`}
                onClick={() => setCreateMode('new')}
              >
                Create New
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  createMode === 'promote' ? 'bg-white shadow' : 'text-gray-600'
                }`}
                onClick={() => setCreateMode('promote')}
              >
                Promote Faculty
              </button>
            </div>

            {createMode === 'promote' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Faculty *</Label>
                  <Select value={formData.facultyId} onValueChange={(v) => handleSelectChange('facultyId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty to promote" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyList.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name} ({f.empId}) - {f.department?.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hod-name">Full Name *</Label>
                  <Input
                    id="hod-name"
                    name="name"
                    placeholder="Enter HOD name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hod-email">Email</Label>
                  <Input
                    id="hod-email"
                    name="email"
                    type="email"
                    placeholder="hod@college.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hod-username">Username (optional if email provided)</Label>
                  <Input
                    id="hod-username"
                    name="username"
                    placeholder="hodcse"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hod-password">Password (auto-generated if empty)</Label>
                  <Input
                    id="hod-password"
                    name="password"
                    type="password"
                    placeholder="Leave empty to auto-generate"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Department *</Label>
              <Select 
                value={formData.department} 
                onValueChange={(v) => handleSelectChange('department', v)}
                disabled={createMode === 'promote' && !!formData.facultyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-orange-600 to-red-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : createMode === 'promote' ? 'Promote to HOD' : 'Create HOD'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
