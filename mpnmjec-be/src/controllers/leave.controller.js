import LeaveRequest from "../models/LeaveRequest.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import HOD from "../models/HOD.js";
import Principal from "../models/Principal.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

// ========================
// HELPERS
// ========================

async function getApproverName(Model, profileId) {
  if (!profileId) return null;
  try {
    const profile = await Model.findById(profileId).populate('userId', 'name');
    return profile?.userId?.name || null;
  } catch {
    return null;
  }
}

async function enrichApproval(approval, Model) {
  if (!approval) return approval;
  const obj = approval.toObject ? approval.toObject() : { ...approval };
  if (obj.approvedBy) {
    obj.approverName = await getApproverName(Model, obj.approvedBy);
  }
  return obj;
}

async function getApplicantDetails(leave) {
  let details = {};
  if (leave.applicantRole === 'student') {
    const student = await Student.findById(leave.applicantId).populate('userId', 'name email');
    details = {
      name: student?.userId?.name,
      email: student?.userId?.email,
      rollNumber: student?.rollNumber,
      department: student?.department?.toUpperCase(),
      year: student?.year,
      section: student?.section,
    };
  } else if (leave.applicantRole === 'faculty') {
    const faculty = await Faculty.findById(leave.applicantId).populate('userId', 'name email');
    details = {
      name: faculty?.userId?.name,
      email: faculty?.userId?.email,
      empId: faculty?.empId,
      department: faculty?.department?.toUpperCase(),
      designation: faculty?.designation,
    };
  } else if (leave.applicantRole === 'hod') {
    const hod = await HOD.findById(leave.applicantId).populate('userId', 'name email');
    details = {
      name: hod?.userId?.name,
      email: hod?.userId?.email,
      department: hod?.department?.toUpperCase(),
    };
  }
  return details;
}

// ========================
// APPLY FOR LEAVE
// ========================

// POST /api/leave/apply
export const applyLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { leaveType, fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ error: "fromDate, toDate, and reason are required" });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from > to) {
      return res.status(400).json({ error: "fromDate cannot be after toDate" });
    }

    let applicantData = {};
    let applicantId = null;

    if (userRole === 'student') {
      const student = await Student.findOne({ userId }).populate('userId', 'name email');
      if (!student) return res.status(404).json({ error: "Student profile not found" });
      applicantData = {
        applicantId: student._id,
        applicantModel: 'Student',
        applicantRole: 'student',
        applicantUserId: userId,
        department: student.department,
        year: student.year,
        section: student.section,
      };
      applicantId = student._id;
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId }).populate('userId', 'name email');
      if (!faculty) return res.status(404).json({ error: "Faculty profile not found" });
      applicantData = {
        applicantId: faculty._id,
        applicantModel: 'Faculty',
        applicantRole: 'faculty',
        applicantUserId: userId,
        department: faculty.department,
      };
      applicantId = faculty._id;
    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId }).populate('userId', 'name email');
      if (!hod) return res.status(404).json({ error: "HOD profile not found" });
      applicantData = {
        applicantId: hod._id,
        applicantModel: 'HOD',
        applicantRole: 'hod',
        applicantUserId: userId,
        department: hod.department,
      };
      applicantId = hod._id;
    } else {
      return res.status(403).json({ error: "Only students, faculty, and HOD can apply for leave" });
    }

    // Check for overlapping leave requests
    const existingLeave = await LeaveRequest.findOne({
      applicantId,
      finalStatus: { $in: ['Pending', 'Approved'] },
      $or: [{ fromDate: { $lte: to }, toDate: { $gte: from } }]
    });

    if (existingLeave) {
      return res.status(400).json({
        error: "You already have a leave request for overlapping dates",
        existingLeave: {
          fromDate: existingLeave.fromDate,
          toDate: existingLeave.toDate,
          finalStatus: existingLeave.finalStatus
        }
      });
    }

    const leaveRequest = await LeaveRequest.create({
      ...applicantData,
      leaveType: leaveType || 'casual',
      fromDate: from,
      toDate: to,
      reason,
    });

    res.status(201).json({
      message: "Leave application submitted successfully",
      leaveRequest: {
        id: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
        reason: leaveRequest.reason,
        finalStatus: leaveRequest.finalStatus,
        facultyApproval: leaveRequest.facultyApproval,
        hodApproval: leaveRequest.hodApproval,
        principalApproval: leaveRequest.principalApproval,
        appliedAt: leaveRequest.appliedAt,
      }
    });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET MY LEAVE REQUESTS
// ========================

// GET /api/leave/my-requests
export const getMyLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;

    let applicantId = null;

    if (userRole === 'student') {
      const student = await Student.findOne({ userId });
      if (!student) return res.status(404).json({ error: "Student profile not found" });
      applicantId = student._id;
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId });
      if (!faculty) return res.status(404).json({ error: "Faculty profile not found" });
      applicantId = faculty._id;
    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (!hod) return res.status(404).json({ error: "HOD profile not found" });
      applicantId = hod._id;
    } else {
      return res.status(403).json({ error: "Invalid role for leave requests" });
    }

    const filter = { applicantId };
    if (status) filter.finalStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter).sort({ appliedAt: -1 }).skip(skip).limit(parseInt(limit)),
      LeaveRequest.countDocuments(filter)
    ]);

    const leavesWithDetails = await Promise.all(leaves.map(async (leave) => {
      const facultyApproval = await enrichApproval(leave.facultyApproval, Faculty);
      const hodApproval = await enrichApproval(leave.hodApproval, HOD);
      const principalApproval = await enrichApproval(leave.principalApproval, Principal);

      return {
        id: leave._id,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason,
        finalStatus: leave.finalStatus,
        applicantRole: leave.applicantRole,
        facultyApproval,
        hodApproval,
        principalApproval,
        appliedAt: leave.appliedAt,
      };
    }));

    res.json({
      leaves: leavesWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get my leaves error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET PENDING LEAVE REQUESTS (Role-based filtering)
// ========================

// GET /api/leave/pending
export const getPendingLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 20 } = req.query;

    let filter = {};
    let reviewerProfile = null;

    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId });
      if (!faculty) return res.status(404).json({ error: "Faculty profile not found" });

      if (!faculty.isClassAdvisor) {
        return res.json({ leaves: [], message: "You are not a class advisor" });
      }

      // Faculty (class advisor): student leaves from assigned class that are still Pending
      const advisorDept = faculty.advisorFor?.department || faculty.department;
      filter = {
        applicantRole: 'student',
        finalStatus: 'Pending',
        department: { $regex: new RegExp(`^${advisorDept}$`, 'i') },
        year: faculty.advisorFor?.year,
      };
      if (faculty.advisorFor?.section) {
        filter.section = faculty.advisorFor.section;
      }
      reviewerProfile = { type: 'faculty', id: faculty._id };

    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (!hod) return res.status(404).json({ error: "HOD profile not found" });

      // HOD: student + faculty leaves from dept that are still Pending
      filter = {
        department: { $regex: new RegExp(`^${hod.department}$`, 'i') },
        finalStatus: 'Pending',
        applicantRole: { $in: ['student', 'faculty'] }
      };
      reviewerProfile = { type: 'hod', id: hod._id };

    } else if (userRole === 'principal') {
      const principal = await Principal.findOne({ userId });
      if (!principal) return res.status(404).json({ error: "Principal profile not found" });

      // Principal: all leaves that are still Pending
      filter = {
        finalStatus: 'Pending',
      };
      reviewerProfile = { type: 'principal', id: principal._id };

    } else {
      return res.status(403).json({ error: "You don't have permission to view pending leaves" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('applicantUserId', 'name email'),
      LeaveRequest.countDocuments(filter)
    ]);

    const leavesWithDetails = await Promise.all(leaves.map(async (leave) => {
      const applicantDetails = await getApplicantDetails(leave);

      return {
        id: leave._id,
        applicantRole: leave.applicantRole,
        ...applicantDetails,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason,
        finalStatus: leave.finalStatus,
        facultyApproval: leave.facultyApproval,
        hodApproval: leave.hodApproval,
        principalApproval: leave.principalApproval,
        appliedAt: leave.appliedAt,
      };
    }));

    res.json({
      leaves: leavesWithDetails,
      reviewerProfile,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get pending leaves error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// APPROVE LEAVE
// ========================

// PUT /api/leave/approve/:id
export const approveLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const { remarks } = req.body;

    const leave = await LeaveRequest.findById(id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (leave.finalStatus !== 'Pending') {
      return res.status(400).json({ error: "This leave request has already been finalized" });
    }

    const now = new Date();

    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId });
      if (!faculty) return res.status(403).json({ error: "Faculty profile not found" });

      if (leave.applicantRole !== 'student') {
        return res.status(403).json({ error: "Faculty can only approve student leaves" });
      }

      // Verify faculty is assigned to this student's class
      const advisorDept = faculty.advisorFor?.department || faculty.department;
      const advisorYear = faculty.advisorFor?.year;
      const advisorSection = faculty.advisorFor?.section;

      if (advisorDept !== leave.department || advisorYear !== leave.year) {
        return res.status(403).json({ error: "You are not the assigned faculty for this student" });
      }
      if (advisorSection && advisorSection !== leave.section) {
        return res.status(403).json({ error: "You are not the assigned faculty for this student's section" });
      }

      // REQUIREMENT: Student leave → Class Advisor OR HOD OR Principal can approve (any one)
      // Just record this approver's decision — do NOT mark other blocks as N/A
      leave.facultyApproval = {
        status: 'Approved',
        approvedBy: faculty._id,
        approvedAt: now,
        remarks: remarks || undefined,
      };

    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (!hod) return res.status(404).json({ error: "HOD profile not found" });

      // REQUIREMENT: HOD can approve student + faculty leaves from their department
      if (!['student', 'faculty'].includes(leave.applicantRole)) {
        return res.status(403).json({ error: "HOD can only approve student and faculty leaves" });
      }
      if (hod.department?.toLowerCase() !== leave.department?.toLowerCase()) {
        return res.status(403).json({ error: "You can only approve leaves from your department" });
      }

      // REQUIREMENT: Faculty leave → HOD OR Principal (any one)
      //              Student leave → Class Advisor OR HOD OR Principal (any one)
      // Just record HOD's approval — no need to nullify other blocks
      leave.hodApproval = {
        status: 'Approved',
        approvedBy: hod._id,
        approvedAt: now,
        remarks: remarks || undefined,
      };

    } else if (userRole === 'principal') {
      const principal = await Principal.findOne({ userId });
      if (!principal) return res.status(404).json({ error: "Principal profile not found" });

      // REQUIREMENT: Principal can approve any leave (student, faculty, hod)
      leave.principalApproval = {
        status: 'Approved',
        approvedBy: principal._id,
        approvedAt: now,
        remarks: remarks || undefined,
      };

    } else {
      return res.status(403).json({ error: "You don't have permission to approve leaves" });
    }

    // Recalculate final status
    leave.recalculateFinalStatus();
    await leave.save();

    // If approved and applicant is student, mark attendance as leave
    if (leave.finalStatus === 'Approved' && leave.applicantRole === 'student') {
      await markAttendanceAsLeave(leave.applicantId, leave.fromDate, leave.toDate);
    }

    res.json({
      message: 'Leave approved successfully',
      leave: {
        id: leave._id,
        finalStatus: leave.finalStatus,
        facultyApproval: leave.facultyApproval,
        hodApproval: leave.hodApproval,
        principalApproval: leave.principalApproval,
      }
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// REJECT LEAVE
// ========================

// PUT /api/leave/reject/:id
export const rejectLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const { remarks } = req.body;

    const leave = await LeaveRequest.findById(id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (leave.finalStatus !== 'Pending') {
      return res.status(400).json({ error: "This leave request has already been finalized" });
    }

    const now = new Date();

    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId });
      if (!faculty) return res.status(403).json({ error: "Faculty profile not found" });

      if (leave.applicantRole !== 'student') {
        return res.status(403).json({ error: "Faculty can only reject student leaves" });
      }

      const advisorDept = faculty.advisorFor?.department || faculty.department;
      const advisorYear = faculty.advisorFor?.year;
      const advisorSection = faculty.advisorFor?.section;

      if (advisorDept !== leave.department || advisorYear !== leave.year) {
        return res.status(403).json({ error: "You are not the assigned faculty for this student" });
      }
      if (advisorSection && advisorSection !== leave.section) {
        return res.status(403).json({ error: "You are not the assigned faculty for this student's section" });
      }

      leave.facultyApproval = {
        status: 'Rejected',
        approvedBy: faculty._id,
        approvedAt: now,
        remarks: remarks || undefined,
      };

    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (!hod) return res.status(404).json({ error: "HOD profile not found" });

      if (!['student', 'faculty'].includes(leave.applicantRole)) {
        return res.status(403).json({ error: "HOD can only reject student and faculty leaves" });
      }
      if (hod.department?.toLowerCase() !== leave.department?.toLowerCase()) {
        return res.status(403).json({ error: "You can only reject leaves from your department" });
      }

      leave.hodApproval = {
        status: 'Rejected',
        approvedBy: hod._id,
        approvedAt: now,
        remarks: remarks || undefined,
      };

    } else if (userRole === 'principal') {
      const principal = await Principal.findOne({ userId });
      if (!principal) return res.status(404).json({ error: "Principal profile not found" });

      leave.principalApproval = {
        status: 'Rejected',
        approvedBy: principal._id,
        approvedAt: now,
        remarks: remarks || undefined,
      };

    } else {
      return res.status(403).json({ error: "You don't have permission to reject leaves" });
    }

    // Recalculate — rejection sets finalStatus = Rejected
    leave.recalculateFinalStatus();
    await leave.save();

    res.json({
      message: "Leave request rejected",
      leave: {
        id: leave._id,
        finalStatus: leave.finalStatus,
        facultyApproval: leave.facultyApproval,
        hodApproval: leave.hodApproval,
        principalApproval: leave.principalApproval,
      }
    });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET LEAVE DETAILS
// ========================

// GET /api/leave/details/:id
export const getLeaveDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;

    const leave = await LeaveRequest.findById(id)
      .populate('applicantUserId', 'name email');

    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    // Authorization check
    let canView = false;

    if (leave.applicantUserId._id.toString() === userId) {
      canView = true;
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId });
      if (faculty?.isClassAdvisor && leave.applicantRole === 'student') {
        const advisorDept = faculty.advisorFor?.department || faculty.department;
        if (advisorDept === leave.department && faculty.advisorFor?.year === leave.year) {
          canView = true;
        }
      }
    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (hod?.department === leave.department) canView = true;
    } else if (['principal', 'admin', 'superUser'].includes(userRole)) {
      canView = true;
    }

    if (!canView) {
      return res.status(403).json({ error: "You don't have permission to view this leave request" });
    }

    // Get applicant details
    const applicantDetails = await getApplicantDetails(leave);

    // Enrich approval objects with approver names
    const facultyApproval = await enrichApproval(leave.facultyApproval, Faculty);
    const hodApproval = await enrichApproval(leave.hodApproval, HOD);
    const principalApproval = await enrichApproval(leave.principalApproval, Principal);

    res.json({
      leave: {
        id: leave._id,
        applicantRole: leave.applicantRole,
        ...applicantDetails,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason,
        finalStatus: leave.finalStatus,
        facultyApproval,
        hodApproval,
        principalApproval,
        appliedAt: leave.appliedAt,
        updatedAt: leave.updatedAt,
      }
    });
  } catch (error) {
    console.error("Get leave details error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// HELPER: Mark Attendance as Leave
// ========================

async function markAttendanceAsLeave(studentId, fromDate, toDate) {
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    await Attendance.updateMany(
      { studentId, date: { $gte: from, $lte: to } },
      { $set: { status: 'leave' } }
    );
  } catch (error) {
    console.error("Error marking attendance as leave:", error);
  }
}

// ========================
// GET ALL LEAVES (Admin/Principal view)
// ========================

// GET /api/leave/all
export const getAllLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['hod', 'principal', 'admin', 'superUser'].includes(userRole)) {
      return res.status(403).json({ error: "You don't have permission to view all leaves" });
    }

    const { status, applicantRole, department, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.finalStatus = status;
    if (applicantRole) filter.applicantRole = applicantRole;

    // HOD can only see leaves from their own department
    if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (!hod) return res.status(404).json({ error: "HOD profile not found" });
      filter.department = { $regex: new RegExp(`^${hod.department}$`, 'i') };
    } else if (department) {
      filter.department = department.toLowerCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('applicantUserId', 'name email'),
      LeaveRequest.countDocuments(filter)
    ]);

    const leavesWithDetails = await Promise.all(leaves.map(async (leave) => {
      const applicantDetails = await getApplicantDetails(leave);

      return {
        id: leave._id,
        applicantRole: leave.applicantRole,
        department: leave.department?.toUpperCase(),
        ...applicantDetails,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason,
        finalStatus: leave.finalStatus,
        facultyApproval: leave.facultyApproval,
        hodApproval: leave.hodApproval,
        principalApproval: leave.principalApproval,
        appliedAt: leave.appliedAt,
      };
    }));

    res.json({
      leaves: leavesWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get all leaves error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ========================
// GET LEAVE STATS
// ========================

// GET /api/leave/stats
export const getLeaveStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = {};

    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ userId });
      if (faculty?.isClassAdvisor) {
        filter = {
          applicantRole: 'student',
          department: faculty.advisorFor?.department || faculty.department,
          year: faculty.advisorFor?.year,
        };
        if (faculty.advisorFor?.section) {
          filter.section = faculty.advisorFor.section;
        }
      }
    } else if (userRole === 'hod') {
      const hod = await HOD.findOne({ userId });
      if (hod) {
        filter = { department: hod.department };
      }
    }

    const [pending, approved, rejected, total] = await Promise.all([
      LeaveRequest.countDocuments({ ...filter, finalStatus: 'Pending' }),
      LeaveRequest.countDocuments({ ...filter, finalStatus: 'Approved' }),
      LeaveRequest.countDocuments({ ...filter, finalStatus: 'Rejected' }),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({
      stats: { pending, approved, rejected, total }
    });
  } catch (error) {
    console.error("Get leave stats error:", error);
    res.status(500).json({ error: error.message });
  }
};
