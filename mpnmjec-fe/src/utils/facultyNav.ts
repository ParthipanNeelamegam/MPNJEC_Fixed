import { Home, Users, BookOpen, Calendar, FileText, ClipboardList, GraduationCap, BarChart3 } from 'lucide-react';

export const baseNavItems = [
  { icon: Home, label: 'Dashboard', path: '/faculty/dashboard' },
  { icon: Users, label: 'Students', path: '/faculty/students' },
  { icon: BookOpen, label: 'Courses', path: '/faculty/courses' },
  { icon: Calendar, label: 'Attendance', path: '/faculty/attendance' },
  { icon: FileText, label: 'Materials', path: '/faculty/materials' },
  { icon: ClipboardList, label: 'Marks Entry', path: '/faculty/marks' },
];

export const advisorNavItems = [
  { icon: GraduationCap, label: 'My Class', path: '/faculty/advisor/class' },
  { icon: BarChart3, label: 'Result Analysis', path: '/faculty/result-analysis' },
];

export const getNavItems = (isClassAdvisor: boolean = false) => {
  if (isClassAdvisor) {
    return [...baseNavItems, ...advisorNavItems];
  }
  return baseNavItems;
};

export const decodeToken = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

export interface FacultyUserInfo {
  id: string;
  name: string;
  role: string;
  department?: string;
  isClassAdvisor?: boolean;
  advisorFor?: { year: number; section?: string; department?: string };
}
