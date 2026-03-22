import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import HOD from "../models/HOD.js";
import Principal from "../models/Principal.js";
import Course from "../models/Course.js";
import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Certificate from "../models/Certificate.js";
import Achievement from "../models/Achievement.js";
import Report from "../models/Report.js";
import Marks from "../models/Marks.js";
import Department from "../models/Department.js";

// ========================
// DASHBOARD
// ========================

// GET /api/principal/dashboard/stats - Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalHODs,
      totalCourses,
      pendingLeaves,
      pendingCertificates,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "active" }),
      Faculty.countDocuments(),
      Faculty.countDocuments({ status: "active" }),
      HOD.countDocuments(),
      Course.countDocuments({ status: "active" }),
      LeaveRequest.countDocuments({ finalStatus: "Pending" }),
      Certificate.countDocuments({ status: "pending" }),
    ]);

    // Get department-wise stats
    const departmentStats = await Student.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$department",
          students: { $sum: 1 },
        },
      },
    ]);

    // Add faculty count to department stats
    const facultyByDept = await Faculty.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ]);

    const facultyMap = {};
    facultyByDept.forEach(f => { facultyMap[f._id] = f.count; });

    const deptStatsWithFaculty = departmentStats.map(d => ({
      department: d._id?.toUpperCase() || "Unknown",
      students: d.students,
      faculty: facultyMap[d._id] || 0,
    }));

    res.json({
      stats: {
        totalStudents,
        activeStudents,
        totalFaculty,
        activeFaculty,
        totalHODs,
        totalCourses,
        pendingLeaves,
        pendingCertificates,
      },
      departmentStats: deptStatsWithFaculty,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/principal/approvals/summary - Get approval summary
export const getApprovalsSummary = async (req, res) => {
  try {
    const [pendingLeaves, pendingCertificates] = await Promise.all([
      LeaveRequest.countDocuments({ finalStatus: "Pending" }),
      Certificate.countDocuments({ status: "pending" }),
    ]);

    // Count low attendance students requiring attention
    const lowAttendanceStudents = await Attendance.aggregate([
      {
        $group: {
          _id: "$studentId",
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        },
      },
      {
        $project: {
          percentage: {
            $multiply: [{ $divide: ["$present", { $max: ["$total", 1] }] }, 100],
          },
        },
      },
      { $match: { percentage: { $lt: 75 } } },
      { $count: "count" },
    ]);

    res.json({
      approvals: [
        { type: "Leave Requests", count: pendingLeaves, icon: "calendar", priority: "high" },
        { type: "Certificate Requests", count: pendingCertificates, icon: "award", priority: "medium" },
        { type: "Low Attendance", count: lowAttendanceStudents[0]?.count || 0, icon: "alert-circle", priority: "high" },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// DEPARTMENTS
// ========================

// GET /api/principal/departments - Get all departments overview
export const getDepartments = async (req, res) => {
  try {
    // Get all unique departments
    const studentDepts = await Student.distinct("department");
    const facultyDepts = await Faculty.distinct("department");
    const allDepts = [...new Set([...studentDepts, ...facultyDepts])];

    const departments = await Promise.all(allDepts.map(async (dept) => {
      const [students, faculty, hod, courses] = await Promise.all([
        Student.countDocuments({ department: dept, status: "active" }),
        Faculty.countDocuments({ department: dept, status: "active" }),
        HOD.findOne({ department: dept }).populate("userId", "name"),
        Course.countDocuments({ department: dept, status: "active" }),
      ]);

      // Calculate average attendance for department
      const attendanceStats = await Attendance.aggregate([
        {
          $lookup: {
            from: "students",
            localField: "studentId",
            foreignField: "_id",
            as: "student",
          },
        },
        { $unwind: "$student" },
        { $match: { "student.department": dept } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          },
        },
      ]);

      const avgAttendance = attendanceStats[0]
        ? Math.round((attendanceStats[0].present / attendanceStats[0].total) * 100)
        : 0;

      return {
        name: dept?.toUpperCase() || "Unknown",
        hod: hod?.userId?.name || "Not Assigned",
        hodId: hod?._id,
        students,
        faculty,
        courses,
        avgAttendance,
      };
    }));

    res.json({ departments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// APPROVALS
// ========================

// GET /api/principal/approvals - Get all pending approvals
export const getApprovals = async (req, res) => {
  try {
    const { type, status = "pending", page = 1, limit = 20 } = req.query;

    let approvals = [];

    if (!type || type === "leave") {
      const leaves = await LeaveRequest.find({ finalStatus: status === "pending" ? "Pending" : status })
        .populate({
          path: "applicantId",
          populate: { path: "userId", select: "name email" },
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      approvals.push(...leaves.map(l => ({
        _id: l._id,
        type: "leave",
        studentName: l.applicantId?.userId?.name || "Unknown",
        rollNumber: l.applicantId?.rollNumber,
        department: l.applicantId?.department?.toUpperCase(),
        fromDate: l.fromDate,
        toDate: l.toDate,
        leaveType: l.leaveType,
        reason: l.reason,
        applicantRole: l.applicantRole,
        status: l.finalStatus,
        appliedAt: l.createdAt,
      })));
    }

    if (!type || type === "certificate") {
      const certificates = await Certificate.find({ status })
        .populate({
          path: "studentId",
          populate: { path: "userId", select: "name email" },
        })
        .sort({ appliedAt: -1 })
        .limit(parseInt(limit));

      approvals.push(...certificates.map(c => ({
        _id: c._id,
        type: "certificate",
        studentName: c.studentId?.userId?.name || "Unknown",
        rollNumber: c.studentId?.rollNumber,
        department: c.studentId?.department?.toUpperCase(),
        certificateType: c.typeName,
        purpose: c.purpose,
        status: c.status,
        appliedAt: c.appliedAt,
      })));
    }

    // Sort by date
    approvals.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.json({ approvals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/principal/approvals/:id - Update approval status
export const updateApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, remarks } = req.body;

    if (!type || !status) {
      return res.status(400).json({ error: "Type and status are required" });
    }

    let item;
    if (type === "leave") {
      item = await LeaveRequest.findById(id);
      if (item) {
        item.finalStatus = status.charAt(0).toUpperCase() + status.slice(1);
        item.principalApproval = {
          status: status.charAt(0).toUpperCase() + status.slice(1),
          approvedBy: req.user.id,
          approvedAt: new Date(),
          remarks,
        };
        await item.save();
      }
    } else if (type === "certificate") {
      item = await Certificate.findById(id);
      if (item) {
        item.status = status;
        item.reviewedBy = req.user.id;
        item.reviewedAt = new Date();
        if (remarks) item.remarks = remarks;
        await item.save();
      }
    }

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Status updated successfully", item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ACHIEVEMENTS
// ========================

// GET /api/principal/achievements - Get all achievements
export const getAchievements = async (req, res) => {
  try {
    const { type, category, department, page = 1, limit = 20 } = req.query;

    const filter = { status: "approved" };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (department) filter.department = department;

    const achievements = await Achievement.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Achievement.countDocuments(filter);

    res.json({
      achievements: achievements.map(a => ({
        _id: a._id,
        title: a.title,
        description: a.description,
        type: a.type,
        category: a.category,
        achievedBy: a.achievedBy,
        date: a.date,
        venue: a.venue,
        award: a.award,
        isHighlighted: a.isHighlighted,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/principal/achievements - Add new achievement
export const addAchievement = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      department,
      achievedByName,
      achievedByRole,
      date,
      venue,
      award,
      prize,
      isHighlighted,
    } = req.body;

    if (!title || !type || !achievedByName || !date) {
      return res.status(400).json({ error: "Title, type, achiever name, and date are required" });
    }

    const achievement = await Achievement.create({
      title,
      description,
      type,
      category: category || "student",
      department,
      achievedBy: {
        name: achievedByName,
        role: achievedByRole,
      },
      date: new Date(date),
      venue,
      award,
      prize,
      isHighlighted: isHighlighted || false,
      addedBy: req.user.id,
      status: "approved",
    });

    res.status(201).json({
      message: "Achievement added successfully",
      achievement,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/principal/achievements/:id - Update achievement
export const updateAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const achievement = await Achievement.findByIdAndUpdate(id, updates, { new: true });
    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    res.json({ message: "Achievement updated successfully", achievement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/principal/achievements/:id - Delete achievement
export const deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;

    const achievement = await Achievement.findByIdAndDelete(id);
    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    res.json({ message: "Achievement deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// REPORTS
// ========================

// GET /api/principal/reports - Get all reports
export const getReports = async (req, res) => {
  try {
    const { type, department, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (department) filter.department = department;

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(filter);

    res.json({
      reports: reports.map(r => ({
        _id: r._id,
        title: r.title,
        type: r.type,
        category: r.category,
        department: r.department?.toUpperCase(),
        dateRange: r.dateRange,
        createdAt: r.createdAt,
        status: r.status,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/principal/reports - Generate institutional report
export const generateReport = async (req, res) => {
  try {
    const { type, title, department, startDate, endDate } = req.body;

    let data = {};
    const filter = { status: "active" };
    if (department) filter.department = department;

    if (type === "attendance") {
      // Institution-wide attendance report
      const depts = department ? [department] : await Student.distinct("department");
      data = await Promise.all(depts.map(async (dept) => {
        const students = await Student.find({ department: dept, status: "active" });
        let totalPresent = 0;
        let totalClasses = 0;

        for (const student of students) {
          const records = await Attendance.find({ studentId: student._id });
          totalClasses += records.length;
          totalPresent += records.filter(r => r.status === "present").length;
        }

        return {
          department: dept?.toUpperCase(),
          students: students.length,
          totalClasses,
          totalPresent,
          avgAttendance: totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0,
        };
      }));
    } else if (type === "faculty") {
      data = await Faculty.find(filter)
        .populate("userId", "name email")
        .populate("assignedCourses", "code name")
        .lean();
    } else if (type === "student") {
      data = await Student.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$department",
            total: { $sum: 1 },
            avgCgpa: { $avg: "$cgpa" },
            byYear: {
              $push: { year: "$year", cgpa: "$cgpa" },
            },
          },
        },
      ]);
    }

    const report = await Report.create({
      title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${new Date().toLocaleDateString()}`,
      type,
      category: "custom",
      department,
      dateRange: { start: startDate, end: endDate },
      generatedBy: req.user.id,
      generatedByRole: "principal",
      data,
    });

    res.status(201).json({
      message: "Report generated successfully",
      report: {
        _id: report._id,
        title: report.title,
        type: report.type,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/principal/reports/:id - Get specific report
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// RESULT ANALYSIS (Read-Only)
// ========================

// GET /api/principal/final-analysis - Get college-wide result analysis
export const getFinalAnalysis = async (req, res) => {
  try {
    const { semester } = req.query;

    if (!semester) {
      return res.status(400).json({ error: "semester query parameter is required" });
    }

    // Get all departments
    const departments = await Department.find({ isActive: true });
    const departmentNames = departments.map(d => d.name);

    // If no departments in DB, use distinct from students
    let deptList = departmentNames;
    if (deptList.length === 0) {
      const distinctDepts = await Student.distinct("department");
      deptList = distinctDepts;
    }

    const departmentAnalyses = [];
    let totalStudents = 0;
    let totalPassed = 0;

    for (const dept of deptList) {
      // Get analysis for all years in this department
      const years = [1, 2, 3, 4];
      let deptStudents = 0;
      let deptPassed = 0;
      const yearWise = [];

      for (const year of years) {
        const analysis = await Marks.getClassAnalysis(dept, year, null, parseInt(semester));
        if (analysis.totalStudents > 0) {
          yearWise.push({
            year,
            totalStudents: analysis.totalStudents,
            passCount: analysis.passCount,
            passPercentage: analysis.passPercentage,
            averageMark: analysis.averageMark,
          });
          deptStudents += analysis.totalStudents;
          deptPassed += analysis.passCount;
        }
      }

      if (deptStudents > 0) {
        departmentAnalyses.push({
          department: dept,
          totalStudents: deptStudents,
          passCount: deptPassed,
          failCount: deptStudents - deptPassed,
          passPercentage: Math.round((deptPassed / deptStudents) * 100),
          yearWise,
        });
        totalStudents += deptStudents;
        totalPassed += deptPassed;
      }
    }

    res.json({
      semester: parseInt(semester),
      collegeSummary: {
        totalStudents,
        totalPassed,
        totalFailed: totalStudents - totalPassed,
        overallPassPercentage: totalStudents > 0 
          ? Math.round((totalPassed / totalStudents) * 100) 
          : 0,
        totalDepartments: departmentAnalyses.length,
      },
      departmentAnalyses,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/principal/class-analysis - Get class-wise analysis for a department
export const getClassAnalysis = async (req, res) => {
  try {
    const { department, semester, year } = req.query;

    if (!department) {
      return res.status(400).json({ error: "department query parameter is required" });
    }

    if (!semester) {
      return res.status(400).json({ error: "semester query parameter is required" });
    }

    const years = year ? [parseInt(year)] : [1, 2, 3, 4];
    const analyses = [];

    for (const y of years) {
      // Get sections for this year
      const sections = await Student.distinct("section", {
        department,
        year: y,
        status: "active",
      });

      if (sections.length > 0 && sections[0]) {
        // Has sections - analyze per section
        for (const section of sections) {
          if (!section) continue;
          const analysis = await Marks.getClassAnalysis(department, y, section, parseInt(semester));
          if (analysis.totalStudents > 0) {
            analyses.push({
              year: y,
              section,
              ...analysis,
            });
          }
        }
      } else {
        // No sections
        const analysis = await Marks.getClassAnalysis(department, y, null, parseInt(semester));
        if (analysis.totalStudents > 0) {
          analyses.push({
            year: y,
            section: null,
            ...analysis,
          });
        }
      }
    }

    // Calculate department summary
    const totalStudents = analyses.reduce((sum, a) => sum + a.totalStudents, 0);
    const totalPassed = analyses.reduce((sum, a) => sum + a.passCount, 0);

    res.json({
      department,
      semester: parseInt(semester),
      summary: {
        totalStudents,
        totalPassed,
        totalFailed: totalStudents - totalPassed,
        passPercentage: totalStudents > 0 
          ? Math.round((totalPassed / totalStudents) * 100) 
          : 0,
      },
      classAnalyses: analyses,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/principal/semester-trends - Get semester performance trends
export const getSemesterTrends = async (req, res) => {
  try {
    const { department } = req.query;

    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
    const trends = [];

    for (const sem of semesters) {
      const query = { semester: sem, status: { $ne: "draft" } };

      if (department) {
        const students = await Student.find({ department, status: "active" }).select("_id");
        query.studentId = { $in: students.map(s => s._id) };
      }

      const stats = await Marks.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            passCount: { $sum: { $cond: ["$isPassed", 1, 0] } },
            avgTotal: { $avg: "$total" },
          },
        },
      ]);

      if (stats.length > 0 && stats[0].totalEntries > 0) {
        trends.push({
          semester: sem,
          totalEntries: stats[0].totalEntries,
          passCount: stats[0].passCount,
          passPercentage: Math.round((stats[0].passCount / stats[0].totalEntries) * 100),
          averageMark: Math.round(stats[0].avgTotal),
        });
      }
    }

    res.json({
      department: department || "All",
      trends,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/principal/year-comparison - Compare performance across years
export const getYearComparison = async (req, res) => {
  try {
    const { semester } = req.query;

    if (!semester) {
      return res.status(400).json({ error: "semester query parameter is required" });
    }

    const years = [1, 2, 3, 4];
    const comparisons = [];

    for (const year of years) {
      // Get all students in this year across all departments
      const students = await Student.find({ year, status: "active" }).select("_id department");
      const studentIds = students.map(s => s._id);

      if (studentIds.length === 0) continue;

      const stats = await Marks.aggregate([
        {
          $match: {
            studentId: { $in: studentIds },
            semester: parseInt(semester),
            status: { $ne: "draft" },
          },
        },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            passCount: { $sum: { $cond: ["$isPassed", 1, 0] } },
            avgTotal: { $avg: "$total" },
          },
        },
      ]);

      // Get unique students with marks
      const uniqueStudentsWithMarks = await Marks.distinct("studentId", {
        studentId: { $in: studentIds },
        semester: parseInt(semester),
        status: { $ne: "draft" },
      });

      if (stats.length > 0 && stats[0].totalEntries > 0) {
        comparisons.push({
          year,
          totalStudents: students.length,
          studentsWithMarks: uniqueStudentsWithMarks.length,
          totalSubjectEntries: stats[0].totalEntries,
          passCount: stats[0].passCount,
          passPercentage: Math.round((stats[0].passCount / stats[0].totalEntries) * 100),
          averageMark: Math.round(stats[0].avgTotal),
        });
      }
    }

    res.json({
      semester: parseInt(semester),
      yearComparisons: comparisons,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};