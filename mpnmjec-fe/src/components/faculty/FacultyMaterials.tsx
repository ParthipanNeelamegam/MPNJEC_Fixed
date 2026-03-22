import { useState, useEffect, useRef } from 'react';
import { Upload, File, Download, Trash2, Loader2, FileText, BookOpen, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getMaterials, uploadMaterial, deleteMaterial } from '../../services/facultyService';
import { getNavItems, decodeToken } from '../../utils/facultyNav';
import type { FacultyUserInfo } from '../../utils/facultyNav';
import { getAccessToken } from '../../utils/token';

interface Material {
  _id: string;
  title: string;
  subject: string;
  type: string;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  createdAt: string;
  downloads: number;
}

export default function FacultyMaterials() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploadData, setUploadData] = useState({ title: '', subject: '', type: 'notes' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userInfo, setUserInfo] = useState<FacultyUserInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUserInfo({
          id: decoded.id,
          name: decoded.name || 'Faculty',
          role: decoded.role,
          department: decoded.department,
          isClassAdvisor: decoded.isClassAdvisor || false,
          advisorFor: decoded.advisorFor || null,
        });
      }
    }
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await getMaterials();
      setMaterials(response.data.materials || []);
    } catch (error) {
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setSelectedFile(file); toast.success('File selected: ' + file.name); }
  };

  const handleUpload = async () => {
    if (!uploadData.title.trim() || !uploadData.subject.trim()) {
      toast.error('Title and subject are required');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('title', uploadData.title.trim());
      formData.append('subject', uploadData.subject.trim());
      formData.append('type', uploadData.type);
      formData.append('file', selectedFile);
      await uploadMaterial(formData);
      toast.success('Material uploaded successfully');
      setShowUploadDialog(false);
      setUploadData({ title: '', subject: '', type: 'notes' });
      setSelectedFile(null);
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await deleteMaterial(id);
      toast.success('Material deleted');
      fetchMaterials();
    } catch {
      toast.error('Failed to delete material');
    }
  };

  const handleDownload = (material: Material) => {
    if (material.fileUrl) {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = material.fileUrl.startsWith('http') ? material.fileUrl : `${base}${material.fileUrl}`;
      window.open(url, '_blank');
    } else {
      toast.error('No file available for this material');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN');

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      pdf: 'bg-red-100 text-red-700',
      notes: 'bg-blue-100 text-blue-700',
      assignment: 'bg-purple-100 text-purple-700',
      question_paper: 'bg-amber-100 text-amber-700',
      syllabus: 'bg-green-100 text-green-700',
    };
    return map[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={getNavItems(userInfo?.isClassAdvisor || false)} title="Faculty Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Study Materials</h1>
              <p className="text-gray-600">Upload and manage course materials</p>
            </div>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Upload Study Material</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Material Title <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. Unit 1 - Introduction to OS"
                      className="mt-1.5"
                      value={uploadData.title}
                      onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Subject <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g. Operating Systems"
                        className="mt-1.5"
                        value={uploadData.subject}
                        onChange={(e) => setUploadData({ ...uploadData, subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={uploadData.type}
                        onValueChange={(value) => setUploadData({ ...uploadData, type: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notes">Notes</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="assignment">Assignment</SelectItem>
                          <SelectItem value="question_paper">Question Paper</SelectItem>
                          <SelectItem value="syllabus">Syllabus</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* File Drop Zone */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                      isDragging ? 'border-blue-500 bg-blue-50' : selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <>
                        <File className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-green-700">{selectedFile.name}</p>
                        <p className="text-sm text-green-600">{formatSize(selectedFile.size)} — click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="font-medium text-gray-900 mb-1">Drop file here or click to browse</p>
                        <p className="text-sm text-gray-500">PDF, DOC, DOCX, PPT, PPTX, ZIP (Max 10MB)</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setSelectedFile(file); toast.success('File selected: ' + file.name); }
                      }}
                    />
                  </div>

                  {!selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      A file is required to upload a material
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                  >
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : 'Upload Material'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{materials.length}</div>
              <div className="text-sm text-gray-600">Total Materials</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{materials.reduce((sum, m) => sum + m.downloads, 0)}</div>
              <div className="text-sm text-gray-600">Total Downloads</div>
            </Card>
            <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {new Set(materials.map(m => m.subject)).size}
              </div>
              <div className="text-sm text-gray-600">Subjects</div>
            </Card>
          </div>

          {/* Materials List */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Uploaded Materials</h2>
            {materials.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No materials uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div key={material._id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeColor(material.type)}`}>
                        <File className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 mb-1">{material.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                              <Badge className="bg-blue-100 text-blue-700">{material.subject}</Badge>
                              <Badge className={getTypeColor(material.type)}>{material.type}</Badge>
                              {material.fileName && <span className="truncate max-w-[150px]">{material.fileName}</span>}
                              {material.fileSize && <span>{formatSize(material.fileSize)}</span>}
                              <span>•</span>
                              <span>{formatDate(material.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownload(material)}
                              title="Download / View file"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(material._id)}
                              title="Delete material"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Download className="w-4 h-4" />
                          <span>{material.downloads} downloads</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    </div>
  );
}