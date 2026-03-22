import { useState, useEffect } from 'react';
import { Home, Bell, FileText, Building2, Trophy, Award, Star, TrendingUp, Loader2, CalendarDays, Plus, Trash2, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { getAchievements, addAchievement, deleteAchievement } from '../../services/principalService';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  achievedByName: string;
  date: string;
  venue: string;
  award: string;
  isHighlighted: boolean;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: Bell, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: FileText, label: 'Reports', path: '/principal/reports' },
  { icon: Building2, label: 'Departments', path: '/principal/departments' },
  { icon: Trophy, label: 'Achievements', path: '/principal/achievements' },
];

const TYPE_COLORS: Record<string, string> = {
  academic: 'from-blue-500 to-indigo-600',
  sports: 'from-green-500 to-emerald-600',
  cultural: 'from-purple-500 to-pink-600',
  technical: 'from-cyan-500 to-blue-600',
  research: 'from-amber-500 to-orange-600',
  placement: 'from-green-600 to-teal-600',
  award: 'from-yellow-500 to-orange-500',
  other: 'from-gray-500 to-slate-600',
};

export default function PrincipalAchievements() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: 'academic', category: 'student',
    achievedByName: '', date: '', venue: '', award: '',
  });

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await getAchievements();
      const raw = response.data.achievements || [];
      setAchievements(raw.map((a: any) => ({
        id: a._id,
        title: a.title,
        description: a.description || '',
        type: a.type || 'other',
        category: a.category || 'student',
        achievedByName: a.achievedBy?.name || '-',
        date: a.date ? new Date(a.date).toLocaleDateString('en-IN') : '-',
        venue: a.venue || '',
        award: a.award || '',
        isHighlighted: a.isHighlighted || false,
      })));
    } catch (error) {
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAchievements(); }, []);

  const handleAdd = async () => {
    if (!form.title || !form.achievedByName || !form.date) {
      toast.error('Title, achieved by, and date are required');
      return;
    }
    try {
      setSaving(true);
      await addAchievement({
        title: form.title,
        description: form.description,
        type: form.type as any,
        category: form.category as any,
        achievedByName: form.achievedByName,
        date: form.date,
        venue: form.venue,
        award: form.award,
      });
      toast.success('Achievement added successfully');
      setShowAddDialog(false);
      setForm({ title: '', description: '', type: 'academic', category: 'student', achievedByName: '', date: '', venue: '', award: '' });
      fetchAchievements();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add achievement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this achievement?')) return;
    try {
      await deleteAchievement(id);
      toast.success('Achievement deleted');
      fetchAchievements();
    } catch {
      toast.error('Failed to delete achievement');
    }
  };

  const thisMonthCount = achievements.filter(a => {
    const d = a.date;
    const now = new Date();
    return d.includes(`${now.getFullYear()}`);
  }).length;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DesktopSidebar items={navItems} title="Principal Portal" subtitle="MPNMJEC ERP" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <MobileNav items={navItems} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar items={navItems} title="Principal Portal" subtitle="MPNMJEC ERP" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Institutional Achievements</h1>
              <p className="text-gray-600">Celebrating excellence and milestones</p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Add Achievement
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-0 shadow-xl">
              <Trophy className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{achievements.length}</div>
              <div className="text-yellow-100">Total Achievements</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{achievements.filter(a => a.type === 'academic').length}</div>
              <div className="text-blue-100">Academic</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <Star className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{achievements.filter(a => a.type === 'sports' || a.type === 'cultural').length}</div>
              <div className="text-green-100">Sports & Cultural</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
              <TrendingUp className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{thisMonthCount}</div>
              <div className="text-purple-100">This Year</div>
            </Card>
          </div>

          {achievements.length === 0 ? (
            <Card className="p-12 text-center bg-white/80 border-0 shadow-lg">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No achievements yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Achievement" to record one</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${TYPE_COLORS[achievement.type] || 'from-gray-500 to-slate-600'} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{achievement.title}</h3>
                          {achievement.description && (
                            <p className="text-sm text-gray-600 mt-0.5">{achievement.description}</p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => handleDelete(achievement.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <Badge className="bg-blue-100 text-blue-700 capitalize">{achievement.type}</Badge>
                        <Badge className="bg-purple-100 text-purple-700 capitalize">{achievement.category}</Badge>
                        <span>•</span>
                        <span>By {achievement.achievedByName}</span>
                        {achievement.award && <><span>•</span><span className="text-amber-600 font-medium">{achievement.award}</span></>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>📅 {achievement.date}</span>
                        {achievement.venue && <span>📍 {achievement.venue}</span>}
                        {achievement.isHighlighted && <Badge className="bg-yellow-100 text-yellow-700">⭐ Highlighted</Badge>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>

        <MobileNav items={navItems} />
      </div>

      {/* Add Achievement Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Achievement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Achievement title" />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['academic','sports','cultural','technical','research','placement','award','other'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['student','faculty','department','institution'].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Achieved By <span className="text-red-500">*</span></Label>
              <Input className="mt-1" value={form.achievedByName} onChange={e => setForm({...form, achievedByName: e.target.value})} placeholder="Name of achiever" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="mt-1" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <Label>Award / Prize</Label>
                <Input className="mt-1" value={form.award} onChange={e => setForm({...form, award: e.target.value})} placeholder="e.g. First Prize" />
              </div>
            </div>
            <div>
              <Label>Venue</Label>
              <Input className="mt-1" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} placeholder="Event venue (optional)" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {saving ? 'Saving...' : 'Add Achievement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}