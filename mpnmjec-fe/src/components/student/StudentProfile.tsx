import { Home, User, BookOpen, Calendar, DollarSign, Camera, Mail, Phone, Users, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { fetchStudentDashboardSummary } from '../../services/studentDashboardService';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

interface ProfileData {
  _id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
  year?: number;
  section?: string;
  semester?: number;
  isActive?: boolean;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  aadhaar?: string;
  mobile?: string;
  parentMobile?: string;
  address?: string;
  admissionYear?: number;
  cgpa?: number;
}

const getDepartmentName = (code?: string) => {
  const depts: Record<string, string> = {
    cse: 'Computer Science & Engineering',
    ece: 'Electronics & Communication Engineering',
    eee: 'Electrical & Electronics Engineering',
    mech: 'Mechanical Engineering',
    civil: 'Civil Engineering',
  };
  return code ? depts[code.toLowerCase()] || code.toUpperCase() : '-';
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const maskAadhaar = (aadhaar?: string) => {
  if (!aadhaar || aadhaar.length < 4) return '-';
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
};

export default function StudentProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetchStudentDashboardSummary();
        if (res.data.profile) {
          setProfile(res.data.profile);
        } else {
          setError(res.data.message || 'Profile not found');
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error || 'Profile not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your personal information</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Profile Header Card */}
          <Card className="p-6 md:p-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-2xl mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border-4 border-white/30">
                  <User className="w-16 h-16 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 text-blue-600" />
                </button>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold mb-2">{profile.name}</h2>
                <p className="text-blue-100 text-lg mb-4">{getDepartmentName(profile.department)} | Semester {profile.semester || '-'}</p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                    <span className="text-sm">Roll: {profile.rollNumber || '-'}</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                    <span className="text-sm">Batch: {profile.admissionYear ? `${profile.admissionYear}-${profile.admissionYear + 4}` : '-'}</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                    <span className="text-sm">CGPA: {profile.cgpa || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input value={profile.name || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
                  <Input value={formatDate(profile.dob)} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Aadhar Number</Label>
                  <Input value={maskAadhaar(profile.aadhaar)} className="mt-1.5" readOnly />
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <div className="mt-1.5 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">{profile.email || '-'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Mobile Number</Label>
                  <Input value={profile.mobile || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Address</Label>
                  <textarea 
                    className="w-full mt-1.5 p-3 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                    defaultValue={profile.address || '-'}
                    readOnly
                  />
                </div>
              </div>
            </Card>

            {/* Parent Information */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Parent Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Father's Name</Label>
                  <Input value={profile.fatherName || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Mother's Name</Label>
                  <Input value={profile.motherName || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Parent's Mobile</Label>
                  <Input value={profile.parentMobile || '-'} className="mt-1.5" readOnly />
                </div>
              </div>
            </Card>

            {/* Academic Information */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-600" />
                Academic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Department</Label>
                  <Input value={getDepartmentName(profile.department)} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Admission Year</Label>
                  <Input value={profile.admissionYear?.toString() || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Current Semester</Label>
                  <Input value={profile.semester?.toString() || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Section</Label>
                  <Input value={profile.section || '-'} className="mt-1.5" readOnly />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Year</Label>
                  <Input value={profile.year?.toString() || '-'} className="mt-1.5" readOnly />
                </div>
              </div>
            </Card>
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}
