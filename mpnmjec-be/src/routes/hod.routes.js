import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  getDepartmentFaculty,
  getDepartmentStudents,
  getStudentDeepView,
  getFacultyDetails,
  getFacultySchedule,
  getAttendanceForReview,
  updateAttendance,
  getLeaveRequests,
  updateLeave,
  getDepartmentStats,
  getAttendanceSummary,
  getAttendanceAnalytics,
  getPerformanceAnalytics,
  getWorkloadAnalytics,
  getSubjectAnalytics,
  getReports,
  generateReport,
  getReportById,
  getFacultyWorkload,
  getFacultyList,
  getSubjectsList,
  getClassesList,
  getTimetable,
  getTimetableById,
  saveTimetable,
  updateTimetable,
  deleteTimetable,
  getTodaySchedule,
  getDepartmentCourses,
  createDepartmentCourse,
  updateDepartmentCourse,
  assignCoursesToFaculty,
  removeCourseFromFaculty,
  // Scheduling Engine
  createScheduleEntry,
  getDepartmentSchedule,
  deleteScheduleEntry,
  updateScheduleEntry,
  getFacultyAvailability,
  addSecondaryDepartment,
  removeSecondaryDepartment,
  // Marks Analysis & Verification
  getDepartmentAnalysis,
  getFullDepartmentAnalysis,
  getClassAdvisors,
  assignClassAdvisor,
  removeClassAdvisor,
  getUnverifiedMarks,
  verifyMarks,
  bulkVerifyMarks,
  lockSemesterMarks,
} from "../controllers/hod.controller.js";

const router = express.Router();

// All routes require HOD authentication
router.use(authenticate);
router.use(authorizeRoles("hod"));

// Dashboard
router.get("/stats", getDepartmentStats);

// Department users
router.get("/faculty", getDepartmentFaculty);
router.get("/faculty/:id", getFacultyDetails);
router.get("/faculty/:id/schedule", getFacultySchedule);
router.get("/students", getDepartmentStudents);
router.get("/student/:id", getStudentDeepView);

// Course management
router.get("/courses", getDepartmentCourses);
router.post("/courses", createDepartmentCourse);
router.put("/courses/:id", updateDepartmentCourse);

// Faculty course assignment
router.post("/faculty/:id/assign-courses", assignCoursesToFaculty);
router.delete("/faculty/:facultyId/courses/:courseId", removeCourseFromFaculty);

// Faculty workload & timetable
router.get("/faculty-workload", getFacultyWorkload);
router.get("/faculty-list", getFacultyList);
router.get("/subjects", getSubjectsList);
router.get("/classes", getClassesList);

// Timetable CRUD (Multi-Year/Section)
router.get("/timetable", getTimetable);
router.get("/timetable/today", getTodaySchedule);
router.get("/timetable/:id", getTimetableById);
router.post("/timetable", saveTimetable);
router.put("/timetable/:id", updateTimetable);
router.delete("/timetable/:id", deleteTimetable);

// ========================
// SCHEDULING ENGINE (Conflict-Free)
// ========================
// Schedule management
router.get("/schedule", getDepartmentSchedule);
router.post("/schedule", createScheduleEntry);
router.put("/schedule/:id", updateScheduleEntry);
router.delete("/schedule/:id", deleteScheduleEntry);

// Faculty availability (for conflict detection)
router.get("/faculty-availability", getFacultyAvailability);

// Cross-department faculty permissions
router.post("/faculty/:id/secondary-departments", addSecondaryDepartment);
router.delete("/faculty/:id/secondary-departments/:dept", removeSecondaryDepartment);

// Attendance review
router.get("/attendance", getAttendanceForReview);
router.put("/attendance/:id", updateAttendance);
router.get("/attendance-summary", getAttendanceSummary);

// Leave review
router.get("/leave", getLeaveRequests);
router.put("/leave/:id", updateLeave);

// Analytics
router.get("/analytics/attendance", getAttendanceAnalytics);
router.get("/analytics/performance", getPerformanceAnalytics);
router.get("/analytics/workload", getWorkloadAnalytics);
router.get("/analytics/subjects", getSubjectAnalytics);

// Reports
router.get("/reports", getReports);
router.post("/reports", generateReport);
router.get("/reports/:id", getReportById);

// ========================
// MARKS ANALYSIS & VERIFICATION
// ========================
// Result analysis
router.get("/analysis", getDepartmentAnalysis);
router.get("/analysis/full", getFullDepartmentAnalysis);

// Class advisors management
router.get("/class-advisors", getClassAdvisors);
router.put("/assign-advisor", assignClassAdvisor);
router.delete("/remove-advisor/:facultyId", removeClassAdvisor);

// Marks verification
router.get("/unverified-marks", getUnverifiedMarks);
router.put("/verify-marks/:id", verifyMarks);
router.put("/verify-marks-bulk", bulkVerifyMarks);
router.put("/lock-semester", lockSemesterMarks);

export default router;
