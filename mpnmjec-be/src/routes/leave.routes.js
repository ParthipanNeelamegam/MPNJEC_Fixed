import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  applyLeave,
  getMyLeaveRequests,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getLeaveDetails,
  getAllLeaves,
  getLeaveStats,
} from "../controllers/leave.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Apply for leave (student, faculty, hod)
router.post("/apply", authorizeRoles("student", "faculty", "hod"), applyLeave);

// Get my leave requests (any authenticated user)
router.get("/my-requests", authorizeRoles("student", "faculty", "hod"), getMyLeaveRequests);

// Get pending leave requests (role-based filtering)
router.get("/pending", authorizeRoles("faculty", "hod", "principal"), getPendingLeaves);

// Approve leave (class advisor, hod, principal)
router.put("/approve/:id", authorizeRoles("faculty", "hod", "principal"), approveLeave);

// Reject leave (class advisor, hod, principal)
router.put("/reject/:id", authorizeRoles("faculty", "hod", "principal"), rejectLeave);

// Get leave details
router.get("/details/:id", getLeaveDetails);

// Get all leaves (hod for own department, admin/principal for all)
router.get("/all", authorizeRoles("hod", "principal", "admin", "superUser"), getAllLeaves);

// Get leave stats
router.get("/stats", authorizeRoles("faculty", "hod", "principal", "admin", "superUser"), getLeaveStats);

export default router;
