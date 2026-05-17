import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  getStudentProfile,
  updateStudentProfile,
  getStudentAcademics,
  getStudentAttendance,
  getStudentFeesSummary,
  getStudentFeesHistory,
  getFeeStructure,
  getFeeReceipt,
  downloadFeeReceipt,
  payStudentFees,
  applyLeave,
  getLeaves,
  getStudentMaterials,
  downloadMaterial,
  getCertificateTypes,
  getStudentCertificates,
  applyCertificate,
  requestBonafideCertificate,
  payCertificateFee,
  viewCertificate,
  downloadCertificate,
  getStudentLibraryCard,
} from "../controllers/student.module.controller.js";

const router = express.Router();

router.get("/profile", authenticate, getStudentProfile);
router.put("/profile", authenticate, updateStudentProfile);
router.get("/academics", authenticate, getStudentAcademics);
router.get("/attendance", authenticate, getStudentAttendance);
router.get("/fees/summary", authenticate, getStudentFeesSummary);
router.get("/fees/history", authenticate, getStudentFeesHistory);
router.get("/fees/structure", authenticate, getFeeStructure);
router.get("/fees/receipt/:id", authenticate, getFeeReceipt);
router.get('/fees/receipt/:id/download', authenticate, downloadFeeReceipt);
router.post("/fees/pay", authenticate, payStudentFees);

router.get("/library", authenticate, getStudentLibraryCard);

// Leave routes
router.post("/leave", authenticate, applyLeave);
router.get("/leave", authenticate, getLeaves);

// Materials routes
router.get("/materials", authenticate, getStudentMaterials);
router.post("/materials/:id/download", authenticate, downloadMaterial);

// Certificates routes
router.get("/certificates/types", authenticate, getCertificateTypes);
router.get("/certificates", authenticate, getStudentCertificates);
router.post("/certificates", authenticate, applyCertificate);
router.post("/certificates/request", authenticate, requestBonafideCertificate);
router.post("/certificates/:id/pay", authenticate, payCertificateFee);
router.get("/certificates/:certificateNumber/view", viewCertificate);
router.get("/certificates/:certificateNumber/download", downloadCertificate);

export default router;
