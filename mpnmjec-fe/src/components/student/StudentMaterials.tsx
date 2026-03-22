import { useState, useEffect } from 'react';
import { Home, User, BookOpen, Calendar, DollarSign, Download, FileText, Video, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getStudentMaterials, downloadMaterial } from '../../services/studentModuleService';
import { toast } from 'sonner';

interface Material {
  id: string;
  subject: string;
  title: string;
  type: string;
  size: string;
  date: string;
  fileUrl?: string;
  uploadedBy?: string;
  downloads?: number;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: BookOpen, label: 'Academics', path: '/student/academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
  { icon: DollarSign, label: 'Fees', path: '/student/fees' },
];

export default function StudentMaterials() {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        const response = await getStudentMaterials();
        const raw = response.data.materials || [];
        setMaterials(raw.map((m: any) => ({
          id: m._id,
          subject: m.subject || '-',
          title: m.title || '-',
          type: m.type || 'notes',
          size: m.fileSize ? `${(m.fileSize / 1024).toFixed(0)} KB` : '-',
          date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '-',
          fileUrl: m.fileUrl || null,
          uploadedBy: m.uploadedBy || '-',
          downloads: m.downloads || 0,
        })));
      } catch (error) {
        console.error('Failed to fetch materials:', error);
        toast.error('Failed to load materials');
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const handleDownload = async (material: Material) => {
    try {
      // Increment download count on backend
      await downloadMaterial(material.id);
      // Open actual file if URL exists
      if (material.fileUrl) {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const url = material.fileUrl.startsWith('http') ? material.fileUrl : `${base}${material.fileUrl}`;
        window.open(url, '_blank');
      } else {
        toast.info('No file attached to this material');
      }
    } catch (error) {
      toast.error('Failed to download material');
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Study Materials</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="space-y-3">
              {materials.map((mat, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {mat.type === 'pdf' ? <FileText className="w-10 h-10 text-red-600" /> : <Video className="w-10 h-10 text-blue-600" />}
                    <div>
                      <h3 className="font-bold text-gray-900">{mat.title}</h3>
                      <p className="text-sm text-gray-600">{mat.subject} • {mat.size} • {mat.date}</p>
                    </div>
                  </div>
                  <Button onClick={() => handleDownload(mat)}><Download className="w-4 h-4 mr-2" />Download</Button>
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