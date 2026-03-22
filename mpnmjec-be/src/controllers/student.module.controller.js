import User from "../models/User.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import Fee from "../models/Fee.js";
import Certificate from "../models/Certificate.js";
import Material from "../models/Material.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Course from "../models/Course.js";

// GET /api/student/profile
export const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Student not found' });
    const student = await Student.findOne({ userId });
    res.json({ 
      profile: {
        ...user.toObject(),
        ...(student ? student.toObject() : {}),
        studentId: student?._id,
      }
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// PUT /api/student/profile
export const updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, mobile } = req.body;
    const student = await Student.findOneAndUpdate(
      { userId },
      { $set: { address, mobile } },
      { new: true }
    );
    res.json({ profile: student });
  } catch(e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /api/student/academics
export const getStudentAcademics = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    // FIX: Use real Marks model with correct fields
    const marks = await Marks.find({ studentId: student._id })
      .populate('courseId', 'code name credits')
      .sort({ semester: 1 });

    if (!marks.length) return res.json({ message: 'No academic data found', marks: [], cgpa: 0 });

    // Group by semester
    const bySemester = {};
    marks.forEach(m => {
      if (!bySemester[m.semester]) bySemester[m.semester] = [];
      bySemester[m.semester].push({
        courseId: m.courseId?._id,
        courseCode: m.courseId?.code,
        courseName: m.courseId?.name,
        internal1: m.internal1,
        internal2: m.internal2,
        modelExam: m.modelExam,
        finalExam: m.finalExam,
        total: m.total,
        grade: m.grade,
        isPassed: m.isPassed,
        status: m.status,
      });
    });

    const totalMarks = marks.reduce((s, m) => s + (m.total || 0), 0);
    const cgpa = marks.length > 0 ? parseFloat((totalMarks / marks.length / 10).toFixed(2)) : 0;
    const credits = marks.reduce((s, m) => s + (m.courseId?.credits || 3), 0);

    res.json({ cgpa, credits, bySemester, totalSubjects: marks.length });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch academics' });
  }
};

// GET /api/student/attendance
export const getStudentAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const studentId = student._id;

    // FIX: Correct query — studentId is a direct field
    const records = await Attendance.find({ studentId })
      .populate('courseId', 'code name')
      .sort({ date: -1 });

    if (!records.length) return res.json({ 
      message: 'No attendance data found', 
      subjectAttendance: {}, 
      dateAttendance: [],
      overallPercentage: 0 
    });

    // Build subject-wise attendance
    const subjectAttendance = {};
    records.forEach(r => {
      const key = r.courseId?.code || 'Unknown';
      const name = r.courseId?.name || key;
      if (!subjectAttendance[key]) {
        subjectAttendance[key] = { courseName: name, total: 0, attended: 0 };
      }
      subjectAttendance[key].total++;
      if (r.status === 'present') subjectAttendance[key].attended++;
    });

    // Add percentage to each subject
    Object.keys(subjectAttendance).forEach(k => {
      const s = subjectAttendance[k];
      s.percentage = s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0;
    });

    const dateAttendance = records.map(r => ({
      date: r.date,
      courseCode: r.courseId?.code,
      courseName: r.courseId?.name,
      period: r.period,
      status: r.status,
    }));

    const total = records.length;
    const attended = records.filter(r => r.status === 'present').length;
    const overallPercentage = total > 0 ? parseFloat(((attended / total) * 100).toFixed(2)) : 0;

    res.json({ subjectAttendance, dateAttendance, overallPercentage, total, attended });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

// GET /api/student/fees/summary
export const getStudentFeesSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const fee = await Fee.findOne({ studentId: student._id }).sort({ createdAt: -1 });
    if (!fee) return res.json({ message: 'No fee data found', fees: null });

    res.json({
      fees: {
        _id: fee._id,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount,
        pendingAmount: fee.pendingAmount,
        status: fee.status,
        dueDate: fee.dueDate,
        academicYear: fee.academicYear,
        semester: fee.semester,
      }
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch fee summary' });
  }
};

// GET /api/student/fees/history
export const getStudentFeesHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const fees = await Fee.find({ studentId: student._id }).sort({ createdAt: -1 });
    const payments = fees.flatMap(f => 
      (f.payments || []).map(p => ({
        ...p.toObject(),
        academicYear: f.academicYear,
        semester: f.semester,
      }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ payments });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch fee history' });
  }
};

// GET /api/student/fees/structure
export const getFeeStructure = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const fee = await Fee.findOne({ studentId: student._id }).sort({ createdAt: -1 });
    if (!fee || !fee.feeStructure?.length) {
      return res.json({ feeStructure: [] });
    }
    res.json({ feeStructure: fee.feeStructure });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch fee structure' });
  }
};

// GET /api/student/fees/receipt/:id
export const getFeeReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const student = await Student.findOne({ userId }).populate('userId', 'name');
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const fee = await Fee.findOne({ studentId: student._id });
    if (!fee) return res.status(404).json({ error: 'Fee record not found' });

    const payment = fee.payments?.find(p => p._id.toString() === id);
    if (!payment) return res.status(404).json({ error: 'Receipt not found' });

    const user = await User.findById(userId);
    res.json({
      receipt: {
        studentName: user?.name || 'Unknown',
        rollNo: student.rollNumber || 'N/A',
        date: payment.date ? new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        amountPaid: payment.amount || 0,
        paymentMethod: payment.method || 'N/A',
        receiptNumber: payment.receiptNumber || 'N/A',
        transactionId: payment.transactionId || 'N/A',
        status: 'Success',
      }
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
};

// POST /api/student/fees/pay
export const payStudentFees = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const fee = await Fee.findOne({ studentId: student._id });
    if (!fee) return res.status(404).json({ error: 'No fee record found' });

    const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    fee.payments.push({ amount, method: 'Online', receiptNumber, date: new Date() });
    fee.paidAmount += amount;
    await fee.save();

    res.json({ success: true, receipt: { receiptNumber, amount } });
  } catch(e) {
    res.status(500).json({ error: 'Failed to process payment' });
  }
};

// ========================
// LEAVE MANAGEMENT
// ========================

// POST /api/student/leave
export const applyLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, reason } = req.body;

    if (!date) return res.status(400).json({ error: "Date is required" });
    if (!reason?.trim()) return res.status(400).json({ error: "Reason is required" });

    const leaveDate = new Date(date);
    if (isNaN(leaveDate.getTime())) return res.status(400).json({ error: "Invalid date format" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    leaveDate.setHours(0, 0, 0, 0);
    if (leaveDate < today) return res.status(400).json({ error: "Cannot apply leave for past dates" });

    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const existingLeave = await LeaveRequest.findOne({
      applicantId: student._id,
      applicantRole: 'student',
      fromDate: leaveDate,
      toDate: leaveDate,
    });
    if (existingLeave) return res.status(400).json({ error: "Leave already applied for this date" });

    const leave = await LeaveRequest.create({
      applicantId: student._id,
      applicantModel: 'Student',
      applicantRole: 'student',
      applicantUserId: userId,
      department: student.department,
      year: student.year,
      section: student.section,
      leaveType: 'casual',
      fromDate: leaveDate,
      toDate: leaveDate,
      reason: reason.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      leave: {
        id: leave._id,
        date: leave.fromDate,
        reason: leave.reason,
        status: leave.finalStatus?.toLowerCase() || 'pending',
        appliedAt: leave.appliedAt || leave.createdAt,
      },
    });
  } catch(error) {
    if (error.code === 11000) return res.status(400).json({ error: "Leave already applied for this date" });
    res.status(500).json({ error: error.message || "Failed to apply for leave" });
  }
};

// GET /api/student/leave
export const getLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const leaves = await LeaveRequest.find({ applicantId: student._id, applicantRole: 'student' })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaves: leaves.map(l => ({
        id: l._id,
        date: l.fromDate,
        reason: l.reason,
        status: l.finalStatus?.toLowerCase() || 'pending',
        appliedAt: l.appliedAt || l.createdAt,
        remarks: l.facultyApproval?.remarks || l.hodApproval?.remarks || l.principalApproval?.remarks || null,
      })),
    });
  } catch(error) {
    res.status(500).json({ error: error.message || "Failed to fetch leaves" });
  }
};

// ========================
// MATERIALS
// ========================

// GET /api/student/materials
export const getStudentMaterials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, subject, page = 1, limit = 20 } = req.query;

    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const filter = {
      department: student.department,
      status: "active",
    };

    if (type) filter.type = type;
    if (subject) filter.subject = { $regex: subject, $options: "i" };

    const materials = await Material.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Material.countDocuments(filter);

    res.json({
      materials: materials.map(m => ({
        _id: m._id,
        title: m.title,
        description: m.description,
        subject: m.subject,
        type: m.type,
        semester: m.semester,
        fileUrl: m.fileUrl,
        externalLink: m.externalLink,
        uploadedBy: m.uploadedByName,
        downloads: m.downloads,
        createdAt: m.createdAt,
      })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch(error) {
    res.status(500).json({ error: error.message || "Failed to fetch materials" });
  }
};

// POST /api/student/materials/:id/download
export const downloadMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findById(id);
    if (!material) return res.status(404).json({ error: "Material not found" });
    material.downloads += 1;
    await material.save();
    res.json({ success: true, fileUrl: material.fileUrl, externalLink: material.externalLink });
  } catch(e) {
    res.status(500).json({ error: "Failed to download material" });
  }
};

// ========================
// CERTIFICATES
// ========================

const CERTIFICATE_TYPES = [
  { id: "bonafide", name: "Bonafide Certificate", fee: 100, processingTime: "3-5 days" },
  { id: "characterCertificate", name: "Character Certificate", fee: 100, processingTime: "3-5 days" },
  { id: "conductCertificate", name: "Conduct Certificate", fee: 100, processingTime: "3-5 days" },
  { id: "studyCertificate", name: "Study Certificate", fee: 150, processingTime: "5-7 days" },
  { id: "courseCompletion", name: "Course Completion Certificate", fee: 200, processingTime: "7-10 days" },
  { id: "migration", name: "Migration Certificate", fee: 500, processingTime: "10-15 days" },
  { id: "transferCertificate", name: "Transfer Certificate", fee: 300, processingTime: "7-10 days" },
];

// GET /api/student/certificates/types
export const getCertificateTypes = async (req, res) => {
  res.json({ certificateTypes: CERTIFICATE_TYPES });
};

// GET /api/student/certificates
export const getStudentCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const filter = { studentId: student._id };
    if (status) filter.status = status;
    const certificates = await Certificate.find(filter).sort({ appliedAt: -1 });

    res.json({
      certificates: certificates.map(c => ({
        _id: c._id,
        type: c.type,
        typeName: c.typeName,
        purpose: c.purpose,
        copies: c.copies,
        fee: c.fee,
        isPaid: c.isPaid,
        status: c.status,
        appliedAt: c.appliedAt,
        reviewedAt: c.reviewedAt,
        remarks: c.remarks,
        certificateNumber: c.certificateNumber,
        readyAt: c.readyAt,
      })),
    });
  } catch(error) {
    res.status(500).json({ error: error.message || "Failed to fetch certificates" });
  }
};

// POST /api/student/certificates
export const applyCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, purpose, copies = 1 } = req.body;

    if (!type || !purpose) return res.status(400).json({ error: "Certificate type and purpose are required" });

    const certType = CERTIFICATE_TYPES.find(c => c.id === type);
    if (!certType) return res.status(400).json({ error: "Invalid certificate type" });

    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const existingRequest = await Certificate.findOne({
      studentId: student._id,
      type,
      status: { $in: ["pending", "processing"] },
    });
    if (existingRequest) {
      return res.status(400).json({ error: "You already have a pending request for this certificate type" });
    }

    const certificate = await Certificate.create({
      studentId: student._id,
      type,
      typeName: certType.name,
      purpose: purpose.trim(),
      copies: Math.min(Math.max(copies, 1), 5),
      fee: certType.fee * copies,
    });

    res.status(201).json({
      success: true,
      message: "Certificate application submitted successfully",
      certificate: {
        _id: certificate._id,
        type: certificate.type,
        typeName: certificate.typeName,
        purpose: certificate.purpose,
        fee: certificate.fee,
        status: certificate.status,
        appliedAt: certificate.appliedAt,
      },
    });
  } catch(error) {
    res.status(500).json({ error: error.message || "Failed to apply for certificate" });
  }
};

// POST /api/student/certificates/:id/pay
export const payCertificateFee = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const certificate = await Certificate.findOne({ _id: id, studentId: student._id });
    if (!certificate) return res.status(404).json({ error: "Certificate request not found" });
    if (certificate.isPaid) return res.status(400).json({ error: "Fee already paid" });

    certificate.isPaid = true;
    await certificate.save();

    res.json({ success: true, message: "Payment successful", certificate: { _id: certificate._id, isPaid: true } });
  } catch(e) {
    res.status(500).json({ error: "Failed to process payment" });
  }
};
