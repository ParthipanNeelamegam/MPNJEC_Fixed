import { verifyAccessToken } from "../utils/token.js";

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  student: 1,
  faculty: 2,
  librarian: 2,
  hod: 3,
  principal: 4,
  admin: 5,
  superUser: 6,
};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Check if user has one of the specified roles
// SuperUser always passes
export const authorizeRoles = (...roles) => (req, res, next) => {
  // SuperUser bypasses all role restrictions
  if (req.user.role === "superUser") {
    return next();
  }
  
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  }
  next();
};

// Check if user has minimum role level
// SuperUser always passes
export const requireMinRole = (minRole) => (req, res, next) => {
  // SuperUser bypasses all role restrictions
  if (req.user.role === "superUser") {
    return next();
  }
  
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
  
  if (userLevel < requiredLevel) {
    return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  }
  next();
};

// Check if user is SuperUser only
export const requireSuperUser = (req, res, next) => {
  if (req.user.role !== "superUser") {
    return res.status(403).json({ message: "Forbidden: Super User access required" });
  }
  next();
};

// Check if user can create a specific role
export const canCreateRole = (targetRole) => (req, res, next) => {
  const userRole = req.user.role;
  
  // SuperUser can create any role
  if (userRole === "superUser") {
    return next();
  }
  
  // Admin can create student, faculty, hod, principal, librarian (but NOT admin)
  if (userRole === "admin") {
    const allowedRoles = ["student", "faculty", "hod", "principal", "librarian"];
    if (allowedRoles.includes(targetRole)) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden: Admins cannot create other admins" });
  }
  
  // Other roles cannot create users
  return res.status(403).json({ message: "Forbidden: You cannot create users" });
};
