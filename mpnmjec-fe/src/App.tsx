import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Auth
import LoginPage from "../src/components/auth/LoginPage";
// import RegisterPage from "../src/components/auth/RegisterPage"; // DISABLED: Public registration not allowed
import ForgotPasswordFlow from '../src/components/auth/ForgotPasswordFlow';
import ProtectedRoute from './routes/ProtectedRoute';

// Student
import StudentDashboard from '../src/components/student/StudentDashboard';
import StudentProfile from '../src/components/student/StudentProfile';
import StudentAcademics from '../src/components/student/StudentAcademics';
import StudentAttendance from '../src/components/student/StudentAttendance';
import StudentFees from '../src/components/student/StudentFees';
import StudentCertificates from '../src/components/student/StudentCertificates';
import StudentMaterials from '../src/components/student/StudentMaterials';
import StudentAssignments from '../src/components/student/StudentAssignments';
import StudentCirculars from '../src/components/student/StudentCirculars';
import StudentReceipt from '../src/components/student/StudentReceipt';
import StudentLeave from '../src/components/student/StudentLeave';

// Faculty
import FacultyDashboard from '../src/components/faculty/FacultyDashboard';
import FacultyStudents from '../src/components/faculty/FacultyStudents';
import FacultyCourses from '../src/components/faculty/FacultyCourses';
import FacultyMaterials from '../src/components/faculty/FacultyMaterials';
import FacultyAttendance from '../src/components/faculty/FacultyAttendance';
import FacultyMarksEntry from '../src/components/faculty/FacultyMarksEntry';
import FacultyAdvisorClass from '../src/components/faculty/FacultyAdvisorClass';
import FacultyLeave from '../src/components/faculty/FacultyLeave';
import FacultyResultAnalysis from '../src/components/faculty/FacultyResultAnalysis';

// Admin
import AdminDashboard from '../src/components/admin/AdminDashboard';
import AdminStudents from '../src/components/admin/AdminStudents';
import AdminFaculty from '../src/components/admin/AdminFaculty';
import AdminHOD from '../src/components/admin/AdminHOD';
import AdminPrincipal from '../src/components/admin/AdminPrincipal';
import AdminFees from '../src/components/admin/AdminFees';
import AdminCertificates from '../src/components/admin/AdminCertificates';
import AdminLibrarian from '../src/components/admin/AdminLibrarian';

// HOD
import HODDashboard from '../src/components/hod/HODDashboard';
import HODFaculty from '../src/components/hod/HODFaculty';
import HODStudents from '../src/components/hod/HODStudents';
import HODAnalytics from '../src/components/hod/HODAnalytics';
import HODReports from '../src/components/hod/HODReports';
import HODLeave from '../src/components/hod/HODLeave';
import HODResultAnalysis from '../src/components/hod/HODResultAnalysis';

// Principal
import PrincipalDashboard from '../src/components/principal/PrincipalDashboard';
import PrincipalApprovals from '../src/components/principal/PrincipalApprovals';
import PrincipalReports from '../src/components/principal/PrincipalReports';
import PrincipalDepartments from '../src/components/principal/PrincipalDepartments';
import PrincipalAchievements from '../src/components/principal/PrincipalAchievements';
import PrincipalLeaveApprovals from '../src/components/principal/PrincipalLeaveApprovals';
import PrincipalResultAnalysis from '../src/components/principal/PrincipalResultAnalysis';

// Library
import LibraryDashboard from '../src/components/library/LibraryDashboard';
import LibraryBooks from '../src/components/library/LibraryBooks';
import LibraryStudents from '../src/components/library/LibraryStudents';
import LibraryTransactions from '../src/components/library/LibraryTransactions';


export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <Routes>
          {/* Auth */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordFlow />} />
          {/* DISABLED: Public registration - redirect to login */}
          <Route path="/register" element={<Navigate to="/" replace />} />
          
          {/* Student Routes - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/academics" element={<StudentAcademics />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/fees" element={<StudentFees />} />
            <Route path="/student/certificates" element={<StudentCertificates />} />
            <Route path="/student/materials" element={<StudentMaterials />} />
            <Route path="/student/assignments" element={<StudentAssignments />} />
            <Route path="/student/circulars" element={<StudentCirculars />} />
            <Route path="/student/receipt/:id" element={<StudentReceipt />} />
            <Route path="/student/leave" element={<StudentLeave />} />
          </Route>
          
          {/* Faculty Routes - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/students" element={<FacultyStudents />} />
            <Route path="/faculty/courses" element={<FacultyCourses />} />
            <Route path="/faculty/attendance" element={<FacultyAttendance />} />
            <Route path="/faculty/materials" element={<FacultyMaterials />} />
            <Route path="/faculty/marks" element={<FacultyMarksEntry />} />
            <Route path="/faculty/advisor/class" element={<FacultyAdvisorClass />} />
            <Route path="/faculty/leave" element={<FacultyLeave />} />
            <Route path="/faculty/result-analysis" element={<FacultyResultAnalysis />} />
          </Route>
          
          {/* Admin Routes - Protected (admin and superUser) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'superUser']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/faculty" element={<AdminFaculty />} />
            <Route path="/admin/hod" element={<AdminHOD />} />
            <Route path="/admin/principal" element={<AdminPrincipal />} />
            <Route path="/admin/librarian" element={<AdminLibrarian />} />
            <Route path="/admin/fees" element={<AdminFees />} />
            <Route path="/admin/certificates" element={<AdminCertificates />} />
          </Route>
          
          {/* HOD Routes - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['hod']} />}>
            <Route path="/hod/dashboard" element={<HODDashboard />} />
            <Route path="/hod/faculty" element={<HODFaculty />} />
            <Route path="/hod/students" element={<HODStudents />} />
            <Route path="/hod/analytics" element={<HODAnalytics />} />
            <Route path="/hod/reports" element={<HODReports />} />
            <Route path="/hod/leave" element={<HODLeave />} />
            <Route path="/hod/result-analysis" element={<HODResultAnalysis />} />
          </Route>
          
          {/* Principal Routes - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['principal']} />}>
            <Route path="/principal/dashboard" element={<PrincipalDashboard />} />
            <Route path="/principal/approvals" element={<PrincipalApprovals />} />
            <Route path="/principal/leave-approvals" element={<PrincipalLeaveApprovals />} />
            <Route path="/principal/reports" element={<PrincipalReports />} />
            <Route path="/principal/departments" element={<PrincipalDepartments />} />
            <Route path="/principal/achievements" element={<PrincipalAchievements />} />
            <Route path="/principal/result-analysis" element={<PrincipalResultAnalysis />} />
          </Route>

          {/* Library Routes - Protected (librarian only) */}
          <Route element={<ProtectedRoute allowedRoles={['librarian']} />}>
            <Route path="/library/dashboard" element={<LibraryDashboard />} />
            <Route path="/library/books" element={<LibraryBooks />} />
            <Route path="/library/students" element={<LibraryStudents />} />
            <Route path="/library/transactions" element={<LibraryTransactions />} />
          </Route>

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}
