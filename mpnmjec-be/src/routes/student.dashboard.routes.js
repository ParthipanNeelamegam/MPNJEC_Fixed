import express from "express";
import { getStudentDashboardSummary } from "../controllers/student.dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard/summary", authenticate, getStudentDashboardSummary);

// Stub: notifications not yet implemented
router.get("/notifications", authenticate, (req, res) => {
  res.json({ notifications: [] });
});

// Stub: performance not yet implemented
router.get("/performance", authenticate, (req, res) => {
  res.json({ performance: {} });
});

export default router;