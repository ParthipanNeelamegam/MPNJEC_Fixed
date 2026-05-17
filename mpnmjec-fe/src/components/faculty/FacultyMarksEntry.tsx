import { useState, useEffect, useMemo } from 'react';
import { Loader2, Save, CheckCircle, AlertCircle, Search, BookOpen, BarChart2 } from 'lucide-react';
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

// Mark ranges for the analysis table (like the handwritten form)
const MARK_RANGES = [
  { label: '0 - 09', min: 0, max: 9 },
  { label: '10 - 19', min: 10, max: 19 },
  { label: '20 - 29', min: 20, max: 29 },
  { label: '30 - 39', min: 30, max: 39 },
  { label: '40 - 49', min: 40, max: 49 },
  { label: '50 - 59', min: 50, max: 59 },
  { label: '60 - 69', min: 60, max: 69 },
  { label: '70 - 79', min: 70, max: 79 },
  { label: '80 - 89', min: 80, max: 89 },
  { label: '90 - 100', min: 90, max: 100 },
];

// Compute live analysis from current editable marks
function computeAnalysis(students: StudentMark[], editableMarks: EditableMarks) {
  const totals: number[] = [];

  students.forEach(s => {
    const m = editableMarks[s.id];
    if (!m) return;
    const int1 = parseInt(m.internal1 || '0') || 0;
    const int2 = parseInt(m.internal2 || '0') || 0;
    const model = parseInt(m.modelExam || '0') || 0;
    const final = parseInt(m.finalExam || '0') || 0;
    const hasAny = int1 || int2 || model || final;
    if (!hasAny) return;
    // Same formula as backend pre-save hook
    const computed = Math.round((int1 + int2) / 2 + model / 2 + final / 2);
    totals.push(computed);
  });

  if (totals.length === 0) return null;

  const rangeDist: number[] = MARK_RANGES.map(r =>
    totals.filter(t => t >= r.min && t <= r.max).length
  );

  // Pass = finalExam >= 50 (same as backend isPassed)
  const passCount = students.filter(s => {
    const m = editableMarks[s.id];
    if (!m) return false;
    const finalVal = parseInt(m.finalExam || '0') || 0;
    return finalVal >= 50;
  }).length;

  const filledCount = totals.length;
  const absentCount = students.length - filledCount;
  const failCount = filledCount - passCount;
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  const overallPassPct = filledCount > 0 ? Math.round((passCount / filledCount) * 100) : 0;

  return { rangeDist, presentCount: filledCount, absentCount, passCount, failCount, highest, lowest, overallPassPct };
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
    if (value && !/^\d*$/.test(value)) return;
    setEditableMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value, modified: true },
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

    if (modifiedStudents.length === 0) { toast.info('No changes to save'); return; }

    try {
      setSaving(true);
      const semNum = selectedSemester && selectedSemester !== 'all' ? parseInt(selectedSemester) : 1;
      await bulkEnterMarks({ courseId: selectedCourse, semester: semNum, marksData: modifiedStudents });
      toast.success(`Saved marks for ${modifiedStudents.length} students`);
      setEditableMarks(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => { updated[id].modified = false; });
        return updated;
      });
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

  // Live analysis — recomputes whenever marks change
  const analysis = useMemo(
    () => (students.length > 0 ? computeAnalysis(students, editableMarks) : null),
    [students, editableMarks]
  );

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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save All ({modifiedCount})</>
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
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select Course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="All Years" /></SelectTrigger>
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
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="All Sections" /></SelectTrigger>
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
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Semester" /></SelectTrigger>
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
                  {loadingStudents ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Students'}
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
                  <p className="text-sm text-gray-600">Year {selectedYear} • Section {selectedSection} • Semester {selectedSemester}</p>
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
            <>
              <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
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
                        const int1 = parseInt(marks?.internal1 || '0') || 0;
                        const int2 = parseInt(marks?.internal2 || '0') || 0;
                        const model = parseInt(marks?.modelExam || '0') || 0;
                        const final = parseInt(marks?.finalExam || '0') || 0;
                        const hasAnyMark = int1 || int2 || model || final;
                        const total = Math.round((int1 + int2) / 2 + model / 2 + final / 2);

                        return (
                          <tr
                            key={student.id}
                            className={`border-b ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${marks?.modified ? 'bg-yellow-50' : ''}`}
                          >
                            <td className="p-4 font-medium">{student.rollNumber}</td>
                            <td className="p-4">{student.name}</td>
                            <td className="p-4 text-center">
                              <Input type="text" value={marks?.internal1 || ''} onChange={(e) => handleMarkChange(student.id, 'internal1', e.target.value)} disabled={isVerified} className="w-16 text-center mx-auto" maxLength={2} />
                            </td>
                            <td className="p-4 text-center">
                              <Input type="text" value={marks?.internal2 || ''} onChange={(e) => handleMarkChange(student.id, 'internal2', e.target.value)} disabled={isVerified} className="w-16 text-center mx-auto" maxLength={2} />
                            </td>
                            <td className="p-4 text-center">
                              <Input type="text" value={marks?.modelExam || ''} onChange={(e) => handleMarkChange(student.id, 'modelExam', e.target.value)} disabled={isVerified} className="w-16 text-center mx-auto" maxLength={2} />
                            </td>
                            <td className="p-4 text-center">
                              <Input type="text" value={marks?.finalExam || ''} onChange={(e) => handleMarkChange(student.id, 'finalExam', e.target.value)} disabled={isVerified} className="w-20 text-center mx-auto" maxLength={3} />
                            </td>
                            <td className="p-4 text-center font-bold">{hasAnyMark ? total : '-'}</td>
                            <td className="p-4 text-center">
                              {isVerified ? (
                                <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
                              ) : marks?.modified ? (
                                <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3 mr-1" />Modified</Badge>
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

              {/* =============================================
                  ANALYSIS SECTION — like the handwritten form
                  ============================================= */}
              {analysis && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-bold text-white">Analysis</h2>
                    <span className="text-violet-200 text-sm ml-1">(Live — updates as you type)</span>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* % of Mark Range Table */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        % of Mark — No. of Students
                      </h3>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left px-4 py-2 font-semibold text-gray-600 border-b border-r border-gray-200">% of Mark</th>
                              <th className="text-center px-4 py-2 font-semibold text-gray-600 border-b border-gray-200">No. of Students</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MARK_RANGES.map((range, i) => (
                              <tr key={range.label} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="px-4 py-2 border-r border-gray-200 text-gray-700">{range.label}</td>
                                <td className="px-4 py-2 text-center">
                                  {analysis.rangeDist[i] > 0 ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-sm">
                                      {analysis.rangeDist[i]}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex flex-col gap-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Summary</h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-blue-700">{analysis.presentCount}</p>
                          <p className="text-xs text-blue-600 mt-1">Students Present<br/>(marks entered)</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-orange-600">{analysis.absentCount}</p>
                          <p className="text-xs text-orange-500 mt-1">Students Absent<br/>(no marks)</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-green-700">{analysis.passCount}</p>
                          <p className="text-xs text-green-600 mt-1">Students Passed</p>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">{analysis.failCount}</p>
                          <p className="text-xs text-red-500 mt-1">Students Failed</p>
                        </div>
                      </div>

                      {/* Pass % bar */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">Overall Pass %</span>
                          <span className="text-lg font-bold text-violet-700">{analysis.overallPassPct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${analysis.overallPassPct}%`,
                              background: analysis.overallPassPct >= 75
                                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                : analysis.overallPassPct >= 50
                                ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                                : 'linear-gradient(90deg, #dc2626, #ef4444)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Highest / Lowest */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-emerald-700">{analysis.highest}</p>
                          <p className="text-xs text-emerald-600 mt-1">Highest Mark<br/>in the Subject</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-rose-600">{analysis.lowest}</p>
                          <p className="text-xs text-rose-500 mt-1">Lowest Mark<br/>in the Subject</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>

        <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
      </div>
    </div>
  );
}