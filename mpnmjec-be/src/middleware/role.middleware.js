// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  student: 1,
  faculty: 2,
  librarian: 2,
  hod: 3,
  principal: 4,
  admin: 5,
  superUser: 6,
};

// Roles that Admin can create
export const ADMIN_CREATABLE_ROLES = ["student", "faculty", "hod", "principal", "librarian"];

// Roles that only SuperUser can create
export const SUPERUSER_ONLY_ROLES = ["admin", "superUser"];

// Resource access permissions
export const RESOURCE_PERMISSIONS = {
  // Marks: who can edit marks
  marks: {
    canEdit: ["faculty", "hod", "superUser"], // Admin cannot edit marks
    canView: ["faculty", "hod", "principal", "admin", "superUser"],
    canVerify: ["hod", "principal", "superUser"],
    canLock: ["hod", "principal", "superUser"],
  },
  // Analysis: deep analysis access
  analysis: {
    canViewDeep: ["hod", "principal", "superUser"], // Faculty cannot access deep analysis
    canViewBasic: ["faculty", "hod", "principal", "admin", "superUser"],
  },
  // Timetable: who can manage timetable
  timetable: {
    canCreate: ["hod", "admin", "superUser"],
    canEdit: ["hod", "admin", "superUser"],
    canDelete: ["hod", "admin", "superUser"],
    canView: ["student", "faculty", "hod", "principal", "admin", "superUser"],
  },
  // Student data
  studentData: {
    canViewOwn: ["student"],
    canViewDepartment: ["hod"],
    canViewAll: ["principal", "admin", "superUser"],
  },
};

export const allowRoles = (...roles) => {
  return (req, res, next) => {
    // SuperUser bypasses all role restrictions
    if (req.user.role === "superUser") {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// Check if user has permission for specific resource action
export const checkResourcePermission = (resource, action) => {
  return (req, res, next) => {
    // SuperUser bypasses all restrictions
    if (req.user.role === "superUser") {
      return next();
    }

    const permissions = RESOURCE_PERMISSIONS[resource];
    if (!permissions) {
      return res.status(500).json({ message: "Invalid resource configuration" });
    }

    const allowedRoles = permissions[action];
    if (!allowedRoles) {
      return res.status(500).json({ message: "Invalid action configuration" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied: ${req.user.role} cannot ${action} ${resource}` 
      });
    }

    next();
  };
};

// Validate department access (HOD can only access their department)
export const validateDepartmentAccess = (getDepartmentFn) => {
  return async (req, res, next) => {
    // SuperUser and Principal can access all departments
    if (req.user.role === "superUser" || req.user.role === "principal") {
      return next();
    }

    try {
      // Get the target department from the request or resource
      const targetDepartment = await getDepartmentFn(req);
      
      if (!targetDepartment) {
        return next(); // No department restriction
      }

      // For HOD, verify they belong to the target department
      if (req.user.role === "hod" && req.hodDepartment) {
        if (req.hodDepartment.toLowerCase() !== targetDepartment.toLowerCase()) {
          return res.status(403).json({ 
            message: "Access denied - resource not in your department" 
          });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ message: "Error validating department access" });
    }
  };
};

// Validate that a target role can be created by the current user
export const validateRoleCreation = (targetRole, userRole) => {
  // SuperUser can create any role
  if (userRole === "superUser") {
    return { valid: true };
  }
  
  // Admin can create student, faculty, hod, principal
  if (userRole === "admin") {
    if (ADMIN_CREATABLE_ROLES.includes(targetRole)) {
      return { valid: true };
    }
    return { valid: false, message: "Admins cannot create admin or superUser accounts" };
  }
  
  // Other roles cannot create users
  return { valid: false, message: "You do not have permission to create users" };
};

// Check if user can edit marks (Admin cannot)
export const canEditMarks = (req, res, next) => {
  if (req.user.role === "superUser") {
    return next();
  }
  
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admins cannot edit marks" });
  }
  
  if (!RESOURCE_PERMISSIONS.marks.canEdit.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to edit marks" });
  }
  
  next();
};

// Check if user can access deep analysis (Faculty cannot)
export const canAccessDeepAnalysis = (req, res, next) => {
  if (req.user.role === "superUser") {
    return next();
  }
  
  if (!RESOURCE_PERMISSIONS.analysis.canViewDeep.includes(req.user.role)) {
    return res.status(403).json({ 
      message: "Deep analysis is only available to HOD, Principal, and SuperUser" 
    });
  }
  
  next();
};
