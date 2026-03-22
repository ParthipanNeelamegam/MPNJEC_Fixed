import express from "express";
import { authenticate, requireSuperUser } from "../middleware/auth.middleware.js";
import {
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword,
} from "../controllers/superuser.controller.js";

const router = express.Router();

// All routes require SuperUser authentication
router.use(authenticate);
router.use(requireSuperUser);

// Admin management routes (SuperUser only)
router.post("/admin", createAdmin);
router.get("/admins", getAdmins);
router.put("/admin/:id", updateAdmin);
router.delete("/admin/:id", deleteAdmin);
router.post("/admin/:id/reset-password", resetAdminPassword);

export default router;
