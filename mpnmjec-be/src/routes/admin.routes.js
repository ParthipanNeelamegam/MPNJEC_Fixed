import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  createFaculty,
  getFaculty,
  updateFaculty,
  deleteFaculty,
  assignCoursesToFaculty,
  removeCourseFromFaculty,
  createCourse,
  getCourses,
  updateCourse,
  createHOD,
  getHODs,
  updateHOD,
  deleteHOD,
  createPrincipal,
  getPrincipal,
  updatePrincipal,
  deletePrincipal,
  getAllUsers,
  getUserById,
  getDashboardStats,
  getDashboardChartData,
  getFeeRecords,
  getFeeSummary,
  createFeeRecord,
  updateFeeRecord,
  recordPayment,
  getCertificateRequests,
  updateCertificateStatus,
  getCertificateStats,
  createLibrarian,
  getLibrarians,
  updateLibrarian,
  deleteLibrarian,
} from "../controllers/admin.controller.js";

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorizeRoles("admin", "superUser"));

// Dashboard routes
router.get("/dashboard/stats", getDashboardStats);
router.get("/dashboard/chart-data", getDashboardChartData);

// Student routes
router.post("/students", createStudent);
router.get("/students", getStudents);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);

// Faculty routes
router.post("/faculty", createFaculty);
router.get("/faculty", getFaculty);
router.put("/faculty/:id", updateFaculty);
router.delete("/faculty/:id", deleteFaculty);
router.post("/faculty/:id/assign-courses", assignCoursesToFaculty);
router.delete("/faculty/:facultyId/courses/:courseId", removeCourseFromFaculty);

// Course routes
router.post("/courses", createCourse);
router.get("/courses", getCourses);
router.put("/courses/:id", updateCourse);

// HOD routes
router.post("/hod", createHOD);
router.get("/hod", getHODs);
router.put("/hod/:id", updateHOD);
router.delete("/hod/:id", deleteHOD);

// Principal routes
router.post("/principal", createPrincipal);
router.get("/principal", getPrincipal);
router.put("/principal/:id", updatePrincipal);
router.delete("/principal/:id", deletePrincipal);

// Librarian routes
router.post("/librarian", createLibrarian);
router.get("/librarian", getLibrarians);
router.put("/librarian/:id", updateLibrarian);
router.delete("/librarian/:id", deleteLibrarian);

// Fee management routes
router.get("/fees", getFeeRecords);
router.get("/fees/summary", getFeeSummary);
router.post("/fees", createFeeRecord);
router.put("/fees/:id", updateFeeRecord);
router.post("/fees/:id/payment", recordPayment);

// Certificate management routes
router.get("/certificates", getCertificateRequests);
router.get("/certificates/stats", getCertificateStats);
router.put("/certificates/:id", updateCertificateStatus);

// User management routes
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);

export default router;
