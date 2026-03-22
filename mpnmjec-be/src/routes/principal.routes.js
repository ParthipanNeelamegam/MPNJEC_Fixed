import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  getDashboardStats,
  getApprovalsSummary,
  getDepartments,
  getApprovals,
  updateApproval,
  getAchievements,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getReports,
  generateReport,
  getReportById,
  // Result Analysis
  getFinalAnalysis,
  getClassAnalysis,
  getSemesterTrends,
  getYearComparison,
} from "../controllers/principal.controller.js";

const router = express.Router();

// All routes require principal authentication
router.use(authenticate);
router.use(authorizeRoles("principal", "admin", "superUser"));

// Dashboard
router.get("/dashboard/stats", getDashboardStats);
router.get("/approvals/summary", getApprovalsSummary);

// Departments
router.get("/departments", getDepartments);

// Approvals
router.get("/approvals", getApprovals);
router.put("/approvals/:id", updateApproval);

// Achievements
router.get("/achievements", getAchievements);
router.post("/achievements", addAchievement);
router.put("/achievements/:id", updateAchievement);
router.delete("/achievements/:id", deleteAchievement);

// Reports
router.get("/reports", getReports);
router.post("/reports", generateReport);
router.get("/reports/:id", getReportById);

// ========================
// RESULT ANALYSIS (Read-Only)
// ========================
router.get("/final-analysis", getFinalAnalysis);
router.get("/class-analysis", getClassAnalysis);
router.get("/semester-trends", getSemesterTrends);
router.get("/year-comparison", getYearComparison);

export default router;
