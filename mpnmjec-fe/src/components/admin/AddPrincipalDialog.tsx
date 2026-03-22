import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import { createPrincipal, getHODs, getPrincipal } from '../../services/adminService';
import { Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface AddPrincipalDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

interface HODOption {
  id: string;
  name: string;
  department: string;
}

export default function AddPrincipalDialog({ trigger, onSuccess }: AddPrincipalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createMode, setCreateMode] = useState<'new' | 'promote'>('new');
  const [hodList, setHodList] = useState<HODOption[]>([]);
  const [existingPrincipal, setExistingPrincipal] = useState<any>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    hodId: '',
  });

  useEffect(() => {
    if (isOpen) {
      checkExistingPrincipal();
      if (createMode === 'promote') {
        fetchHODs();
      }
    }
  }, [isOpen, createMode]);

  const checkExistingPrincipal = async () => {
    try {
      const res = await getPrincipal();
      if (res.data.principal) {
        setExistingPrincipal(res.data.principal);
      } else {
        setExistingPrincipal(null);
      }
    } catch (error) {
      setExistingPrincipal(null);
    }
  };

  const fetchHODs = async () => {
    try {
      const res = await getHODs();
      setHodList(res.data.hods || []);
    } catch (error) {
      console.error('Failed to fetch HODs:', error);
    }
  };

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
      username: '',
      password: '',
      hodId: '',
    });
    setCredentials(null);
    setCreateMode('new');
    setConfirmReplace(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (createMode === 'new' && (!formData.name || (!formData.email && !formData.username))) {
      toast.error('Please fill in required fields');
      return;
    }

    if (createMode === 'promote' && !formData.hodId) {
      toast.error('Please select an HOD to promote');
      return;
    }

    // Check if replacing existing principal
    if (existingPrincipal && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {};
      
      if (createMode === 'promote') {
        payload.hodId = formData.hodId;
      } else {
        payload.name = formData.name;
        if (formData.email) payload.email = formData.email;
        if (formData.username) payload.username = formData.username;
        if (formData.password) payload.password = formData.password;
      }

      const res = await createPrincipal(payload);
      
      // If credentials are returned, show them
      if (res.data.credentials) {
        setCredentials(res.data.credentials);
        toast.success('Principal created successfully! Save the credentials.');
      } else {
        toast.success('Principal assigned successfully');
        setIsOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create Principal';
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
          <DialogTitle>Add Principal</DialogTitle>
        </DialogHeader>

        {credentials ? (
          <div className="py-4 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Principal Created Successfully!</h3>
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
        ) : confirmReplace ? (
          <div className="py-4 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800">Replace Existing Principal?</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    A principal already exists: <strong>{existingPrincipal?.name}</strong>. 
                    Creating a new principal will replace them.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmReplace(false)}>
                Go Back
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-600 to-red-600"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Yes, Replace Principal'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {existingPrincipal && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="text-blue-800">
                  Current Principal: <strong>{existingPrincipal.name}</strong>
                </span>
              </div>
            )}

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
                Promote HOD
              </button>
            </div>

            {createMode === 'promote' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select HOD *</Label>
                  <Select value={formData.hodId} onValueChange={(v) => handleSelectChange('hodId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select HOD to promote" />
                    </SelectTrigger>
                    <SelectContent>
                      {hodList.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} - {h.department?.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hodList.length === 0 && (
                  <p className="text-sm text-gray-500">No HODs available. Create an HOD first.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="principal-name">Full Name *</Label>
                  <Input
                    id="principal-name"
                    name="name"
                    placeholder="Enter Principal name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principal-email">Email</Label>
                  <Input
                    id="principal-email"
                    name="email"
                    type="email"
                    placeholder="principal@college.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principal-username">Username (optional if email provided)</Label>
                  <Input
                    id="principal-username"
                    name="username"
                    placeholder="principal"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principal-password">Password (auto-generated if empty)</Label>
                  <Input
                    id="principal-password"
                    name="password"
                    type="password"
                    placeholder="Leave empty to auto-generate"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : createMode === 'promote' ? 'Promote to Principal' : 'Create Principal'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
