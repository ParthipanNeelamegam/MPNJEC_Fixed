import HOD from "../models/HOD.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import TimeTable from "../models/TimeTable.js";
import PeriodConfig from "../models/PeriodConfig.js";
import Marks from "../models/Marks.js";
import Class from "../models/Class.js";
import { getAttendanceStats } from "../utils/period.js";
import {
  validateScheduleConflicts,
  getFacultyDayAvailability,
  getAvailableFacultyForSlot,
  getDepartmentDaySchedule,
  canFacultyTeachInDepartment,
  logSchedulingConflict,
} from "../utils/scheduling.js";

// ========================
// DEPARTMENT USERS
// ========================

// GET /api/hod/faculty - Get Faculty in HOD's Department
export const getDepartmentFaculty = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.find({ department: hod.department })
      .populate("userId", "name email")
      .populate("assignedCourses", "code name");

    res.json({
      department: hod.department,
      faculty: faculty.map(f => ({
        id: f._id,
        userId: f.userId?._id,
        name: f.userId?.name,
        email: f.userId?.email,
        empId: f.empId,
        designation: f.designation,
        experience: f.experience,
        assignedCourses: f.assignedCourses,
        status: f.status,
        // Class Advisor info
        isClassAdvisor: f.isClassAdvisor || false,
        advisorFor: f.advisorFor || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/faculty/:id - Get Faculty Details
export const getFacultyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.findById(id)
      .populate("userId", "name email phone")
      .populate("assignedCourses", "code name credits year semester");

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Verify faculty belongs to HOD's department or secondary departments
    if (faculty.department !== hod.department && 
        !faculty.secondaryDepartments?.includes(hod.department)) {
      return res.status(403).json({ error: "Faculty not in your department" });
    }

    // Get timetable entries count for workload calculation
    const timetableEntries = await TimeTable.countDocuments({
      faculty: faculty._id,
      department: hod.department,
      isActive: true,
    });

    // Get attendance records count (classes taken)
    const classesTaken = await Attendance.countDocuments({
      faculty: faculty._id,
    });

    res.json({
      id: faculty._id,
      userId: faculty.userId?._id,
      name: faculty.userId?.name,
      email: faculty.userId?.email,
      phone: faculty.userId?.phone || "Not provided",
      empId: faculty.empId,
      department: faculty.department,
      designation: faculty.designation,
      qualification: faculty.qualification || "Not specified",
      experience: faculty.experience,
      specialization: faculty.specialization || "Not specified",
      assignedCourses: faculty.assignedCourses || [],
      status: faculty.status,
      isClassAdvisor: faculty.isClassAdvisor || false,
      advisorFor: faculty.advisorFor || null,
      secondaryDepartments: faculty.secondaryDepartments || [],
      // Stats
      totalPeriods: timetableEntries,
      classesTaken: classesTaken,
      joinedOn: faculty.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/faculty/:id/schedule - Get Faculty Schedule/Timetable
export const getFacultySchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { year, section } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.findById(id).populate("userId", "name");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Verify faculty belongs to HOD's department or secondary departments
    if (faculty.department !== hod.department && 
        !faculty.secondaryDepartments?.includes(hod.department)) {
      return res.status(403).json({ error: "Faculty not in your department" });
    }

    // Build filter for timetable — use correct model field names
    const filter = {
      facultyId: faculty._id,
    };
    if (year) filter.year = parseInt(year);
    if (section) filter.section = section;

    const timetableEntries = await TimeTable.find(filter)
      .populate("courseId", "code name")
      .sort({ dayOfWeek: 1, period: 1 });

    // Group by day for easier display
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const scheduleByDay = {};

    daysOrder.forEach(day => {
      scheduleByDay[day] = timetableEntries
        .filter(e => e.dayOfWeek === day)
        .map(e => ({
          id: e._id,
          period: e.period,
          course: e.courseId ? { code: e.courseId.code, name: e.courseId.name } : null,
          subject: e.subject || null,
          year: e.year,
          section: e.section,
          classroom: e.classroom || "TBD",
        }));
    });

    res.json({
      faculty: {
        id: faculty._id,
        name: faculty.userId?.name,
        empId: faculty.empId,
      },
      schedule: scheduleByDay,
      totalPeriods: timetableEntries.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/students - Get Students in HOD's Department
export const getDepartmentStudents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, section } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const filter = { department: hod.department, status: 'active' };
    if (year) filter.year = parseInt(year);
    if (section) filter.section = section;

    const students = await Student.find(filter)
      .populate("userId", "name email")
      .sort({ rollNumber: 1 });

    res.json({
      department: hod.department,
      students: students.map(s => ({
        id: s._id,
        userId: s.userId?._id,
        name: s.userId?.name,
        email: s.userId?.email,
        rollNumber: s.rollNumber,
        year: s.year,
        section: s.section,
        cgpa: s.cgpa,
        attendance: s.attendance,
        status: s.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// STUDENT DEEP VIEW
// ========================

// GET /api/hod/student/:id - Get Full Student Academic Profile
export const getStudentDeepView = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Get student with user info
    const student = await Student.findById(id).populate("userId", "name email");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Verify department access
    if (student.department.toLowerCase() !== hod.department.toLowerCase()) {
      return res.status(403).json({ error: "Access denied - student not in your department" });
    }

    // Get attendance data using aggregation
    const attendanceStats = await Attendance.aggregate([
      { $match: { studentId: student._id } },
      {
        $group: {
          _id: "$courseId",
          totalClasses: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          },
          leaveCount: {
            $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] }
          },
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseId: "$_id",
          courseName: "$course.name",
          courseCode: "$course.code",
          totalClasses: 1,
          presentCount: 1,
          absentCount: 1,
          leaveCount: 1,
          percentage: {
            $cond: [
              { $gt: ["$totalClasses", 0] },
              { $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    // Calculate overall attendance
    const overallAttendance = attendanceStats.reduce((acc, curr) => {
      acc.totalClasses += curr.totalClasses;
      acc.presentCount += curr.presentCount;
      return acc;
    }, { totalClasses: 0, presentCount: 0 });

    const overallPercentage = overallAttendance.totalClasses > 0 
      ? (overallAttendance.presentCount / overallAttendance.totalClasses) * 100 
      : 0;

    // Get marks data by semester
    const marksData = await Marks.aggregate([
      { $match: { studentId: student._id } },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          semester: 1,
          courseId: 1,
          courseName: "$course.name",
          courseCode: "$course.code",
          credits: "$course.credits",
          internal1: 1,
          internal2: 1,
          modelExam: 1,
          finalExam: 1,
          total: 1,
          grade: 1,
          isPassed: 1,
          status: 1,
        }
      },
      { $sort: { semester: 1, courseName: 1 } }
    ]);

    // Group marks by semester
    const semesterMarks = {};
    marksData.forEach(mark => {
      if (!semesterMarks[mark.semester]) {
        semesterMarks[mark.semester] = [];
      }
      semesterMarks[mark.semester].push(mark);
    });

    // Calculate GPA per semester and overall CGPA
    const gradePoints = { "O": 10, "A+": 9, "A": 8, "B": 7, "C": 6, "F": 0 };
    const semesterGPA = {};
    let totalCredits = 0;
    let totalGradePoints = 0;

    Object.keys(semesterMarks).forEach(sem => {
      const subjects = semesterMarks[sem];
      let semCredits = 0;
      let semGradePoints = 0;

      subjects.forEach(subj => {
        const credits = subj.credits || 3;
        const gp = gradePoints[subj.grade] || 0;
        semCredits += credits;
        semGradePoints += gp * credits;
      });

      semesterGPA[sem] = semCredits > 0 
        ? Math.round((semGradePoints / semCredits) * 100) / 100 
        : 0;
      
      totalCredits += semCredits;
      totalGradePoints += semGradePoints;
    });

    const cgpa = totalCredits > 0 
      ? Math.round((totalGradePoints / totalCredits) * 100) / 100 
      : 0;

    // Count arrears
    const arrearCount = marksData.filter(m => m.grade === "F").length;

    res.json({
      student: {
        id: student._id,
        name: student.userId?.name,
        email: student.userId?.email,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        section: student.section,
        semester: student.semester,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dob: student.dob,
        mobile: student.mobile,
        parentMobile: student.parentMobile,
        address: student.address,
        admissionYear: student.admissionYear,
      },
      attendance: {
        overall: {
          totalClasses: overallAttendance.totalClasses,
          presentCount: overallAttendance.presentCount,
          percentage: Math.round(overallPercentage * 100) / 100,
        },
        bySubject: attendanceStats,
      },
      marks: {
        bySemester: semesterMarks,
        semesterGPA,
        cgpa,
        arrearCount,
      },
      summary: {
        cgpa,
        attendancePercentage: Math.round(overallPercentage * 100) / 100,
        totalSubjects: marksData.length,
        passedSubjects: marksData.filter(m => m.isPassed).length,
        arrearCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// DEPARTMENT ANALYSIS
// ========================

// GET /api/hod/analysis - Get Department Analysis
export const getFullDepartmentAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, section, semester } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Build student filter
    const studentFilter = { 
      department: hod.department.toLowerCase(),
      status: "active",
    };
    if (year) studentFilter.year = parseInt(year);
    if (section) studentFilter.section = section;

    // Get students
    const students = await Student.find(studentFilter).populate("userId", "name email");
    const studentIds = students.map(s => s._id);

    if (studentIds.length === 0) {
      return res.json({
        department: hod.department,
        filters: { year, section, semester },
        analysis: {
          totalStudents: 0,
          passPercentage: 0,
          averageMarks: 0,
          topper: null,
          arrearCount: 0,
          subjectPerformance: [],
        },
      });
    }

    // Build marks filter
    const marksFilter = { studentId: { $in: studentIds } };
    if (semester) marksFilter.semester = parseInt(semester);

    // Aggregate marks data
    const marksAnalysis = await Marks.aggregate([
      { $match: marksFilter },
      {
        $facet: {
          // Overall statistics
          overall: [
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                passedCount: { $sum: { $cond: [{ $eq: ["$isPassed", true] }, 1, 0] } },
                totalMarks: { $sum: "$total" },
                failedCount: { $sum: { $cond: [{ $eq: ["$grade", "F"] }, 1, 0] } },
              }
            }
          ],
          // Subject-wise performance
          bySubject: [
            {
              $lookup: {
                from: "courses",
                localField: "courseId",
                foreignField: "_id",
                as: "course"
              }
            },
            { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$courseId",
                courseName: { $first: "$course.name" },
                courseCode: { $first: "$course.code" },
                totalStudents: { $sum: 1 },
                passedCount: { $sum: { $cond: [{ $eq: ["$isPassed", true] }, 1, 0] } },
                avgMarks: { $avg: "$total" },
                maxMarks: { $max: "$total" },
                minMarks: { $min: "$total" },
                gradeDistribution: {
                  $push: "$grade"
                }
              }
            },
            {
              $project: {
                courseId: "$_id",
                courseName: 1,
                courseCode: 1,
                totalStudents: 1,
                passedCount: 1,
                passPercentage: {
                  $multiply: [{ $divide: ["$passedCount", "$totalStudents"] }, 100]
                },
                avgMarks: { $round: ["$avgMarks", 2] },
                maxMarks: 1,
                minMarks: 1,
              }
            },
            { $sort: { courseName: 1 } }
          ],
          // Top performers
          toppers: [
            {
              $group: {
                _id: "$studentId",
                avgMarks: { $avg: "$total" },
                totalSubjects: { $sum: 1 },
              }
            },
            { $sort: { avgMarks: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "students",
                localField: "_id",
                foreignField: "_id",
                as: "student"
              }
            },
            { $unwind: "$student" },
            {
              $lookup: {
                from: "users",
                localField: "student.userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                studentId: "$_id",
                name: "$user.name",
                rollNumber: "$student.rollNumber",
                year: "$student.year",
                section: "$student.section",
                avgMarks: { $round: ["$avgMarks", 2] },
                totalSubjects: 1,
              }
            }
          ],
        }
      }
    ]);

    const overallStats = marksAnalysis[0]?.overall[0] || { totalRecords: 0, passedCount: 0, totalMarks: 0, failedCount: 0 };
    const subjectPerformance = marksAnalysis[0]?.bySubject || [];
    const toppers = marksAnalysis[0]?.toppers || [];

    const passPercentage = overallStats.totalRecords > 0 
      ? (overallStats.passedCount / overallStats.totalRecords) * 100 
      : 0;
    const averageMarks = overallStats.totalRecords > 0 
      ? overallStats.totalMarks / overallStats.totalRecords 
      : 0;

    // Get attendance summary
    const attendanceAnalysis = await Attendance.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        }
      }
    ]);

    const attendanceStats = attendanceAnalysis[0] || { totalClasses: 0, presentCount: 0 };
    const attendancePercentage = attendanceStats.totalClasses > 0 
      ? (attendanceStats.presentCount / attendanceStats.totalClasses) * 100 
      : 0;

    res.json({
      department: hod.department,
      filters: { year: year || "all", section: section || "all", semester: semester || "all" },
      analysis: {
        totalStudents: students.length,
        passPercentage: Math.round(passPercentage * 100) / 100,
        averageMarks: Math.round(averageMarks * 100) / 100,
        averageAttendance: Math.round(attendancePercentage * 100) / 100,
        arrearCount: overallStats.failedCount,
        topper: toppers[0] || null,
        topPerformers: toppers,
        subjectPerformance,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ATTENDANCE REVIEW
// ========================

// GET /api/hod/attendance - Get Attendance for Review
export const getAttendanceForReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, courseId, approved } = req.query;

    // Get HOD's department
    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Get students from HOD's department (active only)
    const students = await Student.find({ department: hod.department, status: 'active' });
    const studentIds = students.map(s => s._id);

    const filter = { studentId: { $in: studentIds } };
    if (date) filter.date = new Date(date);
    if (courseId) filter.courseId = courseId;
    if (approved !== undefined) filter.approvedByHOD = approved === "true";

    const attendance = await Attendance.find(filter)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      })
      .populate("facultyId", "empId")
      .populate("courseId", "code name")
      .sort({ date: -1, period: 1 });

    res.json({
      attendance: attendance.map(a => ({
        id: a._id,
        studentId: a.studentId?._id,
        studentName: a.studentId?.userId?.name,
        rollNumber: a.studentId?.rollNumber,
        facultyId: a.facultyId?._id,
        facultyEmpId: a.facultyId?.empId,
        courseId: a.courseId?._id,
        courseCode: a.courseId?.code,
        courseName: a.courseId?.name,
        date: a.date,
        period: a.period,
        status: a.status,
        approvedByHOD: a.approvedByHOD,
        hodRemarks: a.hodRemarks,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/attendance/:id - Approve/Override Attendance
export const updateAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, approve, remarks } = req.body;

    // Get HOD's department
    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const attendance = await Attendance.findById(id)
      .populate("studentId");

    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    // Verify student belongs to HOD's department
    if (attendance.studentId.department !== hod.department) {
      return res.status(403).json({ error: "Cannot modify attendance for students outside your department" });
    }

    // Update attendance
    if (status) attendance.status = status;
    if (approve !== undefined) attendance.approvedByHOD = approve;
    if (remarks) attendance.hodRemarks = remarks;

    await attendance.save();

    res.json({
      message: "Attendance updated successfully",
      attendance: {
        id: attendance._id,
        status: attendance.status,
        approvedByHOD: attendance.approvedByHOD,
        hodRemarks: attendance.hodRemarks,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// LEAVE REVIEW
// ========================

// GET /api/hod/leave - Get Leave Requests for Review
export const getLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Build filter using LeaveRequest model
    const filter = {
      department: { $regex: new RegExp(`^${hod.department}$`, 'i') },
      applicantRole: { $in: ['student', 'faculty'] },
    };
    if (status) {
      // Accept both cases
      filter.finalStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    const leaves = await LeaveRequest.find(filter)
      .populate('applicantUserId', 'name email')
      .sort({ appliedAt: -1 });

    res.json({
      leaves: leaves.map(l => ({
        id: l._id,
        applicantRole: l.applicantRole,
        applicantId: l.applicantId,
        studentName: l.applicantUserId?.name || 'Unknown',
        studentEmail: l.applicantUserId?.email,
        rollNumber: l.rollNumber,
        empId: l.empId,
        department: l.department,
        leaveType: l.leaveType,
        fromDate: l.fromDate,
        toDate: l.toDate,
        reason: l.reason,
        finalStatus: l.finalStatus,
        facultyApproval: l.facultyApproval,
        hodApproval: l.hodApproval,
        principalApproval: l.principalApproval,
        appliedAt: l.appliedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/leave/:id - Approve/Reject Leave
export const updateLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !["approved", "rejected"].includes(status.toLowerCase())) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    // Verify belongs to HOD's department
    if (leave.department?.toLowerCase() !== hod.department?.toLowerCase()) {
      return res.status(403).json({ error: "Cannot modify leave outside your department" });
    }

    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // Set HOD approval
    leave.hodApproval = {
      status: normalizedStatus,
      approvedBy: hod._id,
      approvedAt: new Date(),
      remarks,
    };
    leave.finalStatus = normalizedStatus;
    await leave.save();

    res.json({
      message: `Leave ${normalizedStatus.toLowerCase()} successfully`,
      leave: {
        id: leave._id,
        finalStatus: leave.finalStatus,
        hodApproval: leave.hodApproval,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ========================
// DASHBOARD STATS
// ========================

// GET /api/hod/stats - Get Department Stats
export const getDepartmentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const [studentsCount, facultyCount, pendingLeaves] = await Promise.all([
      Student.countDocuments({ department: hod.department, status: "active" }),
      Faculty.countDocuments({ department: hod.department, status: "active" }),
      Leave.countDocuments({
        studentId: {
          $in: (await Student.find({ department: hod.department, status: 'active' })).map(s => s._id)
        },
        status: "pending"
      }),
    ]);

    res.json({
      department: hod.department,
      stats: {
        totalStudents: studentsCount,
        totalFaculty: facultyCount,
        pendingLeaveRequests: pendingLeaves,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ATTENDANCE SUMMARY
// ========================

// GET /api/hod/attendance-summary - Get Department Attendance Summary
export const getAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Default to current month if no dates provided
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get overall stats
    const overallStats = await getAttendanceStats(start, end, hod.department);

    // Get per-student summary (active students only)
    const students = await Student.find({ department: hod.department, status: 'active' }).populate("userId", "name");
    
    const studentSummaries = await Promise.all(students.map(async (student) => {
      const records = await Attendance.find({
        studentId: student._id,
        date: { $gte: start, $lte: end },
      });

      const total = records.length;
      const present = records.filter(r => r.status === "present").length;

      return {
        studentId: student._id,
        name: student.userId?.name,
        rollNumber: student.rollNumber,
        year: student.year,
        section: student.section,
        totalClasses: total,
        attended: present,
        percentage: total ? Math.round((present / total) * 100) : 0,
      };
    }));

    // Sort by percentage (lowest first for attention)
    studentSummaries.sort((a, b) => a.percentage - b.percentage);

    res.json({
      department: hod.department,
      dateRange: { start, end },
      overallStats,
      lowAttendance: studentSummaries.filter(s => s.percentage < 75),
      allStudents: studentSummaries,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ANALYTICS
// ========================

// GET /api/hod/analytics/attendance - Get attendance analytics
export const getAttendanceAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Get monthly attendance trend
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

    const attendanceData = await Attendance.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      { $match: { "student.department": hod.department, date: { $gte: monthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" },
          },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedData = attendanceData.map(d => ({
      month: monthNames[d._id.month - 1],
      year: d._id.year,
      attendance: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    }));

    res.json({ attendanceData: formattedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/analytics/performance - Get year-wise performance
export const getPerformanceAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Get CGPA stats by year
    const performanceData = await Student.aggregate([
      { $match: { department: hod.department, status: "active" } },
      {
        $group: {
          _id: "$year",
          avgCgpa: { $avg: "$cgpa" },
          studentCount: { $sum: 1 },
          highPerformers: { $sum: { $cond: [{ $gte: ["$cgpa", 8.0] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const yearLabels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const formattedData = performanceData.map(d => ({
      year: yearLabels[d._id - 1] || `Year ${d._id}`,
      avgCgpa: d.avgCgpa ? parseFloat(d.avgCgpa.toFixed(2)) : 0,
      students: d.studentCount,
      highPerformers: d.highPerformers,
    }));

    res.json({ performanceData: formattedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/analytics/workload - Get faculty workload distribution
export const getWorkloadAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const facultyList = await Faculty.find({ department: hod.department, status: "active" })
      .populate("userId", "name")
      .populate("assignedCourses");

    const workloadData = facultyList.map(f => ({
      name: f.userId?.name || "Unknown",
      courses: f.assignedCourses?.length || 0,
      credits: f.assignedCourses?.reduce((sum, c) => sum + (c.credits || 3), 0) || 0,
    }));

    // Categorize workload
    const workloadCategories = [
      { category: "Light (1-2 courses)", count: workloadData.filter(w => w.courses <= 2).length },
      { category: "Medium (3-4 courses)", count: workloadData.filter(w => w.courses >= 3 && w.courses <= 4).length },
      { category: "Heavy (5+ courses)", count: workloadData.filter(w => w.courses >= 5).length },
    ];

    res.json({
      workloadData,
      workloadCategories,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/analytics/subjects - Get subject-wise performance
export const getSubjectAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Get courses in department
    const courses = await Course.find({ department: hod.department, status: "active" });

    // Get attendance stats per course
    const subjectData = await Promise.all(courses.map(async (course) => {
      const attendanceStats = await Attendance.aggregate([
        { $match: { courseId: course._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          },
        },
      ]);

      const stats = attendanceStats[0] || { total: 0, present: 0 };
      return {
        code: course.code,
        name: course.name,
        semester: course.semester,
        attendance: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      };
    }));

    res.json({ subjectData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// REPORTS
// ========================

// GET /api/hod/reports - Get generated reports
export const getReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const filter = { department: hod.department };
    if (type) filter.type = type;

    const Report = (await import("../models/Report.js")).default;

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
        year: r.year,
        section: r.section,
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

// POST /api/hod/reports - Generate new report
export const generateReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, category, year, section, startDate, endDate, title } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const Report = (await import("../models/Report.js")).default;

    // Generate report data based on type
    let data = {};
    const filter = { department: hod.department, status: 'active' };
    if (year) filter.year = parseInt(year);
    if (section) filter.section = section;

    if (type === "attendance") {
      const students = await Student.find(filter).populate("userId", "name");
      const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate) : new Date();

      data = await Promise.all(students.map(async (student) => {
        const records = await Attendance.find({
          studentId: student._id,
          date: { $gte: start, $lte: end },
        });
        const total = records.length;
        const present = records.filter(r => r.status === "present").length;
        return {
          name: student.userId?.name,
          rollNumber: student.rollNumber,
          total,
          present,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      }));
    } else if (type === "performance") {
      data = await Student.find(filter)
        .populate("userId", "name")
        .select("rollNumber year section cgpa")
        .lean();
    }

    const report = await Report.create({
      title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${new Date().toLocaleDateString()}`,
      type,
      category: category || "monthly",
      department: hod.department,
      year,
      section,
      dateRange: { start: startDate, end: endDate },
      generatedBy: userId,
      generatedByRole: "hod",
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

// GET /api/hod/reports/:id - Get specific report
export const getReportById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const Report = (await import("../models/Report.js")).default;
    const report = await Report.findOne({ _id: id, department: hod.department });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// TIMETABLE & WORKLOAD
// ========================

// GET /api/hod/faculty-workload - Get Faculty Workload
export const getFacultyWorkload = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.find({ department: hod.department })
      .populate("userId", "name email")
      .populate("assignedCourses", "code name");

    const workload = faculty.map(f => {
      const courses = f.assignedCourses?.length || 0;
      const periodsPerWeek = courses * 6; // Approx 6 periods per course
      const students = courses * 45; // Approx 45 students per course
      let status = 'balanced';
      let workloadPercent = 70 + (courses * 5);
      
      if (courses > 4) {
        status = 'overloaded';
        workloadPercent = Math.min(95, courses * 20);
      } else if (courses < 2) {
        status = 'underutilized';
        workloadPercent = Math.max(30, courses * 25);
      }

      return {
        name: f.userId?.name || 'Unknown',
        courses,
        students,
        workload: workloadPercent,
        status,
        periodsPerWeek,
        attendanceSubmission: 90 + Math.floor(Math.random() * 10), // Placeholder
      };
    });

    const facultyNames = faculty.map(f => f.userId?.name || 'Unknown');

    res.json({ workload, facultyNames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/faculty-list - Get Faculty Names with IDs
export const getFacultyList = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.find({ department: hod.department })
      .populate("userId", "name");

    res.json({
      faculty: faculty.map(f => ({
        id: f._id,
        name: f.userId?.name || 'Unknown',
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/subjects - Get Subjects/Courses
export const getSubjectsList = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const Course = (await import("../models/Course.js")).default;
    const courses = await Course.find({ department: hod.department });

    res.json({
      subjects: courses.map(c => c.name),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/classes - Get Classes with Advisor Details
export const getClassesList = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Seed classes for department if not exist
    await Class.seedDepartmentClasses(hod.department);

    // Get all classes for department with advisor info
    const classes = await Class.find({ 
      department: hod.department,
      status: "active"
    })
      .populate({
        path: "advisorFacultyId",
        select: "empId designation",
        populate: { path: "userId", select: "name email" }
      })
      .sort({ year: 1, section: 1 });

    // Get student counts per class
    const studentCounts = await Student.aggregate([
      { $match: { department: hod.department, status: "active" } },
      { $group: { _id: { year: "$year", section: "$section" }, count: { $sum: 1 } } }
    ]);

    const countMap = studentCounts.reduce((acc, item) => {
      const key = `${item._id.year}-${item._id.section || ''}`;
      acc[key] = item.count;
      return acc;
    }, {});

    const classesWithDetails = classes.map(cls => {
      const key = `${cls.year}-${cls.section || ''}`;
      return {
        _id: cls._id,
        department: cls.department,
        year: cls.year,
        section: cls.section,
        displayName: `${cls.department.toUpperCase()} ${cls.year}${cls.section || ''}`,
        studentCount: countMap[key] || 0,
        hasAdvisor: !!cls.advisorFacultyId,
        advisor: cls.advisorFacultyId ? {
          _id: cls.advisorFacultyId._id,
          name: cls.advisorFacultyId.userId?.name,
          email: cls.advisorFacultyId.userId?.email,
          empId: cls.advisorFacultyId.empId,
          designation: cls.advisorFacultyId.designation,
        } : null,
      };
    });

    res.json({ 
      department: hod.department,
      classes: classesWithDetails 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// TIMETABLE MANAGEMENT (Multi-Year/Section)
// ========================

// GET /api/hod/timetable - Get Timetable for Year+Section
export const getTimetable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, section } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Build query
    const query = { 
      department: hod.department.toLowerCase(),
      status: "active",
    };
    if (year) query.year = parseInt(year);
    if (section) query.section = section;

    const entries = await TimeTable.find(query)
      .populate("facultyId", "userId")
      .populate({
        path: "facultyId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("courseId", "code name")
      .sort({ dayOfWeek: 1, period: 1 });

    // Format as grid structure for frontend
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    
    const timetableGrid = {};
    days.forEach(day => {
      timetableGrid[day] = {};
      periods.forEach(p => {
        timetableGrid[day][p] = null;
      });
    });

    // Fill in entries
    entries.forEach(entry => {
      if (timetableGrid[entry.dayOfWeek]) {
        timetableGrid[entry.dayOfWeek][entry.period] = {
          id: entry._id,
          faculty: entry.facultyId?.userId?.name || "Unknown",
          facultyId: entry.facultyId?._id,
          subject: entry.courseId?.name || entry.subject || "Unknown",
          subjectCode: entry.courseId?.code,
          courseId: entry.courseId?._id,
          classroom: entry.classroom,
          year: entry.year,
          section: entry.section,
        };
      }
    });

    res.json({ 
      department: hod.department,
      year: year ? parseInt(year) : null,
      section: section || null,
      timetable: timetableGrid,
      entries: entries.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/timetable/:id - Get Single Timetable Entry
export const getTimetableById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const entry = await TimeTable.findById(id)
      .populate({
        path: "facultyId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("courseId", "code name")
      .populate("createdBy", "name email");

    if (!entry) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    // Verify department access
    if (entry.department.toLowerCase() !== hod.department.toLowerCase()) {
      return res.status(403).json({ error: "Access denied to this timetable entry" });
    }

    res.json({
      entry: {
        id: entry._id,
        department: entry.department,
        year: entry.year,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
        faculty: {
          id: entry.facultyId?._id,
          name: entry.facultyId?.userId?.name,
          email: entry.facultyId?.userId?.email,
        },
        course: {
          id: entry.courseId?._id,
          code: entry.courseId?.code,
          name: entry.courseId?.name,
        },
        subject: entry.subject,
        classroom: entry.classroom,
        status: entry.status,
        createdBy: entry.createdBy?.name,
        createdAt: entry.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/hod/timetable - Create Timetable Entry
export const saveTimetable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, section, dayOfWeek, period, facultyId, courseId, subject, classroom, conflictOverride } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Validation
    if (!year || !section || !dayOfWeek || !period || !facultyId) {
      return res.status(400).json({ 
        error: "year, section, dayOfWeek, period, and facultyId are required" 
      });
    }

    // Verify faculty belongs to the department (or has secondary access)
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }
    
    const deptLower = hod.department.toLowerCase();
    const canTeach = faculty.department.toLowerCase() === deptLower || 
                     (faculty.secondaryDepartments || []).map(d => d.toLowerCase()).includes(deptLower);
    if (!canTeach) {
      return res.status(403).json({ error: "Faculty does not have access to teach in this department" });
    }

    // Prepare entry data
    const entryData = {
      department: deptLower,
      year: parseInt(year),
      section: section.toUpperCase(),
      dayOfWeek,
      period: parseInt(period),
      facultyId,
      courseId: courseId || null,
      subject: subject || null,
      classroom: classroom || null,
      createdBy: req.user.id,
      createdByRole: "hod",
    };

    // Check for conflicts (unless override by superuser)
    const isSuperUser = req.user.role === "superUser";
    if (!isSuperUser && !conflictOverride) {
      const conflicts = await TimeTable.checkConflicts(entryData);
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: "Schedule conflicts detected",
          conflicts: conflicts.map(c => ({
            type: c.type,
            message: c.message,
          })),
        });
      }
    }

    // Upsert entry — allows re-creating a slot that was previously deleted
    const entry = await TimeTable.findOneAndUpdate(
      {
        department: entryData.department,
        year: entryData.year,
        section: entryData.section,
        dayOfWeek: entryData.dayOfWeek,
        period: entryData.period,
      },
      {
        $set: {
          ...entryData,
          conflictOverride: isSuperUser && conflictOverride,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: "Timetable entry created",
      entry: {
        id: entry._id,
        department: entry.department,
        year: entry.year,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
      },
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: "A schedule entry already exists for this slot" 
      });
    }
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/timetable/:id - Update Timetable Entry
export const updateTimetable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { facultyId, courseId, subject, classroom, conflictOverride } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const entry = await TimeTable.findById(id);
    if (!entry) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    // Verify department access
    if (entry.department.toLowerCase() !== hod.department.toLowerCase()) {
      return res.status(403).json({ error: "Access denied to this timetable entry" });
    }

    // If changing faculty, verify they can teach in this department
    if (facultyId && facultyId !== entry.facultyId.toString()) {
      const newFaculty = await Faculty.findById(facultyId);
      if (!newFaculty) {
        return res.status(404).json({ error: "New faculty not found" });
      }
      
      const deptLower = hod.department.toLowerCase();
      const canTeach = newFaculty.department.toLowerCase() === deptLower || 
                       (newFaculty.secondaryDepartments || []).map(d => d.toLowerCase()).includes(deptLower);
      if (!canTeach) {
        return res.status(403).json({ error: "Faculty does not have access to teach in this department" });
      }

      // Check faculty conflict
      const isSuperUser = req.user.role === "superUser";
      if (!isSuperUser && !conflictOverride) {
        const conflicts = await TimeTable.checkConflicts({
          ...entry.toObject(),
          facultyId,
        }, entry._id);
        
        const facultyConflict = conflicts.find(c => c.type === "FACULTY");
        if (facultyConflict) {
          return res.status(409).json({
            error: "Faculty conflict detected",
            conflicts: [{ type: "FACULTY", message: facultyConflict.message }],
          });
        }
      }

      entry.facultyId = facultyId;
    }

    // Update other fields
    if (courseId !== undefined) entry.courseId = courseId || null;
    if (subject !== undefined) entry.subject = subject || null;
    if (classroom !== undefined) entry.classroom = classroom || null;

    await entry.save();

    res.json({
      message: "Timetable entry updated",
      entry: {
        id: entry._id,
        department: entry.department,
        year: entry.year,
        section: entry.section,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/hod/timetable/:id - Delete Timetable Entry
export const deleteTimetable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const entry = await TimeTable.findById(id);
    if (!entry) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    // Verify department access
    if (entry.department.toLowerCase() !== hod.department.toLowerCase()) {
      return res.status(403).json({ error: "Access denied to this timetable entry" });
    }

    await TimeTable.findByIdAndDelete(id);

    res.json({ message: "Timetable entry deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/timetable/today - Get HOD's Today Schedule
export const getTodaySchedule = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const today = new Date();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = daysOfWeek[today.getDay()];

    // Check if HOD also has a faculty profile (for teaching HODs)
    const faculty = await Faculty.findOne({ userId });
    
    const periodTimes = [
      { period: 1, start: "09:00", end: "09:50" },
      { period: 2, start: "09:50", end: "10:40" },
      { period: 3, start: "10:50", end: "11:40" },
      { period: 4, start: "11:40", end: "12:30" },
      { period: 5, start: "13:30", end: "14:20" },
      { period: 6, start: "14:20", end: "15:10" },
      { period: 7, start: "15:20", end: "16:10" },
      { period: 8, start: "16:10", end: "17:00" },
    ];

    let fullSchedule;

    if (faculty) {
      // HOD also teaches - get their timetable entries
      const schedule = await TimeTable.find({
        facultyId: faculty._id,
        day: dayName,
      })
        .populate("courseId", "code name department")
        .sort({ period: 1 });

      fullSchedule = periodTimes.map(pt => {
        const entry = schedule.find(s => s.period === pt.period);
        return {
          period: pt.period,
          startTime: pt.start,
          endTime: pt.end,
          hasClass: !!entry,
          course: entry ? {
            _id: entry.courseId?._id,
            code: entry.courseId?.code,
            name: entry.courseId?.name,
          } : null,
          room: entry?.room || null,
          section: entry?.section || null,
        };
      });
    } else {
      // HOD doesn't teach - return empty schedule
      fullSchedule = periodTimes.map(pt => ({
        period: pt.period,
        startTime: pt.start,
        endTime: pt.end,
        hasClass: false,
        course: null,
        room: null,
        section: null,
      }));
    }

    res.json({
      day: dayName,
      date: today.toISOString().split("T")[0],
      schedule: fullSchedule,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// COURSE MANAGEMENT
// ========================

// GET /api/hod/courses - Get Courses in HOD's Department
export const getDepartmentCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const courses = await Course.find({ department: hod.department });

    res.json({
      department: hod.department,
      courses: courses.map(c => ({
        id: c._id,
        code: c.code,
        name: c.name,
        department: c.department,
        semester: c.semester,
        year: c.year,
        section: c.section,
        credits: c.credits,
        status: c.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/hod/courses - Create Course in HOD's Department
export const createDepartmentCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    let { code, name, semester, year, section, credits } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    code = code?.toUpperCase().trim();
    name = name?.trim();

    if (!code || !name || !semester) {
      return res.status(400).json({ error: "Code, name, and semester are required" });
    }

    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({ error: "Course code already exists" });
    }

    const course = await Course.create({
      code,
      name,
      department: hod.department,
      semester: parseInt(semester),
      year: year ? parseInt(year) : Math.ceil(parseInt(semester) / 2),
      section: section?.trim() || "",
      credits: credits ? parseInt(credits) : 3,
    });

    res.status(201).json({
      message: "Course created successfully",
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        department: course.department,
        semester: course.semester,
        year: course.year,
        section: course.section,
        credits: course.credits,
        status: course.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/courses/:id - Update Course
export const updateDepartmentCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, semester, year, section, credits, status } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Verify course belongs to HOD's department
    if (course.department !== hod.department) {
      return res.status(403).json({ error: "Cannot modify courses outside your department" });
    }

    if (name) course.name = name.trim();
    if (semester) course.semester = parseInt(semester);
    if (year) course.year = parseInt(year);
    if (section !== undefined) course.section = section.trim();
    if (credits) course.credits = parseInt(credits);
    if (status) course.status = status;

    await course.save();

    res.json({
      message: "Course updated successfully",
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        department: course.department,
        semester: course.semester,
        year: course.year,
        section: course.section,
        credits: course.credits,
        status: course.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/hod/faculty/:id/assign-courses - Assign Courses to Faculty
export const assignCoursesToFaculty = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { courseIds } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: "courseIds array is required" });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Verify faculty belongs to HOD's department
    if (faculty.department !== hod.department) {
      return res.status(403).json({ error: "Cannot assign courses to faculty outside your department" });
    }

    // Validate courses exist and belong to department
    const courses = await Course.find({ 
      _id: { $in: courseIds },
      department: hod.department 
    });

    if (courses.length !== courseIds.length) {
      return res.status(400).json({ error: "Some courses not found or don't belong to your department" });
    }

    // Prevent duplicate assignments
    const existingCourseIds = faculty.assignedCourses.map(c => c.toString());
    const newCourseIds = courseIds.filter(cId => !existingCourseIds.includes(cId));

    faculty.assignedCourses = [...faculty.assignedCourses, ...newCourseIds];
    await faculty.save();

    const updatedFaculty = await Faculty.findById(id)
      .populate("userId", "name email")
      .populate("assignedCourses", "code name department semester year section credits");

    res.json({
      message: "Courses assigned successfully",
      faculty: {
        id: updatedFaculty._id,
        name: updatedFaculty.userId?.name,
        email: updatedFaculty.userId?.email,
        empId: updatedFaculty.empId,
        assignedCourses: updatedFaculty.assignedCourses || [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/hod/faculty/:facultyId/courses/:courseId - Remove Course from Faculty
export const removeCourseFromFaculty = async (req, res) => {
  try {
    const userId = req.user.id;
    const { facultyId, courseId } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Verify faculty belongs to HOD's department
    if (faculty.department !== hod.department) {
      return res.status(403).json({ error: "Cannot modify faculty outside your department" });
    }

    // Remove course from assignedCourses
    faculty.assignedCourses = faculty.assignedCourses.filter(
      c => c.toString() !== courseId
    );
    await faculty.save();

    const updatedFaculty = await Faculty.findById(facultyId)
      .populate("userId", "name email")
      .populate("assignedCourses", "code name department semester year section credits");

    res.json({
      message: "Course removed from faculty successfully",
      faculty: {
        id: updatedFaculty._id,
        name: updatedFaculty.userId?.name,
        assignedCourses: updatedFaculty.assignedCourses || [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// SCHEDULING ENGINE
// ========================

// POST /api/hod/schedule - Create Schedule Entry with Conflict Detection
export const createScheduleEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { facultyId, courseId, dayOfWeek, period, subject, className, section, classroom } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Validate required fields
    if (!facultyId || !dayOfWeek || !period) {
      return res.status(400).json({ error: "facultyId, dayOfWeek, and period are required" });
    }

    // Validate faculty exists and can teach in this department
    const faculty = await Faculty.findById(facultyId).populate("userId", "name");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Check if faculty belongs to HOD's department or has permission
    const canTeach = await canFacultyTeachInDepartment(facultyId, hod.department);
    if (!canTeach) {
      return res.status(403).json({ 
        error: "Faculty doesn't have permission to teach in your department",
        facultyDepartment: faculty.department,
        hodDepartment: hod.department,
      });
    }

    // Run conflict validation
    const validation = await validateScheduleConflicts({
      facultyId,
      dayOfWeek,
      period,
      classroom,
      courseId,
      department: hod.department,
    });

    if (!validation.valid) {
      // Log the conflict
      await logSchedulingConflict({
        attemptedBy: userId,
        department: hod.department,
        conflicts: validation.conflicts,
        timestamp: new Date(),
      });

      return res.status(409).json({
        error: "Scheduling conflict detected",
        conflicts: validation.conflicts,
      });
    }

    // Get period times
    const periodConfig = await PeriodConfig.findOne({ periodNumber: period });

    // Create the schedule entry
    const scheduleEntry = new TimeTable({
      department: hod.department,
      facultyId,
      courseId,
      dayOfWeek,
      period,
      subject: subject || (courseId ? (await Course.findById(courseId))?.name : null),
      className,
      section,
      classroom,
      createdBy: userId,
      createdByRole: "hod",
      status: "active",
    });

    await scheduleEntry.save();

    res.status(201).json({
      message: "Schedule entry created successfully",
      schedule: {
        _id: scheduleEntry._id,
        department: scheduleEntry.department,
        dayOfWeek: scheduleEntry.dayOfWeek,
        period: scheduleEntry.period,
        startTime: periodConfig?.startTime,
        endTime: periodConfig?.endTime,
        subject: scheduleEntry.subject,
        className: scheduleEntry.className,
        section: scheduleEntry.section,
        classroom: scheduleEntry.classroom,
        faculty: {
          _id: faculty._id,
          name: faculty.userId?.name,
          empId: faculty.empId,
        },
      },
    });
  } catch (error) {
    // Handle duplicate key error from unique index
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Schedule slot already occupied",
        conflicts: [{
          type: "duplicate",
          message: "This slot is already scheduled",
        }],
      });
    }
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/schedule - Get Department Schedule
export const getDepartmentSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { day, dayOfWeek } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const targetDay = day || dayOfWeek;

    if (targetDay) {
      // Get schedule for specific day
      const schedule = await getDepartmentDaySchedule(hod.department, targetDay);
      return res.json({
        department: hod.department,
        dayOfWeek: targetDay,
        schedule,
      });
    }

    // Get full week schedule
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekSchedule = {};

    for (const d of daysOfWeek) {
      weekSchedule[d] = await getDepartmentDaySchedule(hod.department, d);
    }

    // Get period configs for time display
    const periodConfigs = await PeriodConfig.find({}).sort({ periodNumber: 1 });

    res.json({
      department: hod.department,
      schedule: weekSchedule,
      periodConfigs: periodConfigs.map(p => ({
        period: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/hod/schedule/:id - Delete Schedule Entry
export const deleteScheduleEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const entry = await TimeTable.findById(id);
    if (!entry) {
      return res.status(404).json({ error: "Schedule entry not found" });
    }

    // HOD can only delete entries in their department
    if (entry.department !== hod.department) {
      return res.status(403).json({ error: "Cannot delete schedule entry from another department" });
    }

    await TimeTable.findByIdAndDelete(id);

    res.json({ message: "Schedule entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/schedule/:id - Update Schedule Entry
export const updateScheduleEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { facultyId, courseId, dayOfWeek, period, subject, className, section, classroom } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const existingEntry = await TimeTable.findById(id);
    if (!existingEntry) {
      return res.status(404).json({ error: "Schedule entry not found" });
    }

    // HOD can only update entries in their department
    if (existingEntry.department !== hod.department) {
      return res.status(403).json({ error: "Cannot update schedule entry from another department" });
    }

    // If changing faculty, day, or period, run conflict validation
    const newFacultyId = facultyId || existingEntry.facultyId;
    const newDayOfWeek = dayOfWeek || existingEntry.dayOfWeek;
    const newPeriod = period || existingEntry.period;
    const newClassroom = classroom !== undefined ? classroom : existingEntry.classroom;

    // Check for conflicts (excluding current entry)
    const conflictQuery = {
      _id: { $ne: id },
      facultyId: newFacultyId,
      dayOfWeek: newDayOfWeek,
      period: newPeriod,
      status: "active",
    };

    const existingConflict = await TimeTable.findOne(conflictQuery);
    if (existingConflict) {
      return res.status(409).json({
        error: "Scheduling conflict detected",
        conflicts: [{
          type: "faculty",
          message: `Faculty already scheduled in ${existingConflict.department} at this time`,
          details: {
            department: existingConflict.department,
            subject: existingConflict.subject,
          },
        }],
      });
    }

    // Check classroom conflict (excluding current entry)
    if (newClassroom) {
      const classroomConflict = await TimeTable.findOne({
        _id: { $ne: id },
        classroom: newClassroom,
        dayOfWeek: newDayOfWeek,
        period: newPeriod,
        status: "active",
      });

      if (classroomConflict) {
        return res.status(409).json({
          error: "Classroom conflict detected",
          conflicts: [{
            type: "classroom",
            message: `Classroom ${newClassroom} already booked at this time`,
          }],
        });
      }
    }

    // Update the entry
    const updateData = {};
    if (facultyId) updateData.facultyId = facultyId;
    if (courseId) updateData.courseId = courseId;
    if (dayOfWeek) updateData.dayOfWeek = dayOfWeek;
    if (period) updateData.period = period;
    if (subject) updateData.subject = subject;
    if (className) updateData.className = className;
    if (section !== undefined) updateData.section = section;
    if (classroom !== undefined) updateData.classroom = classroom;

    const updatedEntry = await TimeTable.findByIdAndUpdate(id, updateData, { new: true })
      .populate("facultyId")
      .populate("courseId", "code name");

    await updatedEntry.facultyId.populate("userId", "name");

    res.json({
      message: "Schedule entry updated successfully",
      schedule: {
        _id: updatedEntry._id,
        department: updatedEntry.department,
        dayOfWeek: updatedEntry.dayOfWeek,
        period: updatedEntry.period,
        subject: updatedEntry.subject,
        className: updatedEntry.className,
        section: updatedEntry.section,
        classroom: updatedEntry.classroom,
        faculty: {
          _id: updatedEntry.facultyId._id,
          name: updatedEntry.facultyId.userId?.name,
          empId: updatedEntry.facultyId.empId,
        },
        course: updatedEntry.courseId ? {
          _id: updatedEntry.courseId._id,
          code: updatedEntry.courseId.code,
          name: updatedEntry.courseId.name,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/faculty-availability - Get Faculty Availability
export const getFacultyAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { facultyId, day, dayOfWeek, period } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const targetDay = day || dayOfWeek;

    // If specific faculty and day provided, get their availability
    if (facultyId && targetDay) {
      const faculty = await Faculty.findById(facultyId).populate("userId", "name email");
      if (!faculty) {
        return res.status(404).json({ error: "Faculty not found" });
      }

      // Check if this faculty can be scheduled by this HOD
      const canTeach = await canFacultyTeachInDepartment(facultyId, hod.department);

      const availability = await getFacultyDayAvailability(facultyId, targetDay);

      return res.json({
        faculty: {
          _id: faculty._id,
          name: faculty.userId?.name,
          email: faculty.userId?.email,
          empId: faculty.empId,
          department: faculty.department,
          isSharedFaculty: faculty.secondaryDepartments && faculty.secondaryDepartments.length > 0,
          canScheduleInDepartment: canTeach,
        },
        ...availability,
      });
    }

    // If day and period provided, get available faculty for that slot
    if (targetDay && period) {
      const availableFaculty = await getAvailableFacultyForSlot(hod.department, targetDay, parseInt(period));

      return res.json({
        department: hod.department,
        dayOfWeek: targetDay,
        period: parseInt(period),
        availableFaculty,
        count: availableFaculty.length,
      });
    }

    // Default: Get all faculty in department with their basic availability info
    const departmentFaculty = await Faculty.find({
      $or: [
        { department: hod.department },
        { secondaryDepartments: hod.department },
      ],
      status: "active",
    }).populate("userId", "name email");

    const facultyWithAvailability = await Promise.all(
      departmentFaculty.map(async (f) => {
        // Count total scheduled periods for this faculty
        const scheduledCount = await TimeTable.countDocuments({
          facultyId: f._id,
          status: "active",
        });

        return {
          _id: f._id,
          name: f.userId?.name,
          email: f.userId?.email,
          empId: f.empId,
          department: f.department,
          isSharedFaculty: f.secondaryDepartments && f.secondaryDepartments.length > 0,
          isPrimaryDepartment: f.department === hod.department,
          scheduledPeriods: scheduledCount,
          maxPeriods: 48, // 6 days * 8 periods
        };
      })
    );

    res.json({
      department: hod.department,
      faculty: facultyWithAvailability,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/hod/faculty/:id/secondary-departments - Add Secondary Department
export const addSecondaryDepartment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { department: secondaryDept } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Faculty must belong to HOD's department for HOD to modify
    if (faculty.department !== hod.department) {
      return res.status(403).json({ error: "Can only modify faculty in your department" });
    }

    if (!secondaryDept) {
      return res.status(400).json({ error: "Secondary department is required" });
    }

    // Don't add primary department as secondary
    if (secondaryDept === faculty.department) {
      return res.status(400).json({ error: "Cannot add primary department as secondary" });
    }

    // Initialize if needed and add
    if (!faculty.secondaryDepartments) {
      faculty.secondaryDepartments = [];
    }

    if (!faculty.secondaryDepartments.includes(secondaryDept)) {
      faculty.secondaryDepartments.push(secondaryDept);
      await faculty.save();
    }

    res.json({
      message: "Secondary department added",
      faculty: {
        _id: faculty._id,
        department: faculty.department,
        secondaryDepartments: faculty.secondaryDepartments,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/hod/faculty/:id/secondary-departments/:dept - Remove Secondary Department
export const removeSecondaryDepartment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, dept } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    if (faculty.department !== hod.department) {
      return res.status(403).json({ error: "Can only modify faculty in your department" });
    }

    faculty.secondaryDepartments = (faculty.secondaryDepartments || []).filter(d => d !== dept);
    await faculty.save();

    res.json({
      message: "Secondary department removed",
      faculty: {
        _id: faculty._id,
        department: faculty.department,
        secondaryDepartments: faculty.secondaryDepartments,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// MARKS ANALYSIS & VERIFICATION
// ========================

// GET /api/hod/analysis - Get result analysis for department
export const getDepartmentAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { semester, year, section } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    if (!semester) {
      return res.status(400).json({ error: "semester query parameter is required" });
    }

    // Get analysis for all years in department or specific year
    const years = year ? [parseInt(year)] : [1, 2, 3, 4];
    const analyses = [];

    for (const y of years) {
      const analysis = await Marks.getClassAnalysis(
        hod.department,
        y,
        section || null,
        parseInt(semester)
      );

      if (analysis.totalStudents > 0) {
        analyses.push({
          year: y,
          section: section || "All",
          ...analysis,
        });
      }
    }

    // Calculate department-wide summary
    const totalStudents = analyses.reduce((sum, a) => sum + a.totalStudents, 0);
    const totalPassed = analyses.reduce((sum, a) => sum + a.passCount, 0);
    const overallPassPercentage = totalStudents > 0 
      ? Math.round((totalPassed / totalStudents) * 100) 
      : 0;

    res.json({
      department: hod.department,
      semester: parseInt(semester),
      summary: {
        totalStudents,
        totalPassed,
        totalFailed: totalStudents - totalPassed,
        overallPassPercentage,
      },
      yearWiseAnalysis: analyses,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/class-advisors - Get class advisors in department
export const getClassAdvisors = async (req, res) => {
  try {
    const userId = req.user.id;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const advisors = await Faculty.find({
      department: hod.department,
      isClassAdvisor: true,
      status: "active",
    }).populate("userId", "name email");

    res.json({
      department: hod.department,
      advisors: advisors.map(a => ({
        _id: a._id,
        name: a.userId?.name,
        email: a.userId?.email,
        empId: a.empId,
        advisorFor: a.advisorFor,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/assign-advisor - Assign class advisor
export const assignClassAdvisor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { facultyId, year, section } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    if (!facultyId || !year) {
      return res.status(400).json({ error: "facultyId and year are required" });
    }

    const faculty = await Faculty.findById(facultyId).populate("userId", "name");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Rule 3: HOD can assign advisor only within their department
    if (faculty.department !== hod.department) {
      return res.status(403).json({ error: "Faculty not in your department" });
    }

    // Rule 2: Check if faculty is already advisor of another class
    if (faculty.isClassAdvisor && faculty.advisorFor) {
      const currentClass = `Year ${faculty.advisorFor.year}${faculty.advisorFor.section ? ` Section ${faculty.advisorFor.section}` : ''}`;
      return res.status(409).json({ 
        error: `${faculty.userId?.name || 'This faculty'} is already Class Advisor for ${currentClass}`,
        currentAssignment: faculty.advisorFor,
      });
    }

    // Rule 1: Check if class already has an advisor
    const existingAdvisor = await Faculty.findOne({
      department: hod.department,
      "advisorFor.year": parseInt(year),
      "advisorFor.section": section || null,
      isClassAdvisor: true,
      _id: { $ne: facultyId },
    }).populate("userId", "name");

    if (existingAdvisor) {
      return res.status(409).json({ 
        error: `${existingAdvisor.userId?.name} is already advisor for Year ${year}${section ? ` Section ${section}` : ""}`,
        existingAdvisor: {
          _id: existingAdvisor._id,
          name: existingAdvisor.userId?.name,
          empId: existingAdvisor.empId,
        },
      });
    }

    // Get or create the class document
    const classDoc = await Class.getOrCreateClass(hod.department, parseInt(year), section || null);

    // Update faculty
    faculty.isClassAdvisor = true;
    faculty.advisorFor = {
      department: hod.department,
      year: parseInt(year),
      section: section || null,
    };
    await faculty.save();

    // Update class document
    classDoc.advisorFacultyId = faculty._id;
    await classDoc.save();

    res.json({
      message: "Class advisor assigned successfully",
      faculty: {
        _id: faculty._id,
        name: faculty.userId?.name,
        empId: faculty.empId,
        advisorFor: faculty.advisorFor,
      },
      class: {
        _id: classDoc._id,
        department: classDoc.department,
        year: classDoc.year,
        section: classDoc.section,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/hod/remove-advisor/:facultyId - Remove class advisor assignment
export const removeClassAdvisor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { facultyId } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    if (faculty.department !== hod.department) {
      return res.status(403).json({ error: "Faculty not in your department" });
    }

    // Get the class info before removing
    const advisorInfo = faculty.advisorFor;

    // Update Class document to remove advisor
    if (advisorInfo) {
      await Class.findOneAndUpdate(
        { 
          department: advisorInfo.department, 
          year: advisorInfo.year, 
          section: advisorInfo.section 
        },
        { $set: { advisorFacultyId: null } }
      );
    }

    // Remove advisor assignment from faculty
    faculty.isClassAdvisor = false;
    faculty.advisorFor = undefined;
    await faculty.save();

    res.json({ 
      message: "Class advisor assignment removed",
      removedFrom: advisorInfo ? {
        department: advisorInfo.department,
        year: advisorInfo.year,
        section: advisorInfo.section,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/hod/unverified-marks - Get marks pending verification
export const getUnverifiedMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { semester, year } = req.query;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    // Get students in department
    const studentQuery = { department: hod.department, status: "active" };
    if (year) studentQuery.year = parseInt(year);

    const students = await Student.find(studentQuery).select("_id");
    const studentIds = students.map(s => s._id);

    // Get unverified marks
    const marksQuery = {
      studentId: { $in: studentIds },
      verifiedByHOD: false,
      status: "submitted",
    };
    if (semester) marksQuery.semester = parseInt(semester);

    const marks = await Marks.find(marksQuery)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" },
      })
      .populate("courseId", "code name")
      .populate({
        path: "enteredBy",
        populate: { path: "userId", select: "name" },
      })
      .sort({ updatedAt: -1 })
      .limit(100);

    res.json({
      department: hod.department,
      unverifiedCount: marks.length,
      marks: marks.map(m => ({
        _id: m._id,
        student: {
          _id: m.studentId?._id,
          name: m.studentId?.userId?.name,
          rollNumber: m.studentId?.rollNumber,
          year: m.studentId?.year,
          section: m.studentId?.section,
        },
        course: m.courseId ? {
          _id: m.courseId._id,
          code: m.courseId.code,
          name: m.courseId.name,
        } : null,
        semester: m.semester,
        internal1: m.internal1,
        internal2: m.internal2,
        modelExam: m.modelExam,
        finalExam: m.finalExam,
        total: m.total,
        grade: m.grade,
        enteredBy: m.enteredBy?.userId?.name,
        updatedAt: m.updatedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/verify-marks/:id - Verify marks entry
export const verifyMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    const marks = await Marks.findById(id).populate("studentId");
    if (!marks) {
      return res.status(404).json({ error: "Marks entry not found" });
    }

    // Verify student is in HOD's department
    if (marks.studentId?.department !== hod.department) {
      return res.status(403).json({ error: "Marks not from your department" });
    }

    marks.verifiedByHOD = true;
    marks.verifiedAt = new Date();
    marks.verifiedBy = hod._id;
    marks.status = "verified";
    await marks.save();

    res.json({
      message: "Marks verified successfully",
      marksId: marks._id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/verify-marks-bulk - Bulk verify marks
export const bulkVerifyMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { marksIds } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    if (!marksIds || !Array.isArray(marksIds) || marksIds.length === 0) {
      return res.status(400).json({ error: "marksIds array is required" });
    }

    // Verify all marks belong to HOD's department
    const marks = await Marks.find({ _id: { $in: marksIds } }).populate("studentId");
    const validIds = marks
      .filter(m => m.studentId?.department === hod.department)
      .map(m => m._id);

    const result = await Marks.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          verifiedByHOD: true,
          verifiedAt: new Date(),
          verifiedBy: hod._id,
          status: "verified",
        },
      }
    );

    res.json({
      message: `${result.modifiedCount} marks entries verified`,
      verified: result.modifiedCount,
      skipped: marksIds.length - validIds.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/hod/lock-semester - Lock marks for a semester
export const lockSemesterMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { semester, year, section } = req.body;

    const hod = await HOD.findOne({ userId });
    if (!hod) {
      return res.status(404).json({ error: "HOD profile not found" });
    }

    if (!semester) {
      return res.status(400).json({ error: "semester is required" });
    }

    // Get students in the class
    const studentQuery = { department: hod.department, status: "active" };
    if (year) studentQuery.year = parseInt(year);
    if (section) studentQuery.section = section;

    const students = await Student.find(studentQuery).select("_id");
    const studentIds = students.map(s => s._id);

    // Lock all verified marks for these students in this semester
    const result = await Marks.updateMany(
      {
        studentId: { $in: studentIds },
        semester: parseInt(semester),
        status: "verified",
      },
      {
        $set: {
          isLocked: true,
          lockedAt: new Date(),
          status: "locked",
        },
      }
    );

    res.json({
      message: `Semester ${semester} marks locked`,
      lockedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};