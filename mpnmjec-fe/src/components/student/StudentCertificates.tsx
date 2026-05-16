import { useState, useEffect } from 'react';
import { Home, User, BookOpen, Calendar, DollarSign, Award, Download, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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
  _id?: string;
  type: string;
  typeName?: string;
  date?: string;
  status: string;
  ref?: string;
  purpose?: string;
  certificateNumber?: string;
  appliedAt?: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
  { icon: Award, label: 'Certificates', path: '/student/certificates' },
];

export default function StudentCertificates() {
  const [loading, setLoading] = useState(true);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [myRequests, setMyRequests] = useState<CertificateRequest[]>([]);
  const [purpose, setPurpose] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateType | null>(null);
  const [viewRequest, setViewRequest] = useState<CertificateRequest | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesRes, requestsRes] = await Promise.all([
        getCertificateTypes(),
        getStudentCertificates(),
      ]);

      setCertificateTypes(typesRes.data.types || typesRes.data.certificateTypes || []);
      const requests = requestsRes.data.requests || requestsRes.data.certificates || [];
      setMyRequests(requests.map((request: CertificateRequest) => ({
        ...request,
        id: request.id || request._id,
        status: (request.status || 'pending').toLowerCase(),
      })));
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

  const handleApply = async (typeId: string) => {
    if (!purpose.trim()) {
      toast.error('Please enter purpose for certificate');
      return;
    }

    try {
      await applyCertificate({ type: typeId, purpose });
      toast.success('Certificate request submitted');
      setPurpose('');
      setSelectedCertificate(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    }
  };

  const openCertificatePdf = (request: CertificateRequest) => {
    const downloadKey = request.certificateNumber || request.id;
    if (!downloadKey) {
      toast.error('Certificate reference is missing');
      return;
    }
    window.open(`${apiBaseUrl}/api/student/certificates/${downloadKey}/download`, '_blank');
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
          <p className="text-gray-600">Request and download bonafide and other certificates</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {certificateTypes.map((cert) => (
              <Card key={cert.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <Award className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{cert.name}</h3>
                <p className="text-gray-600 mb-4">{cert.description || 'Submit a request and download the approved certificate as PDF.'}</p>
                <div className="flex items-center justify-between gap-4">
                  <Badge className="bg-green-100 text-green-700">No fee required</Badge>
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                    onClick={() => {
                      setPurpose('');
                      setSelectedCertificate(cert);
                    }}
                  >
                    Request
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-6 p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Requests</h2>
            <div className="space-y-3">
              {myRequests.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-xl text-center text-gray-500">
                  No certificate requests yet
                </div>
              ) : myRequests.map((req, index) => {
                const canDownload = ['approved', 'processing', 'ready', 'collected'].includes(req.status);
                const statusClass = canDownload
                  ? 'bg-green-100 text-green-700'
                  : req.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700';

                return (
                  <div
                    key={req.id || index}
                    className={`p-4 bg-gray-50 rounded-xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${canDownload ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                    onClick={() => canDownload && setViewRequest(req)}
                    title={canDownload ? 'Click to view certificate' : undefined}
                  >
                    <div>
                      <h3 className="font-bold text-gray-900">{req.typeName || req.type}</h3>
                      <p className="text-sm text-gray-600">
                        Ref: {req.certificateNumber || req.ref || req.id || '-'} - {req.appliedAt ? new Date(req.appliedAt).toLocaleDateString('en-IN') : req.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusClass}>
                        {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                      </Badge>
                      {canDownload && (
                        <Button size="sm" onClick={(event) => { event.stopPropagation(); openCertificatePdf(req); }}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </main>
        <MobileNav items={navItems} />
      </div>
      <Dialog open={!!selectedCertificate} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {selectedCertificate?.name}</DialogTitle>
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
              onClick={() => selectedCertificate && handleApply(selectedCertificate.id)}
            >
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewRequest} onOpenChange={(open) => !open && setViewRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewRequest?.typeName || viewRequest?.type || 'Certificate'}</DialogTitle>
          </DialogHeader>
          {viewRequest && (
            <div className="bg-white border-2 border-gray-900 rounded-sm p-8 md:p-10 text-gray-900">
              <div className="text-center border-b border-gray-300 pb-5 mb-8">
                <h2 className="text-2xl font-bold uppercase tracking-wide">{viewRequest.typeName || viewRequest.type}</h2>
                <p className="text-sm text-gray-600 mt-2">Certificate No: {viewRequest.certificateNumber || viewRequest.ref || viewRequest.id || '-'}</p>
              </div>

              <div className="space-y-6 text-base leading-8">
                <p>
                  This is to certify that the student has requested a <strong>{viewRequest.typeName || viewRequest.type}</strong>
                  {viewRequest.purpose ? ` for the purpose of ${viewRequest.purpose}` : ' for official use'}.
                </p>
                <p>
                  The request status is <strong>{viewRequest.status.charAt(0).toUpperCase() + viewRequest.status.slice(1)}</strong>
                  {viewRequest.appliedAt || viewRequest.date ? ` and was applied on ${viewRequest.appliedAt ? new Date(viewRequest.appliedAt).toLocaleDateString('en-IN') : viewRequest.date}` : ''}.
                </p>
                <p>
                  This certificate is issued by MPNMJEC for student record and verification purposes.
                </p>
              </div>

              <div className="mt-16 flex justify-between items-end text-sm">
                <div>
                  <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                  <p>Place: Campus</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-500 w-48 mb-2" />
                  <p className="font-semibold">Principal / Head of Institution</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end print:hidden">
                <Button onClick={(event) => { event.stopPropagation(); openCertificatePdf(viewRequest); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
