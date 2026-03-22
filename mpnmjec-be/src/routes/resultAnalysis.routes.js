import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  getCompletionStatus,
  getDetailedAnalysis,
  getSemiDetailedAnalysis,
  getOverviewAnalysis,
} from "../controllers/resultAnalysis.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Completion status - faculty (class advisor), HOD, principal
router.get(
  "/completion-status",
  authorizeRoles("faculty", "hod", "principal", "admin", "superUser"),
  getCompletionStatus
);

// Detailed analysis - faculty (class advisor), HOD only
router.get(
  "/detailed",
  authorizeRoles("faculty", "hod"),
  getDetailedAnalysis
);

// Semi-detailed analysis - faculty (class advisor), HOD only
router.get(
  "/semi-detailed",
  authorizeRoles("faculty", "hod"),
  getSemiDetailedAnalysis
);

// Overview analysis - faculty (class advisor), HOD, principal
router.get(
  "/overview",
  authorizeRoles("faculty", "hod", "principal", "admin", "superUser"),
  getOverviewAnalysis
);

export default router;
