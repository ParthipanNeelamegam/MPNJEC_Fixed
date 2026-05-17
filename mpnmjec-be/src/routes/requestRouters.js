import express from "express";
const router = express.Router();

import {
  sendRequest,
  getRequestsForHod,
  approveRequest,
  rejectRequest,
  viewApprovedTimetable,
  submitFreePeriods // ✅ ADD THIS
} from "../controllers/requestController.js";

// Send request
router.post("/send-request", sendRequest);

// Get requests for specific HOD
router.get("/requests/:toHod", getRequestsForHod);

// View approved timetable
router.get("/view-approved/:id", viewApprovedTimetable);

// Approve request
router.put("/approve/:id", approveRequest);

// Reject request
router.put("/reject/:id", rejectRequest);

// ✅ ADD THIS NEW ROUTE
router.post("/free-periods/:id", submitFreePeriods);

export default router;