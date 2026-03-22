import Marks from "../models/Marks.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Faculty from "../models/Faculty.js";
import HOD from "../models/HOD.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

// ========================
// HELPER: Marks Completion Check
// ========================

const checkCompletion = async (department, year, section, semester) => {
  const studentQuery = { department, year: parseInt(year), status: "active" };
  if (section) studentQuery.section = section;

  const students = await Student.find(studentQuery).select("_id rollNumber").populate("userId", "name");
  const studentIds = students.map(s => s._id);

  if (studentIds.length === 0) {
    return {
      totalStudents: 0,
      totalCourses: 0,
      filledCount: 0,
      totalRequired: 0,
      isComplete: false,
      completionPercentage: 0,
      courses: [],
      missingEntries: [],
    };
  }

  const courses = await Course.find({
    department,
    semester: parseInt(semester),
    status: "active",
  });

  if (courses.length === 0) {
    return {
      totalStudents: studentIds.length,
      totalCourses: 0,
      filledCount: 0,
      totalRequired: 0,
      isComplete: false,
      completionPercentage: 0,
      courses: [],
      missingEntries: [],
    };
  }

  const courseIds = courses.map(c => c._id);
  const totalRequired = studentIds.length * courseIds.length;

  // Get all submitted marks
  const existingMarks = await Marks.find({
    studentId: { $in: studentIds },
    courseId: { $in: courseIds },
    semester: parseInt(semester),
    status: { $ne: "draft" },
  }).select("studentId courseId");

  const filledSet = new Set(existingMarks.map(m => `${m.studentId}_${m.courseId}`));
  const filledCount = filledSet.size;

  // Find missing entries per course
  const courseCompletionMap = {};
  courses.forEach(c => {
    courseCompletionMap[c._id.toString()] = {
      courseId: c._id,
      code: c.code,
      name: c.name,
      filled: 0,
      total: studentIds.length,
    };
  });

  existingMarks.forEach(m => {
    const key = m.courseId.toString();
    if (courseCompletionMap[key]) {
      courseCompletionMap[key].filled++;
    }
  });

  const courseCompletion = Object.values(courseCompletionMap).map(c => ({
    ...c,
    percentage: c.total > 0 ? Math.round((c.filled / c.total) * 100) : 0,
    isComplete: c.filled >= c.total,
  }));

  const isComplete = filledCount >= totalRequired;
  const completionPercentage = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 0;

  return {
    totalStudents: studentIds.length,
    totalCourses: courseIds.length,
    filledCount,
    totalRequired,
    isComplete,
    completionPercentage,
    courseCompletion,
  };
};

// ========================
// HELPER: Resolve requester's department context
// ========================

const resolveContext = async (req) => {
  const role = req.user.role;
  let department, year, section;

  if (role === "faculty") {
    const faculty = await Faculty.findOne({ userId: req.user.id });
    if (!faculty || !faculty.isClassAdvisor) {
      return { error: "Class Advisor privileges required" };
    }
    department = faculty.advisorFor.department;
    year = faculty.advisorFor.year;
    section = faculty.advisorFor.section;
  } else if (role === "hod") {
    const hod = await HOD.findOne({ userId: req.user.id });
    if (!hod) return { error: "HOD profile not found" };
    department = hod.department;
    year = req.query.year ? parseInt(req.query.year) : null;
    section = req.query.section || null;
  } else if (["principal", "admin", "superUser"].includes(role)) {
    department = req.query.department || null;
    year = req.query.year ? parseInt(req.query.year) : null;
    section = req.query.section || null;
  } else {
    return { error: "Unauthorized role" };
  }

  return { department, year, section, role };
};

// ========================
// GET /api/result-analysis/completion-status
// ========================

export const getCompletionStatus = async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(403).json({ error: ctx.error });

    const { department, year, section } = ctx;
    const { semester } = req.query;

    if (!semester) {
      return res.status(400).json({ error: "semester query parameter is required" });
    }

    if (!department) {
      return res.status(400).json({ error: "department is required" });
    }

    if (year) {
      // Single class completion
      const status = await checkCompletion(department, year, section, semester);
      return res.json({ department, year, section, semester: parseInt(semester), ...status });
    }

    // All years in department
    const years = [1, 2, 3, 4];
    const results = [];

    for (const y of years) {
      const sections = await Student.distinct("section", {
        department,
        year: y,
        status: "active",
      });

      if (sections.length > 0 && sections[0]) {
        for (const sec of sections) {
          if (!sec) continue;
          const status = await checkCompletion(department, y, sec, semester);
          results.push({ year: y, section: sec, ...status });
        }
      } else {
        const status = await checkCompletion(department, y, null, semester);
        if (status.totalStudents > 0) {
          results.push({ year: y, section: null, ...status });
        }
      }
    }

    res.json({ department, semester: parseInt(semester), classes: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// 1. DETAILED RESULT ANALYSIS
// Per-student, per-subject full breakdown
// Access: Class Advisor, HOD
// ========================

export const getDetailedAnalysis = async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(403).json({ error: ctx.error });

    if (["principal"].includes(ctx.role)) {
      return res.status(403).json({ error: "Principal can only access overview analysis" });
    }

    const { department, year, section } = ctx;
    const { semester } = req.query;

    if (!semester) {
      return res.status(400).json({ error: "semester is required" });
    }
    if (!department || !year) {
      return res.status(400).json({ error: "department and year are required for detailed analysis" });
    }

    // Check completion first
    const completion = await checkCompletion(department, year, section, semester);
    if (!completion.isComplete) {
      return res.status(400).json({
        error: "All subject marks must be filled before generating result analysis",
        completion,
      });
    }

    // Get students
    const studentQuery = { department, year: parseInt(year), status: "active" };
    if (section) studentQuery.section = section;

    const students = await Student.find(studentQuery)
      .populate("userId", "name email")
      .sort({ rollNumber: 1 });
    const studentIds = students.map(s => s._id);

    // Get courses
    const courses = await Course.find({
      department,
      semester: parseInt(semester),
      status: "active",
    }).sort({ code: 1 });
    const courseIds = courses.map(c => c._id);

    // Get all marks
    const allMarks = await Marks.find({
      studentId: { $in: studentIds },
      courseId: { $in: courseIds },
      semester: parseInt(semester),
      status: { $ne: "draft" },
    });

    // Build marks lookup: studentId -> courseId -> marks
    const marksMap = {};
    allMarks.forEach(m => {
      const sKey = m.studentId.toString();
      const cKey = m.courseId.toString();
      if (!marksMap[sKey]) marksMap[sKey] = {};
      marksMap[sKey][cKey] = m;
    });

    // Build student results
    const studentResults = students.map(s => {
      const sId = s._id.toString();
      const subjectMarks = courses.map(c => {
        const cId = c._id.toString();
        const m = marksMap[sId]?.[cId];
        return {
          courseId: c._id,
          courseCode: c.code,
          courseName: c.name,
          credits: c.credits,
          internal1: m?.internal1 || 0,
          internal2: m?.internal2 || 0,
          modelExam: m?.modelExam || 0,
          finalExam: m?.finalExam || 0,
          total: m?.total || 0,
          grade: m?.grade || "F",
          isPassed: m?.isPassed || false,
        };
      });

      const totalMarks = subjectMarks.reduce((sum, s) => sum + s.total, 0);
      const passedCount = subjectMarks.filter(s => s.isPassed).length;
      const failedCount = subjectMarks.length - passedCount;
      const isAllClear = failedCount === 0;
      const percentage = subjectMarks.length > 0
        ? Math.round((totalMarks / (subjectMarks.length * 100)) * 100)
        : 0;

      return {
        studentId: s._id,
        name: s.userId?.name || "Unknown",
        rollNumber: s.rollNumber,
        section: s.section,
        subjects: subjectMarks,
        totalMarks,
        percentage,
        passedSubjects: passedCount,
        failedSubjects: failedCount,
        isAllClear,
      };
    });

    // Sort by total marks descending for ranking
    const ranked = [...studentResults].sort((a, b) => b.totalMarks - a.totalMarks);
    ranked.forEach((s, idx) => { s.rank = idx + 1; });

    // Subject-wise statistics
    const subjectStats = courses.map(c => {
      const cId = c._id.toString();
      const marks = allMarks.filter(m => m.courseId.toString() === cId);
      const totals = marks.map(m => m.total);
      const passCount = marks.filter(m => m.isPassed).length;

      return {
        courseId: c._id,
        courseCode: c.code,
        courseName: c.name,
        totalStudents: marks.length,
        passCount,
        failCount: marks.length - passCount,
        passPercentage: marks.length > 0 ? Math.round((passCount / marks.length) * 100) : 0,
        avgMark: marks.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / marks.length) : 0,
        maxMark: totals.length > 0 ? Math.max(...totals) : 0,
        minMark: totals.length > 0 ? Math.min(...totals) : 0,
      };
    });

    // Grade distribution per subject
    const gradeDistribution = courses.map(c => {
      const cId = c._id.toString();
      const marks = allMarks.filter(m => m.courseId.toString() === cId);
      const dist = { O: 0, "A+": 0, A: 0, B: 0, C: 0, F: 0 };
      marks.forEach(m => { if (dist[m.grade] !== undefined) dist[m.grade]++; });
      return { courseCode: c.code, courseName: c.name, distribution: dist };
    });

    // Class summary
    const totalStudents = studentResults.length;
    const allClearCount = studentResults.filter(s => s.isAllClear).length;
    const classAvg = totalStudents > 0
      ? Math.round(studentResults.reduce((sum, s) => sum + s.percentage, 0) / totalStudents)
      : 0;

    // Toppers (top 5)
    const toppers = ranked.slice(0, 5).map(s => ({
      rank: s.rank,
      name: s.name,
      rollNumber: s.rollNumber,
      totalMarks: s.totalMarks,
      percentage: s.percentage,
    }));

    res.json({
      type: "detailed",
      department,
      year: parseInt(year),
      section: section || null,
      semester: parseInt(semester),
      classSummary: {
        totalStudents,
        allClearCount,
        failCount: totalStudents - allClearCount,
        passPercentage: totalStudents > 0 ? Math.round((allClearCount / totalStudents) * 100) : 0,
        classAverage: classAvg,
        totalSubjects: courses.length,
      },
      toppers,
      studentResults: ranked,
      subjectStats,
      gradeDistribution,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// 2. SEMI-DETAILED RESULT ANALYSIS
// Class-level stats, subject table, top performers, grade summary
// Access: Class Advisor, HOD
// ========================

export const getSemiDetailedAnalysis = async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(403).json({ error: ctx.error });

    if (["principal"].includes(ctx.role)) {
      return res.status(403).json({ error: "Principal can only access overview analysis" });
    }

    const { department, year, section } = ctx;
    const { semester } = req.query;

    if (!semester) {
      return res.status(400).json({ error: "semester is required" });
    }
    if (!department || !year) {
      return res.status(400).json({ error: "department and year are required for semi-detailed analysis" });
    }

    // Check completion
    const completion = await checkCompletion(department, year, section, semester);
    if (!completion.isComplete) {
      return res.status(400).json({
        error: "All subject marks must be filled before generating result analysis",
        completion,
      });
    }

    // Get students
    const studentQuery = { department, year: parseInt(year), status: "active" };
    if (section) studentQuery.section = section;

    const students = await Student.find(studentQuery)
      .populate("userId", "name")
      .sort({ rollNumber: 1 });
    const studentIds = students.map(s => s._id);

    // Get courses
    const courses = await Course.find({
      department,
      semester: parseInt(semester),
      status: "active",
    }).sort({ code: 1 });
    const courseIds = courses.map(c => c._id);

    // Get all marks
    const allMarks = await Marks.find({
      studentId: { $in: studentIds },
      courseId: { $in: courseIds },
      semester: parseInt(semester),
      status: { $ne: "draft" },
    });

    // Compute per-student aggregates
    const studentAggregates = students.map(s => {
      const sId = s._id.toString();
      const sMarks = allMarks.filter(m => m.studentId.toString() === sId);
      const totalMarks = sMarks.reduce((sum, m) => sum + m.total, 0);
      const passedCount = sMarks.filter(m => m.isPassed).length;
      const failedCount = sMarks.length - passedCount;

      return {
        studentId: s._id,
        name: s.userId?.name || "Unknown",
        rollNumber: s.rollNumber,
        totalMarks,
        subjectsTaken: sMarks.length,
        passedSubjects: passedCount,
        failedSubjects: failedCount,
        isAllClear: failedCount === 0,
        percentage: sMarks.length > 0 ? Math.round((totalMarks / (sMarks.length * 100)) * 100) : 0,
      };
    });

    // Sort by total marks
    studentAggregates.sort((a, b) => b.totalMarks - a.totalMarks);

    // Subject-wise performance table
    const subjectWise = courses.map(c => {
      const cId = c._id.toString();
      const marks = allMarks.filter(m => m.courseId.toString() === cId);
      const totals = marks.map(m => m.total);
      const passCount = marks.filter(m => m.isPassed).length;

      return {
        courseCode: c.code,
        courseName: c.name,
        credits: c.credits,
        totalStudents: marks.length,
        passCount,
        failCount: marks.length - passCount,
        passPercentage: marks.length > 0 ? Math.round((passCount / marks.length) * 100) : 0,
        avgMark: marks.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / marks.length) : 0,
        maxMark: totals.length > 0 ? Math.max(...totals) : 0,
        minMark: totals.length > 0 ? Math.min(...totals) : 0,
      };
    });

    // Overall grade distribution
    const overallGradeDist = { O: 0, "A+": 0, A: 0, B: 0, C: 0, F: 0 };
    allMarks.forEach(m => {
      if (overallGradeDist[m.grade] !== undefined) overallGradeDist[m.grade]++;
    });

    // Arrear distribution
    const arrearDist = { 0: 0, 1: 0, 2: 0, "3+": 0 };
    studentAggregates.forEach(s => {
      if (s.failedSubjects === 0) arrearDist[0]++;
      else if (s.failedSubjects === 1) arrearDist[1]++;
      else if (s.failedSubjects === 2) arrearDist[2]++;
      else arrearDist["3+"]++;
    });

    // Best and worst subjects
    const sortedByPass = [...subjectWise].sort((a, b) => b.passPercentage - a.passPercentage);
    const bestSubject = sortedByPass[0] || null;
    const worstSubject = sortedByPass[sortedByPass.length - 1] || null;

    // Class summary
    const totalStudents = studentAggregates.length;
    const allClearCount = studentAggregates.filter(s => s.isAllClear).length;
    const classAvg = totalStudents > 0
      ? Math.round(studentAggregates.reduce((sum, s) => sum + s.percentage, 0) / totalStudents)
      : 0;

    res.json({
      type: "semi-detailed",
      department,
      year: parseInt(year),
      section: section || null,
      semester: parseInt(semester),
      classSummary: {
        totalStudents,
        allClearCount,
        failCount: totalStudents - allClearCount,
        passPercentage: totalStudents > 0 ? Math.round((allClearCount / totalStudents) * 100) : 0,
        classAverage: classAvg,
        totalSubjects: courses.length,
      },
      subjectWise,
      topPerformers: studentAggregates.slice(0, 10).map((s, i) => ({
        rank: i + 1,
        name: s.name,
        rollNumber: s.rollNumber,
        totalMarks: s.totalMarks,
        percentage: s.percentage,
        isAllClear: s.isAllClear,
      })),
      gradeDistribution: overallGradeDist,
      arrearDistribution: arrearDist,
      bestSubject: bestSubject ? { name: bestSubject.courseName, code: bestSubject.courseCode, passPercentage: bestSubject.passPercentage } : null,
      worstSubject: worstSubject ? { name: worstSubject.courseName, code: worstSubject.courseCode, passPercentage: worstSubject.passPercentage } : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// 3. OVERVIEW RESULT ANALYSIS
// High-level summary for principal
// Access: Class Advisor, HOD, Principal
// ========================

export const getOverviewAnalysis = async (req, res) => {
  try {
    const ctx = await resolveContext(req);
    if (ctx.error) return res.status(403).json({ error: ctx.error });

    const { department, year, section, role } = ctx;
    const { semester } = req.query;

    if (!semester) {
      return res.status(400).json({ error: "semester is required" });
    }

    // For class advisor: their class only
    if (role === "faculty" && year) {
      const completion = await checkCompletion(department, year, section, semester);
      if (!completion.isComplete) {
        return res.status(400).json({
          error: "All subject marks must be filled before generating result analysis",
          completion,
        });
      }

      const analysis = await Marks.getClassAnalysis(department, year, section, parseInt(semester));
      return res.json({
        type: "overview",
        scope: "class",
        department,
        semester: parseInt(semester),
        classes: [{
          year,
          section,
          totalStudents: analysis.totalStudents,
          passCount: analysis.passCount,
          failCount: analysis.failCount,
          passPercentage: analysis.passPercentage,
          averageMark: analysis.averageMark,
          toppers: analysis.toppers,
        }],
        summary: {
          totalStudents: analysis.totalStudents,
          totalPassed: analysis.passCount,
          totalFailed: analysis.failCount,
          passPercentage: analysis.passPercentage,
          averageMark: analysis.averageMark,
        },
      });
    }

    // For HOD: entire department
    if (role === "hod" || (["principal", "admin", "superUser"].includes(role) && department)) {
      const targetDept = department;
      const years = year ? [parseInt(year)] : [1, 2, 3, 4];
      const classes = [];
      let totalStudents = 0;
      let totalPassed = 0;
      let totalMarksSum = 0;
      let totalMarksCount = 0;

      for (const y of years) {
        const sections = await Student.distinct("section", {
          department: targetDept,
          year: y,
          status: "active",
        });

        const sectionList = (sections.length > 0 && sections[0]) ? sections : [null];

        for (const sec of sectionList) {
          if (sec === undefined) continue;

          const completion = await checkCompletion(targetDept, y, sec, semester);
          if (!completion.isComplete || completion.totalStudents === 0) continue;

          const analysis = await Marks.getClassAnalysis(targetDept, y, sec, parseInt(semester));
          if (analysis.totalStudents > 0) {
            classes.push({
              year: y,
              section: sec,
              totalStudents: analysis.totalStudents,
              passCount: analysis.passCount,
              failCount: analysis.failCount,
              passPercentage: analysis.passPercentage,
              averageMark: analysis.averageMark,
              toppers: analysis.toppers?.slice(0, 3) || [],
            });
            totalStudents += analysis.totalStudents;
            totalPassed += analysis.passCount;
            totalMarksSum += analysis.averageMark * analysis.totalStudents;
            totalMarksCount += analysis.totalStudents;
          }
        }
      }

      return res.json({
        type: "overview",
        scope: "department",
        department: targetDept,
        semester: parseInt(semester),
        classes,
        summary: {
          totalStudents,
          totalPassed,
          totalFailed: totalStudents - totalPassed,
          passPercentage: totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : 0,
          averageMark: totalMarksCount > 0 ? Math.round(totalMarksSum / totalMarksCount) : 0,
        },
      });
    }

    // For principal without specific department: all departments
    const departments = await Department.find({ isActive: true });
    let deptList = departments.map(d => d.name);
    if (deptList.length === 0) {
      deptList = await Student.distinct("department");
    }

    const departmentResults = [];
    let grandTotal = 0;
    let grandPassed = 0;

    for (const dept of deptList) {
      const years = [1, 2, 3, 4];
      let deptStudents = 0;
      let deptPassed = 0;
      const deptClasses = [];

      for (const y of years) {
        const sections = await Student.distinct("section", {
          department: dept,
          year: y,
          status: "active",
        });

        const sectionList = (sections.length > 0 && sections[0]) ? sections : [null];

        for (const sec of sectionList) {
          if (sec === undefined) continue;

          const completion = await checkCompletion(dept, y, sec, semester);
          if (!completion.isComplete || completion.totalStudents === 0) continue;

          const analysis = await Marks.getClassAnalysis(dept, y, sec, parseInt(semester));
          if (analysis.totalStudents > 0) {
            deptClasses.push({
              year: y,
              section: sec,
              totalStudents: analysis.totalStudents,
              passCount: analysis.passCount,
              passPercentage: analysis.passPercentage,
              averageMark: analysis.averageMark,
            });
            deptStudents += analysis.totalStudents;
            deptPassed += analysis.passCount;
          }
        }
      }

      if (deptStudents > 0) {
        departmentResults.push({
          department: dept,
          totalStudents: deptStudents,
          passCount: deptPassed,
          failCount: deptStudents - deptPassed,
          passPercentage: Math.round((deptPassed / deptStudents) * 100),
          classes: deptClasses,
        });
        grandTotal += deptStudents;
        grandPassed += deptPassed;
      }
    }

    res.json({
      type: "overview",
      scope: "institution",
      semester: parseInt(semester),
      departments: departmentResults,
      summary: {
        totalStudents: grandTotal,
        totalPassed: grandPassed,
        totalFailed: grandTotal - grandPassed,
        passPercentage: grandTotal > 0 ? Math.round((grandPassed / grandTotal) * 100) : 0,
        totalDepartments: departmentResults.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
