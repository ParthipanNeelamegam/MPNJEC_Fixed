import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  requireClassAdvisor,
  getAdvisorProfile,
  getAdvisorStudents,
  getStudentDetails,
  getAdvisorCourses,
  addOrUpdateMarks,
  bulkAddMarks,
  getMarks,
  getResultAnalysis,
  getSemesterComparison,
} from "../controllers/advisor.controller.js";

const router = express.Router();

// All routes require faculty authentication
router.use(authenticate);
router.use(authorizeRoles("faculty"));

// Class advisor middleware - validates faculty is a class advisor
router.use(requireClassAdvisor);

// ========================
// ADVISOR PROFILE
// ========================
router.get("/profile", getAdvisorProfile);

// ========================
// STUDENT MANAGEMENT
// ========================
router.get("/students", getAdvisorStudents);
router.get("/student/:id", getStudentDetails);

// ========================
// COURSES
// ========================
router.get("/courses", getAdvisorCourses);

// ========================
// MARKS MANAGEMENT
// ========================
router.get("/marks", getMarks);
router.post("/marks", addOrUpdateMarks);
router.post("/marks/bulk", bulkAddMarks);

// ========================
// RESULT ANALYSIS
// ========================
router.get("/result-analysis", getResultAnalysis);
router.get("/semester-comparison", getSemesterComparison);

export default router;
