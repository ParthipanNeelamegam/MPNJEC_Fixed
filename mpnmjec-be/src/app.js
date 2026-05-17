import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import { rateLimit } from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import studentDashboardRoutes from "./routes/student.dashboard.routes.js";
import studentModuleRoutes from "./routes/student.module.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import hodRoutes from "./routes/hod.routes.js";
import principalRoutes from "./routes/principal.routes.js";
import superuserRoutes from "./routes/superuser.routes.js";
import advisorRoutes from "./routes/advisor.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import resultAnalysisRoutes from "./routes/resultAnalysis.routes.js";
import libraryRoutes from "./routes/library.routes.js";

const app = express();

// Trust proxy — required for Render.com / cloud deployments
// Fixes: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from express-rate-limit
app.set('trust proxy', 1);

// Rate limiting — protect login from brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
});

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      "http://localhost:5173",
      "https://mpnmjecservices.netlify.app",
      process.env.CLIENT_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use("/api/auth", authLimiter, authRoutes);

// Serve uploaded materials statically
app.use('/uploads/materials', express.static(path.join(process.cwd(), 'uploads', 'materials')));

// Student routes
app.use("/api/student", studentDashboardRoutes);
app.use("/api/student", studentModuleRoutes);

// Faculty routes
app.use("/api/faculty", facultyRoutes);

// Class Advisor routes (Faculty with advisor privileges)
app.use("/api/advisor", advisorRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// HOD routes
app.use("/api/hod", hodRoutes);

// Principal routes
app.use("/api/principal", principalRoutes);

// Super User routes (Admin management)
app.use("/api/superuser", superuserRoutes);

// Leave routes (multi-role)
app.use("/api/leave", leaveRoutes);

// Result Analysis routes (multi-role)
app.use("/api/result-analysis", resultAnalysisRoutes);

// Library routes (librarian only)
app.use("/api/library", libraryRoutes);


export default app;