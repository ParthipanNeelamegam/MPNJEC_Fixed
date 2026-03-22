import { useState, useEffect } from 'react';
import { Home, Bell, FileText, Building2, Trophy, CheckCircle, Clock, XCircle, Eye, Award, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getApprovals, updateApproval } from '../../services/principalService';

interface Approval {
  id: string;
  type: string;
  title: string;
  from: string;
  department: string;
  date: string;
  priority: string;
  status: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/principal/dashboard' },
  { icon: Bell, label: 'Approvals', path: '/principal/approvals' },
  { icon: CalendarDays, label: 'Leave Approvals', path: '/principal/leave-approvals' },
  { icon: FileText, label: 'Reports', path: '/principal/reports' },
  { icon: Building2, label: 'Departments', path: '/principal/departments' },
  { icon: Trophy, label: 'Achievements', path: '/principal/achievements' },
];

export default function PrincipalApprovals() {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await getApprovals();
      setApprovals(response.data.approvals || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const filteredApprovals = approvals.filter(approval => {
    const matchesPriority = priorityFilter === 'all' || approval.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || approval.type === typeFilter;
    return matchesPriority && matchesType;
  });

  const handleApprove = async (id: string) => {
    try {
      await updateApproval(id, { type: 'leave', status: 'approved' });
      toast.success('Request approved successfully');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateApproval(id, { type: 'leave', status: 'rejected' });
      toast.error('Request rejected');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve institutional requests</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-xl">
              <Bell className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.filter(a => a.status === 'Pending').length}</div>
              <div className="text-indigo-100">Pending</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-red-500 to-pink-600 text-white border-0 shadow-xl">
              <Award className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.filter(a => a.priority === 'High').length}</div>
              <div className="text-red-100">High Priority</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
              <CheckCircle className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.filter(a => a.status === 'Approved').length}</div>
              <div className="text-green-100">Approved Today</div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <FileText className="w-8 h-8 mb-3" />
              <div className="text-3xl font-bold">{approvals.length}</div>
              <div className="text-blue-100">Total Requests</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Request Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Certificate">Certificate</SelectItem>
                  <SelectItem value="Leave">Leave</SelectItem>
                  <SelectItem value="Budget">Budget</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Procurement">Procurement</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Approvals List */}
          <div className="space-y-4">
            {filteredApprovals.map((approval) => (
              <Card key={approval.id} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        {approval.type === 'Certificate' && <Award className="w-6 h-6 text-white" />}
                        {approval.type === 'Leave' && <Clock className="w-6 h-6 text-white" />}
                        {approval.type === 'Budget' && <FileText className="w-6 h-6 text-white" />}
                        {approval.type === 'Event' && <Trophy className="w-6 h-6 text-white" />}
                        {approval.type === 'Procurement' && <Building2 className="w-6 h-6 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{approval.title}</h3>
                          <Badge className={
                            approval.priority === 'High' ? 'bg-red-100 text-red-700' :
                            approval.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {approval.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">From: {approval.from}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Badge className="bg-blue-100 text-blue-700">{approval.type}</Badge>
                          <span>•</span>
                          <span>{approval.department}</span>
                          <span>•</span>
                          <span>{approval.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      approval.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      approval.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {approval.status}
                    </Badge>
                    {approval.status === 'Pending' && (
                      <>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">View</span>
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(approval.id)}
                        >
                          <CheckCircle className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Approve</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleReject(approval.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileNav items={navItems} />
      </div>
    </div>
  );
}
