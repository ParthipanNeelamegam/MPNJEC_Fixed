import { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';

import DesktopSidebar from '../shared/DesktopSidebar';
import MobileNav from '../shared/MobileNav';

import { toast } from 'sonner';
import {
  getMyCourses,
  getMarksForCourse,
  bulkEnterMarks
} from '../../services/facultyService';

import { getAccessToken } from '../../utils/token';
import { getNavItems, decodeToken } from '../../utils/facultyNav';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Import icons
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Users,
  Edit3,
  Save,
  X,
  FileText,
  Download,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';

export default function FacultyMarksEntry() {

  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<any>({});
  const [originalMarks, setOriginalMarks] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    successCount: number;
    failCount: number;
    failedStudents: string[];
    message: string;
  } | null>(null);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedYear, setSelectedYear] = useState('1');
  const [search, setSearch] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);

  // ---------------- INIT ----------------
  useEffect(() => {
    const token = getAccessToken();
    if (token) setUserInfo(decodeToken(token));
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await getMyCourses();
      setCourses(res.data.courses || []);
    } catch {
      toast.error('Failed to load courses');
    }
  };

  const selectedCourseData =
    courses.find(c => c._id === selectedCourse) || null;

  // ---------------- AUTO LOAD ----------------
  useEffect(() => {
  if (selectedCourse && selectedExamType && selectedSemester && selectedYear) {
    loadStudents();
  }
}, [selectedCourse, selectedExamType, selectedSemester, selectedYear]);

  // ---------------- LOAD STUDENTS ----------------
  const loadStudents = async () => {
    try {
      const res = await getMarksForCourse({
        courseId: selectedCourse,
        semester: Number(selectedSemester),
        examType: selectedExamType,
        year: Number(selectedYear) 
      } as any);

      const data = res.data.students || [];
      setStudents(data);

      const init: any = {};

      data.forEach((s: any) => {
        const m = s.marks || {};

        init[s.id] = {
          internal1: m.internal1 ?? '',
          internal2: m.internal2 ?? '',
          modelExam: m.modelExam ?? '',
          finalExam: m.finalExam ?? '',
          modified: false
        };
      });

      setMarks(init);
      setOriginalMarks(JSON.parse(JSON.stringify(init))); // ✅ FIXED
      setIsEditing(false);

    } catch {
      toast.error('Failed to load students');
    }
  };

  // ---------------- MARK INFO ----------------
  const getMarkInfo = (m: any) => {
    const safe = m || {};

    if (selectedExamType === 'internal1') {
      return {
        percent: Math.round(((+safe.internal1 || 0) / 60) * 100),
        key: 'internal1',
        max: 60
      };
    }

    if (selectedExamType === 'internal2') {
      return {
        percent: Math.round(((+safe.internal2 || 0) / 60) * 100),
        key: 'internal2',
        max: 60
      };
    }

    if (selectedExamType === 'model_lab' || selectedExamType === 'semester_lab') {
      return {
        percent: Math.round(((+safe.modelExam || 0) / 50) * 100),
        key: 'modelExam',
        max: 50
      };
    }

    return {
      percent: +safe.finalExam || 0,
      key: 'finalExam',
      max: 100
    };
  };

  // ---------------- EDIT HANDLER ----------------
  const handleChange = (id: string, field: string, value: string) => {
    if (!isEditing) return;
    if (!/^\d*$/.test(value)) return;

    const { max } = getMarkInfo(marks[id]);
    if (Number(value) > max) return;

    setMarks((prev: any) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        modified: true
      }
    }));
  };

  // ---------------- SAVE ----------------
  const handleSave = async () => {
  try {
    const payload = Object.entries(marks)
      .filter(([, v]: any) => v.modified)
      .map(([id, v]: any) => {
        const obj: any = {
          studentId: id
        };

        obj.internal1 = v.internal1 === '' ? null : Number(v.internal1) || null;
        obj.internal2 = v.internal2 === '' ? null : Number(v.internal2) || null;
        obj.modelExam = v.modelExam === '' ? null : Number(v.modelExam) || null;
        obj.finalExam = v.finalExam === '' ? null : Number(v.finalExam) || null;

        return obj;
      });

    if (payload.length === 0) {
      toast.info('No changes found');
      return;
    }

    const studentNameMap = students.reduce((acc: any, s: any) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    const res = await bulkEnterMarks({
      courseId: selectedCourse,
      semester: Number(selectedSemester),
      marksData: payload
    });

    const { successCount, failCount, results } = res.data;
    const failedStudents = results
      .filter((r: any) => !r.success)
      .map((r: any) => studentNameMap[r.studentId] || r.studentId);

    const message = failCount > 0
      ? `Saved ${successCount} marks, ${failCount} failed`
      : `Marks saved for ${successCount} students`;

    setSaveResult({ successCount, failCount, failedStudents, message });

    if (failCount > 0) {
      toast.error(`Some marks failed to save. Check details below.`);
    } else {
      toast.success(message);
    }

    setIsEditing(false);
    loadStudents();

  } catch (err: any) {
    console.error(" FULL ERROR:", err);
    console.error(" BACKEND:", err?.response?.data);

    toast.error(
      err?.response?.data?.message ||
      'Failed to save marks'
    );
  }
};
  const handleCancel = () => {
    setMarks(JSON.parse(JSON.stringify(originalMarks)));
    setIsEditing(false);
  };

  // ---------------- FILTER ----------------
  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  // ---------------- SUMMARY (FIXED + OPTIMIZED) ----------------
  const summary = useMemo(() => {
  const result = filtered.reduce(
    (acc: any, s: any) => {
      const m = marks[s.id] || {};
      const { percent, key } = getMarkInfo(m);
      const value = m[key];

      if (value === '') {
        acc.absent++;
      } else {
        acc.present++;
        percent >= 50 ? acc.pass++ : acc.fail++;
      }

      return acc;
    },
    { pass: 0, fail: 0, present: 0, absent: 0 }
  );

  const total = filtered.length || 1; // avoid divide by 0

  return {
    ...result,
    passPercent: Math.round((result.pass / total) * 100),
    failPercent: Math.round((result.fail / total) * 100),
    presentPercent: Math.round((result.present / total) * 100),
    absentPercent: Math.round((result.absent / total) * 100)
  };
}, [filtered, marks, selectedExamType]);
  // ---------------- PDF ----------------
  const downloadPDF = () => {
  const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

  const course = selectedCourseData?.code + " - " + selectedCourseData?.name;

  // =========================
  // FONT
  // =========================
  doc.setFont("times", "bold");

  // =========================
  // HEADER
  // =========================
  doc.setFontSize(16);
  doc.text(
    "M P Nachimuthu M Jaganathan Engineering College",
    105,
    15,
    { align: "center" }
  );

  doc.setFontSize(11);
  doc.setFont("times", "normal");
  doc.text("Chennimalai, Erode", 105, 22, { align: "center" });

  doc.line(10, 26, 200, 26);

  // =========================
  // DETAILS BOX (REFERENCE WIDTH)
  // =========================
  const boxX = 15;
  const boxWidth = 180; //  SAME VISUAL WIDTH CONCEPT

  const boxY = 30;

  doc.setFont("times", "bold");
  doc.setFontSize(11);

  doc.rect(boxX, boxY, boxWidth, 32);

  doc.text(`Department: ${userInfo?.department || ""}`, boxX + 4, boxY + 8);
  doc.text(`Exam Mode: ${selectedExamType.toUpperCase()}`, boxX + 4, boxY + 16);

  doc.text(`Semester: ${selectedSemester}`, boxX + 110, boxY + 8);
  doc.text(`Year: ${selectedYear} Year`, boxX + 110, boxY + 16);

  doc.text(`Course: ${course}`, boxX + 4, boxY + 24);

  // =========================
  // TABLE (MATCH VISUAL WIDTH)
  // =========================
  const tableStartY = boxY + 38;

  const rows = students.map(s => {
    const m = marks[s.id] || {};
    const { percent, key } = getMarkInfo(m);
    const value = m[key];
    let status = 'Absent';
    if (value !== '') {
      status = percent >= 50 ? 'Pass' : 'Fail';
    }
    return [
      s.rollNumber,
      s.name,
      value !== '' ? value : 'AB',
      value !== '' ? `${percent}%` : '-',
      status
      
    ];
  });

  
  
  autoTable(doc, {
  startY: tableStartY,
  margin: { left: boxX, right: boxX },

  head: [['Reg No', 'Student Name', 'Marks', 'Percentage','Status']],
  body: rows,

  theme: 'grid',

  styles: {
    font: "times",
    fontSize: 10,
    cellPadding: 2,
    textColor: [0, 0, 0],   //FIX: DARK TEXT
    lineColor: [0, 0, 0],
    lineWidth: 0.4
  },

  headStyles: {
  fillColor: [255, 255, 255],   //NO BLACK BACKGROUND
  textColor: [0, 0, 0],         // BLACK TEXT
  fontStyle: 'bold',
  lineWidth: 0.3
},

  bodyStyles: {
    textColor: [0, 0, 0]   //FIX: STRONG BLACK TEXT
  },

  alternateRowStyles: {
    fillColor: [255, 255, 255] // remove grey fade
  }
});
  // =========================
  // SUMMARY BOX
  // =========================
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont("times", "bold");
  doc.rect(boxX, finalY, boxWidth, 20);

  doc.text("SUMMARY", boxX + 4, finalY + 7);

  doc.setFont("times", "normal");
  doc.text(` No of Present: ${summary.present}`, boxX + 4, finalY + 14);
  doc.text(` No of Absent: ${summary.absent}`, boxX + 60, finalY + 14);
  doc.text(` No of Pass: ${summary.pass}`, boxX + 120, finalY + 14);
  doc.text(` No of Fail: ${summary.fail}`, boxX + 150, finalY + 14);
  

 // =========================
// TOP 3 RANK HOLDERS - TABLE FORMAT
// =========================

const rankedData = students
  .map(s => {
    const m = marks[s.id] || {};
    const { percent, key } = getMarkInfo(m);
    const value = m[key];

    return {
      name: s.name,
      rollNumber: s.rollNumber,
      mark: value === '' ? 0 : Number(value),
      percent
    };
  })
  .filter(s => s.mark > 0)
  .sort((a, b) => b.percent - a.percent);

// Unique top 3 percentages
const uniqueRanks = [...new Set(rankedData.map(s => s.percent))]
  .slice(0, 3);

// Create rank rows
const rankRows: any[] = [];

uniqueRanks.forEach((rankPercent, index) => {

  const sameRankStudents = rankedData.filter(
    s => s.percent === rankPercent
  );

  sameRankStudents.forEach(student => {
    rankRows.push([
      `Rank ${index + 1}`,
      student.name,
      student.rollNumber,
      `${student.percent}%`
    ]);
  });

});

const rankY = finalY + 30;

// Title
doc.setFont("times", "bold");
doc.setFontSize(13);

doc.text("TOP 3 RANK HOLDERS", 105, rankY, {
  align: "center"
});

// Rank Table
autoTable(doc, {
  startY: rankY + 5,

  margin: {
    left: boxX,
    right: boxX
  },

  head: [[
    'Rank',
    'Student Name',
    'Register No',
    'Percentage'
  ]],

  body: rankRows,

  theme: 'grid',

  styles: {
    font: 'times',
    fontSize: 10,
    textColor: [0, 0, 0],
    lineColor: [0, 0, 0],
    lineWidth: 0.3,
    cellPadding: 3,
    halign: 'center'
  },

  headStyles: {
    fillColor: [230, 230, 230],
    textColor: [0, 0, 0],
    fontStyle: 'bold',
    halign: 'center'
  },

  columnStyles: {
    1: {
      halign: 'left'
    }
  }
});

// Get Final Y
const rankTableEndY = (doc as any).lastAutoTable.finalY;
  // =========================
// SIGNATURES
// =========================

const signY = rankTableEndY + 30;

doc.setFont("times", "normal");
doc.setFontSize(11);

// Signature Lines
doc.line(20, signY, 60, signY);
doc.line(80, signY, 120, signY);
doc.line(140, signY, 185, signY);

// Signature Labels
doc.text("Faculty Signature", 25, signY + 7);
doc.text("HOD Signature", 90, signY + 7);
doc.text("Principal Signature", 145, signY + 7);// =========================
  // SAVE
  // =========================
  doc.save("Marks_Report.pdf");
};
  // ---------------- EXCEL ----------------
  const downloadExcel = () => {
    const data = students.map(s => {
      const m = marks[s.id] || {};
      const { percent, key } = getMarkInfo(m);

      return {
        RegNo: s.rollNumber,
        Name: s.name,
        Mark: m[key] ?? '',
        Percentage: percent,
        Year: selectedYear,
        
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, 'marks.xlsx');
  };

  // ---------------- UI ----------------
  return (
    <div className="flex h-screen bg-gray-50">

      <DesktopSidebar
        items={getNavItems(userInfo?.isClassAdvisor || false)}
        title="Faculty Portal"
        subtitle={userInfo?.department || ''}
      />

      <div className="flex-1 p-6 overflow-y-auto">

        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
              <p className="text-gray-600">Manage student marks for your courses</p>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <Card className="p-6 mb-6 shadow-sm border-0 bg-white">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Course & Exam Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Course
              </label>
              <Select onValueChange={setSelectedCourse}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a course" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Exam Type
              </label>
              <Select onValueChange={setSelectedExamType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal1">Internal 1</SelectItem>
                  <SelectItem value="internal2">Internal 2</SelectItem>
                  <SelectItem value="model_lab">Model Lab</SelectItem>
                  <SelectItem value="semester_lab">Semester Lab</SelectItem>
                  <SelectItem value="semester_exam">Semester Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <GraduationCap className="h-4 w-4 mr-2" />
                Semester
              </label>
              <Select onValueChange={setSelectedSemester}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map(s => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
          <div className="space-y-2">
  <label className="text-sm font-medium text-gray-700 flex items-center">
    <GraduationCap className="h-4 w-4 mr-2" />
    Year
  </label>

  <Select onValueChange={setSelectedYear} defaultValue="1">
    <SelectTrigger className="h-11">
      <SelectValue placeholder="Select year" />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="1">1st Year</SelectItem>
      <SelectItem value="2">2nd Year</SelectItem>
      <SelectItem value="3">3rd Year</SelectItem>
      <SelectItem value="4">4th Year</SelectItem>
    </SelectContent>
  </Select>
</div>
        </Card>

        {/* COURSE SUMMARY - Show selected details */}
        {students.length > 0 && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Course</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCourseData?.code} - {selectedCourseData?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Semester</p>
                    <p className="font-semibold text-gray-900">Semester {selectedSemester}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600">Exam Type</p>
                    <p className="font-semibold text-gray-900">
                      {selectedExamType === 'internal1' ? 'Internal 1' :
                       selectedExamType === 'internal2' ? 'Internal 2' :
                       selectedExamType === 'model_lab' ? 'Model Lab' :
                       selectedExamType === 'semester_lab' ? 'Semester Lab' :
                       selectedExamType === 'semester_exam' ? 'Semester Exam' : selectedExamType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-600">Students</p>
                    <p className="font-semibold text-gray-900">{students.length}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Badge variant="outline" className={`px-3 py-1 ${
                  isEditing
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}>
                  {isEditing ? (
                    <>
                      <Edit3 className="h-3 w-3 mr-1" />
                      Editing Mode
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      View Mode
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* ACTIONS */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students by name or roll number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 h-11 px-6"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Marks
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 h-11 px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="h-11 px-6 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}

            <div className="w-px h-8 bg-gray-300 mx-2" />

            <Button
              variant="outline"
              onClick={downloadPDF}
              className="h-11 px-4"
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={downloadExcel}
              className="h-11 px-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {saveResult && (
          <Card className={`mb-6 p-4 border-l-4 shadow-sm ${
            saveResult.failCount > 0
              ? 'border-l-red-500 bg-red-50 border-red-200'
              : 'border-l-green-500 bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`p-1 rounded-full ${
                saveResult.failCount > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {saveResult.failCount > 0 ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${
                  saveResult.failCount > 0 ? 'text-red-800' : 'text-green-800'
                }`}>
                  {saveResult.message}
                </div>
                {saveResult.failCount > 0 && saveResult.failedStudents.length > 0 && (
                  <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded-md">
                    <div className="flex items-center mb-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="font-medium">Failed students:</span>
                    </div>
                    <div className="text-xs">{saveResult.failedStudents.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* TABLE */}
        <Card className="shadow-sm border-0 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Student Marks</h3>
            <p className="text-sm text-gray-600">Enter and manage marks for each student</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Roll Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Mark</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Percentage</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(s => {
                  const m = marks[s.id] || {};
                  const { percent, key } = getMarkInfo(m);
                  const value = m[key];

                  return (
                    <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${
                      m.modified ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''
                    }`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{s.rollNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{s.name}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Input
                            disabled={!isEditing}
                            value={value}
                            onChange={e => handleChange(s.id, key, e.target.value)}
                            className={`w-20 text-center h-9 text-black font-semibold ${
                              isEditing ? 'border-blue-300 focus:border-blue-500' : 'bg-gray-50'
                            }`}
                            placeholder="0"
                          />
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold text-lg ${
                          value !== '' ? (percent >= 50 ? 'text-green-900' : 'text-red-900') : 'text-gray-500'
                        }`}>
                          {value !== '' ? `${percent}%` : '-'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Badge className={`${
                          value === ''
                            ? 'bg-gray-100 text-gray-800'
                            : percent >= 50
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {value === ''
                            ? 'Absent'
                            : percent >= 50
                            ? 'Pass'
                            : 'Fail'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {students.length === 0 ? 'Select a course to load students' : 'Try adjusting your search criteria'}
              </p>
            </div>
          )}
        </Card>

        {/* SUMMARY */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Marks Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">No of Pass</p>
                  <p className="text-2xl font-bold text-green-800">{summary.pass}
                    ({summary.passPercent}%)
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-600"> No of Fail</p>
                  <p className="text-2xl font-bold text-red-800">
                    {summary.fail} ({summary.failPercent}%)
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600"> No of Present</p>
                  <p className="text-2xl font-bold text-blue-800">{summary.present}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-500 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">No ofAbsent</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.absent}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>

      <MobileNav items={getNavItems(userInfo?.isClassAdvisor || false)} />
    </div>
  );
}