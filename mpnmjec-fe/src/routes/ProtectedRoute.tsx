import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAccessToken } from "../utils/token";

// Decode JWT payload (without verification - verification is done server-side)
const decodeToken = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

// Role hierarchy for access control
const ROLE_HIERARCHY: Record<string, number> = {
  student: 1,
  faculty: 2,
  librarian: 2,
  hod: 3,
  principal: 4,
  admin: 5,
  superUser: 6,
};

// Map of routes to allowed roles
const ROUTE_ROLES: Record<string, string[]> = {
  '/student': ['student'],
  '/faculty': ['faculty'],
  '/hod': ['hod'],
  '/principal': ['principal'],
  '/admin': ['admin', 'superUser'],
  '/library': ['librarian'],
};

// Get the role redirect path
const getRoleRedirectPath = (role: string): string => {
  switch (role) {
    case 'student': return '/student/dashboard';
    case 'faculty': return '/faculty/dashboard';
    case 'hod': return '/hod/dashboard';
    case 'principal': return '/principal/dashboard';
    case 'admin': return '/admin/dashboard';
    case 'librarian': return '/library/dashboard';
    case 'superUser': return '/admin/dashboard';
    default: return '/';
  }
};

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const token = getAccessToken();
  const location = useLocation();

  // No token - redirect to login
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return <Navigate to="/" replace />;
  }

  const userRole = decoded.role;

  // SuperUser can access everything
  if (userRole === 'superUser') {
    return <Outlet />;
  }

  // If specific roles are required, check against them
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      // Redirect to user's appropriate dashboard
      return <Navigate to={getRoleRedirectPath(userRole)} replace />;
    }
  }

  // Check route-based access
  const currentPath = location.pathname;
  for (const [routePrefix, roles] of Object.entries(ROUTE_ROLES)) {
    if (currentPath.startsWith(routePrefix)) {
      if (!roles.includes(userRole)) {
        // Redirect to user's appropriate dashboard
        return <Navigate to={getRoleRedirectPath(userRole)} replace />;
      }
      break;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;

// Helper hook to get current user role from token
export const useUserRole = (): string | null => {
  const token = getAccessToken();
  if (!token) return null;
  
  const decoded = decodeToken(token);
  return decoded?.role || null;
};

// Helper to check if current user has minimum role level
export const hasMinRole = (minRole: string): boolean => {
  const token = getAccessToken();
  if (!token) return false;
  
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  // SuperUser always passes
  if (decoded.role === 'superUser') return true;
  
  const userLevel = ROLE_HIERARCHY[decoded.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
  
  return userLevel >= requiredLevel;
};
