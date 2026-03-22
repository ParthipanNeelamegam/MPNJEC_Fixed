import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { createLibrarian } from '../../services/adminService';
import { Copy, CheckCircle } from 'lucide-react';

interface AddLibrarianDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function AddLibrarianDialog({ trigger, onSuccess }: AddLibrarianDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    empId: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', empId: '' });
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

    if (!formData.name || !formData.empId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createLibrarian({
        name: formData.name,
        email: formData.email || undefined,
        empId: formData.empId,
      });

      const data = response.data;
      const username = data.librarian?.username || formData.empId.toLowerCase();
      const password = data.generatedPassword;

      if (password) {
        setCredentials({ username, password });
      }

      toast.success('Librarian added successfully');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add librarian';
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
          <DialogTitle>{credentials ? 'Librarian Created - Credentials' : 'Add New Librarian'}</DialogTitle>
          {credentials && <DialogDescription>Copy the credentials below to share with the librarian</DialogDescription>}
        </DialogHeader>

        {credentials ? (
          <div className="py-4 space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Librarian created successfully!</span>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Please share these credentials with the librarian. The password will not be shown again.
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
              <Label htmlFor="librarian-name">Full Name *</Label>
              <Input
                id="librarian-name"
                name="name"
                placeholder="Enter librarian name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="librarian-email">Email (optional)</Label>
              <Input
                id="librarian-email"
                name="email"
                type="email"
                placeholder="librarian@college.edu"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="librarian-empid">Employee ID *</Label>
              <Input
                id="librarian-empid"
                name="empId"
                placeholder="LIB001"
                value={formData.empId}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-gray-500">This will also be used as the username for login</p>
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
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Librarian'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
