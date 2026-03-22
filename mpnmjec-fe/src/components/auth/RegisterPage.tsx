import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { register } from '../../services/authService';
import { canSelfRegister } from '../../utils/registration';

const roles = [
  { id: 'student', label: 'Student' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'admin', label: 'Admin' },
  { id: 'hod', label: 'HOD' },
  { id: 'principal', label: 'Principal' },
  { id: 'superUser', label: 'Super User' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: '',
  });
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'email') {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(emailRegex.test(value) ? '' : 'Invalid email address');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.password || !form.role) {
      toast.error('Please fill in all fields');
      return;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!canSelfRegister(form.role)) {
      toast.error('Students are not allowed to self-register.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful! Please login.');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-xl border-0 shadow-2xl p-8 rounded-3xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div>
            <Label htmlFor="name">Name</Label>
            <div className="mt-2" />
            <Input id="name" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <div className="mt-2" />
            <Input id="username" name="username" value={form.username} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="mt-2" />
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            {emailError && <div className="text-red-500 text-xs mt-1">{emailError}</div>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="mt-2" />
            <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <div className="mt-2" />
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="mt-1.5 h-11 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full"
              required
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                  disabled={!canSelfRegister(role.id)}
                  hidden={role.id === 'student'}
                >
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-base shadow-lg shadow-blue-500/30" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <span className="text-gray-600">Already have an account? </span>
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer">Login</a>
        </div>
      </Card>
    </div>
  );
}
