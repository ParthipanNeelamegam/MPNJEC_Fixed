import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  getCurrentPeriodInfo,
  getFacultyCourses,
  getMyCourses,
  takeAttendance,
  getAttendance,
  getStudentsByCourse,
  getLeaveRequests,
  updateLeave,
  getFacultyDashboardStats,
  getTodaySchedule,
  getMaterials,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  getMarksForCourse,
  enterMarks,
  bulkEnterMarks,
} from "../controllers/faculty.controller.js";
import upload from '../middleware/materialUpload.js';

const router = express.Router();

// Period info (for attendance)
router.get("/current-period", authenticate, allowRoles("faculty", "hod"), getCurrentPeriodInfo);

// Dashboard routes
router.get("/dashboard/stats", authenticate, allowRoles("faculty", "hod"), getFacultyDashboardStats);
router.get("/timetable/today", authenticate, allowRoles("faculty", "hod"), getTodaySchedule);

// Course routes
router.get("/:id/courses", authenticate, allowRoles("faculty", "hod", "admin"), getFacultyCourses);
router.get("/my-courses", authenticate, allowRoles("faculty", "hod"), getMyCourses);

// Attendance routes
router.post("/attendance", authenticate, allowRoles("faculty", "hod"), takeAttendance);
router.get("/attendance", authenticate, allowRoles("faculty", "hod"), getAttendance);

// Student routes for attendance
router.get("/students", authenticate, allowRoles("faculty", "hod"), getStudentsByCourse);

// Leave routes
router.get("/leave", authenticate, allowRoles("faculty", "hod"), getLeaveRequests);
router.put("/leave/:id", authenticate, allowRoles("faculty", "hod"), updateLeave);

// Materials routes
router.get("/materials", authenticate, allowRoles("faculty", "hod"), getMaterials);
router.post("/materials", authenticate, allowRoles("faculty", "hod"), upload.single('file'), uploadMaterial);
router.put("/materials/:id", authenticate, allowRoles("faculty", "hod"), updateMaterial);
router.delete("/materials/:id", authenticate, allowRoles("faculty", "hod"), deleteMaterial);

// Marks routes
router.get("/marks", authenticate, allowRoles("faculty", "hod"), getMarksForCourse);
router.post("/marks", authenticate, allowRoles("faculty", "hod"), enterMarks);
router.post("/marks/bulk", authenticate, allowRoles("faculty", "hod"), bulkEnterMarks);

export default router;
