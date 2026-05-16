import express from "express";
import { getStudentDashboardSummary, getStudentNotifications } from "../controllers/student.dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard/summary", authenticate, getStudentDashboardSummary);

router.get("/notifications", authenticate, getStudentNotifications);

// Stub: performance not yet implemented
router.get("/performance", authenticate, (req, res) => {
  res.json({ performance: {} });
});

export default router;
