import { useState, useEffect } from 'react';
import { Loader2, Save, CheckCircle, AlertCircle, Search, BookOpen } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';
import { toast } from 'sonner';
import { getMyCourses, getMarksForCourse, bulkEnterMarks } from '../../services/facultyService';
import { getAccessToken } from '../../utils/token';
import { getNavItems, decodeToken } from '../../utils/facultyNav';
import type { FacultyUserInfo } from '../../utils/facultyNav';

interface Course {
  _id: string;
  code: string;
  name: string;
  department: string;
  semester?: number;
}

interface StudentMark {
  id: string;
  name: string;
  rollNumber: string;
  year: number;
  section: string;
  semester: number;
  marks: {
    internal1: number;
    internal2: number;
    modelExam: number;
    finalExam: number;
    total: number;
    grade: string;
    isPassed: boolean;
    verifiedByHOD: boolean;
  } | null;
}

interface EditableMarks {
  [studentId: string]: {
    internal1: string;
    internal2: string;
    modelExam: string;
    finalExam: string;
    modified: boolean;
  };
}

export default function FacultyMarksEntry() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [editableMarks, setEditableMarks] = useState<EditableMarks>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userInfo, setUserInfo] = useState<FacultyUserInfo | null>(null);

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
    
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await getMyCourses();
      setCourses(res.data.courses || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentMarks = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    try {
      setLoadingStudents(true);
      const params: any = { courseId: selectedCourse };
      if (selectedYear && selectedYear !== 'all') params.year = parseInt(selectedYear);
      if (selectedSection && selectedSection !== 'all') params.section = selectedSection;
      if (selectedSemester && selectedSemester !== 'all') params.semester = parseInt(selectedSemester);
      const res = await getMarksForCourse(params);
      
      const studentData = res.data.students || [];
      setStudents(studentData);
      
      // Initialize editable marks
      const initial: EditableMarks = {};
      studentData.forEach((s: StudentMark) => {
        initial[s.id] = {
          internal1: s.marks?.internal1?.toString() || '',
          internal2: s.marks?.internal2?.toString() || '',
          modelExam: s.marks?.modelExam?.toString() || '',
          finalExam: s.marks?.finalExam?.toString() || '',
          modified: false,
        };
      });
      setEditableMarks(initial);
    } catch (error: any) {
      console.error('Failed to load students:', error);
      toast.error(error.response?.data?.error || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleMarkChange = (studentId: string, field: string, value: string) => {
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;
    
    setEditableMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        modified: true,
      },
    }));
  };

  const handleSaveAll = async () => {
    const modifiedStudents = Object.entries(editableMarks)
      .filter(([_, data]) => data.modified)
      .map(([studentId, data]) => ({
        studentId,
        internal1: data.internal1 ? parseInt(data.internal1) : undefined,
        internal2: data.internal2 ? parseInt(data.internal2) : undefined,
        modelExam: data.modelExam ? parseInt(data.modelExam) : undefined,
        finalExam: data.finalExam ? parseInt(data.finalExam) : undefined,
      }));

    if (modifiedStudents.length === 0) {
      toast.info('No changes to save');
      return;
    }

        try {
      setSaving(true);
      const semNum = selectedSemester && selectedSemester !== 'all' ? parseInt(selectedSemester) : 1;
      await bulkEnterMarks({
        courseId: selectedCourse,
        semester: semNum,
        marksData: modifiedStudents,
      });

      toast.success(`Saved marks for ${modifiedStudents.length} students`);
      // Reset modified flags
      setEditableMarks(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          updated[id].modified = false;
        });
        return updated;
      });
      
      // Reload data
      loadStudentMarks();
    } catch (error: any) {
      console.error('Failed to save marks:', error);
      toast.error(error.response?.data?.error || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modifiedCount = Object.values(editableMarks).filter(m => m.modified).length;

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar 
        items={getNavItems(userInfo?.isClassAdvisor || false)} 
        title="Faculty Portal" 
        subtitle={userInfo?.department ? `${userInfo.department.toUpperCase()} Department` : ''} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Marks Entry</h1>
              <p className="text-gray-600">Enter internal and exam marks for students</p>
            </div>
            {modifiedCount > 0 && (
              <Button 
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All ({modifiedCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Filters */}
          <Card className="p-4 mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Semester</Label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={loadStudentMarks}
                  disabled={!selectedCourse || loadingStudents}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loadingStudents ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Load Students'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Course Info */}
          {selectedCourseData && students.length > 0 && (
            <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedCourseData.code} - {selectedCourseData.name}</h3>
                  <p className="text-sm text-gray-600">
                    Year {selectedYear} • Section {selectedSection} • Semester {selectedSemester}
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-700">{students.length} Students</Badge>
              </div>
            </Card>
          )}

          {/* Search */}
          {students.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Marks Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Select a course and load students to enter marks</p>
            </Card>
          ) : (
            <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                    <tr>
                      <th className="text-left text-white font-semibold p-4">Roll No</th>
                      <th className="text-left text-white font-semibold p-4">Name</th>
                      <th className="text-center text-white font-semibold p-4">Internal 1 (25)</th>
                      <th className="text-center text-white font-semibold p-4">Internal 2 (25)</th>
                      <th className="text-center text-white font-semibold p-4">Model (50)</th>
                      <th className="text-center text-white font-semibold p-4">Final (100)</th>
                      <th className="text-center text-white font-semibold p-4">Total</th>
                      <th className="text-center text-white font-semibold p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => {
                      const marks = editableMarks[student.id];
                      const isVerified = student.marks?.verifiedByHOD;
                      
                      // Calculate total from editable marks
                      const int1 = parseInt(marks?.internal1 || '0') || 0;
                      const int2 = parseInt(marks?.internal2 || '0') || 0;
                      const model = parseInt(marks?.modelExam || '0') || 0;
                      const final = parseInt(marks?.finalExam || '0') || 0;
                      const total = int1 + int2 + model + final;
                      
                      return (
                        <tr 
                          key={student.id} 
                          className={`border-b ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${marks?.modified ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="p-4 font-medium">{student.rollNumber}</td>
                          <td className="p-4">{student.name}</td>
                          <td className="p-4 text-center">
                            <Input
                              type="text"
                              value={marks?.internal1 || ''}
                              onChange={(e) => handleMarkChange(student.id, 'internal1', e.target.value)}
                              disabled={isVerified}
                              className="w-16 text-center mx-auto"
                              maxLength={2}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Input
                              type="text"
                              value={marks?.internal2 || ''}
                              onChange={(e) => handleMarkChange(student.id, 'internal2', e.target.value)}
                              disabled={isVerified}
                              className="w-16 text-center mx-auto"
                              maxLength={2}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Input
                              type="text"
                              value={marks?.modelExam || ''}
                              onChange={(e) => handleMarkChange(student.id, 'modelExam', e.target.value)}
                              disabled={isVerified}
                              className="w-16 text-center mx-auto"
                              maxLength={2}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Input
                              type="text"
                              value={marks?.finalExam || ''}
                              onChange={(e) => handleMarkChange(student.id, 'finalExam', e.target.value)}
                              disabled={isVerified}
                              className="w-20 text-center mx-auto"
                              maxLength={3}
                            />
                          </td>
                          <td className="p-4 text-center font-bold">{total || '-'}</td>
                          <td className="p-4 text-center">
                            {isVerified ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : marks?.modified ? (
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Modified
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    </div>
  );
}
