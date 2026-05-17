import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { BookOpen, GraduationCap, Users, UserCog, Award, Library } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '../../services/authService';
import { setAccessToken } from '../../utils/token';

const roles = [
  { id: 'student', label: 'Student', icon: GraduationCap, path: '/student/dashboard', color: 'from-blue-500 to-indigo-600' },
  { id: 'faculty', label: 'Faculty', icon: BookOpen, path: '/faculty/dashboard', color: 'from-purple-500 to-pink-600' },
  { id: 'admin', label: 'Admin', icon: UserCog, path: '/admin/dashboard', color: 'from-green-500 to-teal-600' },
  { id: 'hod', label: 'HOD', icon: Users, path: '/hod/dashboard', color: 'from-orange-500 to-red-600' },
  { id: 'principal', label: 'Principal', icon: Award, path: '/principal/dashboard', color: 'from-indigo-500 to-purple-600' },
  { id: 'librarian', label: 'Librarian', icon: Library, path: '/library/dashboard', color: 'from-teal-500 to-cyan-600' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('student');
  const [credentials, setCredentials] = useState({ email: '', password: '' });


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const res = await login(credentials.email, credentials.password);
      if (selectedRole !== res.user.role) {
        toast.error('Selected role does not match your account role.');
        return;
      }
     
      
      setAccessToken(res.accessToken);
      toast.success('Welcome back!');
      // role-based redirect
      switch (res.user.role) {
        case 'student':
          navigate('/student/dashboard');
          break;
        case 'faculty':
          navigate('/faculty/dashboard');
          break;
        case 'hod':
          navigate('/hod/dashboard');
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'principal':
          navigate('/principal/dashboard');
          break;
        case 'librarian':
          navigate('/library/dashboard');
          break;
        case 'superUser':
          navigate('/admin/dashboard'); // SuperUser uses admin dashboard
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section - Hero */}
      <div 
        className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-12 flex-col justify-between relative overflow-hidden"
      >
        {/* Tamil Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">வணக்கம்</h1>
              <p className="text-blue-100 text-sm">Welcome to MPNMJEC management portal</p>
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Excellence in<br />Academic Management
            </h2>
            <p className="text-blue-100 text-lg max-w-md">
              Empowering education through seamless digital transformation
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-white">5000+</div>
                <div className="text-blue-100 text-sm">Students</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">200+</div>
                <div className="text-blue-100 text-sm">Faculty</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">50+</div>
                <div className="text-blue-100 text-sm">Programs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-xl border-0 shadow-2xl p-8 rounded-3xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to access your dashboard</p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Role</Label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedRole === role.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${
                      selectedRole === role.id ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                    <div className={`text-xs font-medium ${
                      selectedRole === role.id ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {role.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email / Roll Number</Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter your email or roll number"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="mt-1.5 h-11 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="mt-1.5 h-11 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-base shadow-lg shadow-blue-500/30"
            >
              Sign In
            </Button>
          </form>

          {/* DISABLED: Public registration - Users must be created by Admin */}
          {/* <div className="mt-6 text-center">
            <span className="text-gray-600">New user? </span>
            <a
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-medium underline cursor-pointer"
            >
              Register here
            </a>
          </div> */}
        </Card>
      </div>
    </div>
  );
}