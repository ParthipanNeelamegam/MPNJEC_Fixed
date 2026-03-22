import { useState, useEffect } from 'react';
import { Home, User, BookOpen, Calendar, DollarSign, Award, Download, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getCertificateTypes, getStudentCertificates, applyCertificate } from '../../services/studentModuleService';
import { toast } from 'sonner';

interface CertificateType {
  id: string;
  name: string;
  description: string;
  fee: number;
}

interface CertificateRequest {
  id?: string;
  type: string;
  typeName?: string;
  date?: string;
  status: string;
  ref?: string;
  certificateNumber?: string;
  appliedAt?: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

export default function StudentCertificates() {
  const [loading, setLoading] = useState(true);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [myRequests, setMyRequests] = useState<CertificateRequest[]>([]);
  const [purpose, setPurpose] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesRes, requestsRes] = await Promise.all([
        getCertificateTypes(),
        getStudentCertificates()
      ]);
      // Support both .types and .certificateTypes from backend
      setCertificateTypes(typesRes.data.types || typesRes.data.certificateTypes || []);
      setMyRequests(requestsRes.data.requests || requestsRes.data.certificates || []);
    } catch (error) {
      console.error('Failed to fetch certificates data:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (_typeId: string) => {
    if (!purpose.trim()) {
      toast.error('Please enter purpose for certificate');
      return;
    }
    try {
      // Use the certificate type id, not name, for backend
      await applyCertificate({ type: _typeId, purpose });
      toast.success('Certificate request submitted');
      setPurpose('');
      fetchData();
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };
  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Student Portal" subtitle="MPNMJEC ERP" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-600">Request and download certificates</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {certificateTypes.map((cert, index) => (
              <Card key={index} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <Award className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{cert.name}</h3>
                <p className="text-gray-600 mb-4">{cert.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">₹{cert.fee}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                        Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request {cert.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Purpose</Label>
                          <Textarea 
                            placeholder="Enter purpose for certificate" 
                            className="mt-2"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                          />
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => handleApply(cert.id)}
                        >
                          Submit Request
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-6 p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Requests</h2>
            <div className="space-y-3">
              {myRequests.map((req, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{req.typeName || req.type}</h3>
                    <p className="text-sm text-gray-600">Ref: {req.certificateNumber || req.ref || '-'} • {req.appliedAt ? new Date(req.appliedAt).toLocaleDateString() : req.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={req.status === 'ready' || req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                    </Badge>
                    {(req.status === 'ready' || req.status === 'approved') && req.certificateNumber && (
                      <Button size="sm" onClick={() => window.open(`/api/student/certificates/${req.certificateNumber}/download`, '_blank')}><Download className="w-4 h-4" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </main>
        <MobileNav items={navItems} />
      </div>
    </div>
  );
}
