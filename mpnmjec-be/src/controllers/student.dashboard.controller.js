import User from "../models/User.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import Fee from "../models/Fee.js";
import Certificate from "../models/Certificate.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// GET /api/student/dashboard/summary
export const getStudentDashboardSummary = async (req, res) => {    
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ profile: null, metrics: null, message: 'User not found' });
    }

    const student = await Student.findOne({ userId });
    
    if (!student) {
      return res.json({ 
        profile: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }, 
        metrics: null, 
        message: 'Student profile not set up. Please contact admin.' 
      });
    }

    const studentId = student._id;

    // FIX: Correct attendance query — studentId is a direct field, not nested in students[]
    const totalAttendance = await Attendance.countDocuments({ studentId });
    const presentAttendance = await Attendance.countDocuments({ studentId, status: "present" });
    const attendancePercentage = totalAttendance > 0
      ? Math.round((presentAttendance / totalAttendance) * 100)
      : 0;

    // FIX: Use real Fee model
    const feeRecord = await Fee.findOne({ studentId }).sort({ createdAt: -1 });
    const pendingFees = feeRecord ? (feeRecord.pendingAmount || 0) : 0;

    // FIX: Use real Marks model (internal1, internal2, modelExam, finalExam, total)
    const marksRecords = await Marks.find({ studentId, status: { $ne: "draft" } });
    let currentCGPA = student.cgpa || 0;
    if (marksRecords.length > 0) {
      const avgTotal = marksRecords.reduce((sum, m) => sum + (m.total || 0), 0) / marksRecords.length;
      // Convert 100-scale avg to 10-scale CGPA approximation
      currentCGPA = parseFloat((avgTotal / 10).toFixed(2));
    }

    // Pending certificate requests
    const pendingCertificates = await Certificate.countDocuments({ studentId, status: 'pending' });

    // Recent notifications
    const notifications = await Notification.find({ 
      $or: [{ targetRole: 'student' }, { targetId: studentId }]
    }).sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        section: student.section,
        semester: student.semester,
        admissionYear: student.admissionYear,
        fatherName: student.fatherName,
        motherName: student.motherName,
        mobile: student.mobile,
        address: student.address,
      },
      metrics: {
        attendancePercentage,
        totalClasses: totalAttendance,
        presentClasses: presentAttendance,
        pendingFees,
        cgpa: currentCGPA,
        pendingCertificates,
      },
      notifications: notifications.map(n => ({
        _id: n._id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: error.message });
  }
};
