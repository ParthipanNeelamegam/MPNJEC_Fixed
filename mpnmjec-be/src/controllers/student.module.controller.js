import User from "../models/User.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import Fee from "../models/Fee.js";
import Certificate from "../models/Certificate.js";
import Material from "../models/Material.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Course from "../models/Course.js";
import Notification from "../models/Notification.js";
import LibraryTransaction from "../models/LibraryTransaction.js";
import mongoose from "mongoose";

const INSTITUTION_NAME = process.env.INSTITUTION_NAME || "MPNMJEC";
const INSTITUTION_PLACE = process.env.INSTITUTION_PLACE || "Campus";
const UPI_ID = process.env.COLLEGE_UPI_ID || "college@upi";
const UPI_PAYEE_NAME = process.env.COLLEGE_UPI_NAME || INSTITUTION_NAME;

const formatCurrency = (amount = 0) => `Rs.${Number(amount || 0).toLocaleString("en-IN")}`;
const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
const formatCertificateDate = (date) => date ? new Date(date).toLocaleDateString("en-IN") : "N/A";

const getParentName = (student) => student?.fatherName || student?.motherName || "Parent/Guardian";
const getStudentCourseText = (student) => `${student?.department?.toUpperCase() || "Department"}, Year ${student?.year || "-"} / Semester ${student?.semester || "-"}`;
const escapePdfText = (value = "") => String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const sanitizeFileName = (value = "certificate") => String(value).replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");

const wrapText = (text, maxChars = 92) => {
  const lines = [];
  String(text || "").split("\n").forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
};

const buildCertificateContent = ({ certificate, student }) => {
  const studentName = student?.userId?.name || "Student";
  const parentName = getParentName(student);
  const courseText = getStudentCourseText(student);
  const academicYear = certificate.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
  const admissionText = student?.admissionYear ? `the academic year ${student.admissionYear}` : "the date of admission";
  const dateText = formatCertificateDate(new Date());

  const title = certificate.type === "bonafide" ? "BONAFIDE CERTIFICATE" : String(certificate.typeName || "CERTIFICATE").toUpperCase();
  const body = certificate.type === "bonafide"
    ? [
      `This is to certify that Mr./Ms. ${studentName}, Son/Daughter of ${parentName}, is a bonafide student of ${INSTITUTION_NAME}, studying in ${courseText} during the academic year ${academicYear}.`,
      "",
      `He/She has been studying in this institution from ${admissionText} to till date. His/Her conduct and behavior are found to be satisfactory.`,
      "",
      `This certificate is issued on his/her request for the purpose of ${certificate.purpose || "General purpose"}.`,
    ]
    : [
      `This is to certify that Mr./Ms. ${studentName}, Son/Daughter of ${parentName}, is a student of ${INSTITUTION_NAME}, studying in ${courseText}.`,
      "",
      `This ${certificate.typeName || "certificate"} is issued on his/her request for the purpose of ${certificate.purpose || "General purpose"}.`,
    ];

  return { title, body, dateText };
};

const createCertificatePdfBuffer = ({ certificate, student }) => {
  const { title, body, dateText } = buildCertificateContent({ certificate, student });
  const commands = [];
  let y = 760;

  commands.push("BT");
  commands.push("/F1 18 Tf");
  commands.push("1 0 0 1 170 780 Tm");
  commands.push(`(${escapePdfText(title)}) Tj`);
  commands.push("ET");

  commands.push("BT");
  commands.push("/F1 12 Tf");
  commands.push("14 TL");
  commands.push("1 0 0 1 72 720 Tm");
  commands.push(`(Certificate No: ${escapePdfText(certificate.certificateNumber || certificate._id)}) Tj`);
  commands.push("T*");
  commands.push(`(Roll No: ${escapePdfText(student?.rollNumber || "-")}) Tj`);
  commands.push("ET");

  y = 660;
  commands.push("BT");
  commands.push("/F1 13 Tf");
  commands.push("18 TL");
  commands.push(`1 0 0 1 72 ${y} Tm`);
  body.forEach((paragraph, paragraphIndex) => {
    const lines = wrapText(paragraph, 82);
    if (paragraphIndex > 0) commands.push("T*");
    lines.forEach((line) => {
      if (line) commands.push(`(${escapePdfText(line)}) Tj`);
      commands.push("T*");
    });
  });
  commands.push("ET");

  commands.push("BT");
  commands.push("/F1 12 Tf");
  commands.push("16 TL");
  commands.push("1 0 0 1 72 270 Tm");
  commands.push(`(Date: ${escapePdfText(dateText)}) Tj`);
  commands.push("T*");
  commands.push(`(Place: ${escapePdfText(INSTITUTION_PLACE)}) Tj`);
  commands.push("ET");

  commands.push("BT");
  commands.push("/F1 12 Tf");
  commands.push("18 TL");
  commands.push("1 0 0 1 340 210 Tm");
  commands.push("(Principal / Head of Institution) Tj");
  commands.push("T*");
  commands.push("(Signature: ____________) Tj");
  commands.push("T*");
  commands.push("(Name: ____________) Tj");
  commands.push("T*");
  commands.push("T*");
  commands.push("(Seal of Institution) Tj");
  commands.push("ET");

  commands.push("0.8 w");
  commands.push("50 50 495 742 re");
  commands.push("S");

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

const renderCertificateHtml = ({ certificate, student }) => {
  const studentName = student?.userId?.name || "Student";
  const parentName = getParentName(student);
  const courseText = getStudentCourseText(student);
  const academicYear = certificate.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
  const admissionText = student?.admissionYear ? `the academic year ${student.admissionYear}` : "the date of admission";
  const dateText = formatCertificateDate(new Date());

  const body = certificate.type === "bonafide"
    ? `This is to certify that Mr./Ms. ${studentName}, Son/Daughter of ${parentName}, is a bonafide student of ${INSTITUTION_NAME}, studying in ${courseText} during the academic year ${academicYear}.

He/She has been studying in this institution from ${admissionText} to till date. His/Her conduct and behavior are found to be satisfactory.

This certificate is issued on his/her request for the purpose of ${certificate.purpose}.`
    : `This is to certify that Mr./Ms. ${studentName}, Son/Daughter of ${parentName}, is a student of ${INSTITUTION_NAME}, studying in ${courseText}. This ${certificate.typeName} is issued on his/her request for the purpose of ${certificate.purpose}.`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${certificate.typeName}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111827; padding: 48px; }
    .certificate { max-width: 760px; margin: 0 auto; border: 2px solid #111827; padding: 44px; min-height: 900px; }
    h1 { text-align: center; font-size: 24px; text-decoration: underline; margin-bottom: 46px; }
    p { font-size: 18px; line-height: 1.9; white-space: pre-line; text-align: justify; }
    .meta { margin-top: 48px; font-size: 17px; line-height: 1.8; }
    .sign { margin-top: 84px; display: flex; justify-content: flex-end; }
    .sign div { width: 280px; font-size: 17px; line-height: 1.8; }
    @media print { body { padding: 0; } .certificate { border: 2px solid #111827; } }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>${certificate.typeName.toUpperCase()}</h1>
    <p>${body}</p>
    <div class="meta">
      <div>Date: ${dateText}</div>
      <div>Place: ${INSTITUTION_PLACE}</div>
    </div>
    <div class="sign">
      <div>
        <strong>Principal / Head of Institution</strong><br />
        Signature: ____________<br />
        Name: ____________<br />
        Seal of Institution
      </div>
    </div>
  </div>
</body>
</html>`;
};

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
        fineAmount: fee.fineAmount || 0,
        finePerDay: fee.finePerDay || 0,
        pendingAmount: fee.pendingAmount,
        status: fee.status,
        dueDate: fee.dueDate,
        academicYear: fee.academicYear,
        semester: fee.semester,
        feeStructure: fee.feeStructure || [],
        dueAlert: fee.status === "overdue"
          ? `Due date is over. Fine added: ${formatCurrency(fee.fineAmount || 0)}`
          : null,
        upi: {
          id: UPI_ID,
          name: UPI_PAYEE_NAME,
          amount: fee.pendingAmount,
          purpose: `Semester ${fee.semester} fee`,
          url: `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${encodeURIComponent(fee.pendingAmount)}&cu=INR&tn=${encodeURIComponent(`Fee payment ${student.rollNumber}`)}`,
        },
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
        purpose: p.purpose || f.feeStructure?.map(item => item.name).join(", ") || `Semester ${f.semester} Fee`,
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

    const fee = await Fee.findOne({
      studentId: student._id,
      $or: [
        ...(mongoose.Types.ObjectId.isValid(id) ? [{ "payments._id": id }] : []),
        { "payments.receiptNumber": id },
      ],
    });
    if (!fee) return res.status(404).json({ error: 'Fee record not found' });

    const payment = fee.payments?.find(p => p._id.toString() === id || p.receiptNumber === id);
    if (!payment) return res.status(404).json({ error: 'Receipt not found' });

    const user = await User.findById(userId);
    res.json({
      receipt: {
        studentName: user?.name || 'Unknown',
        rollNo: student.rollNumber || 'N/A',
        date: payment.date ? new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        amountPaid: payment.amount || 0,
        paymentMethod: payment.method || 'N/A',
        purpose: payment.purpose || fee.feeStructure?.map(item => item.name).join(", ") || `Semester ${fee.semester} Fee`,
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
    const { amount, transactionId, purpose } = req.body;
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const fee = await Fee.findOne({ studentId: student._id });
    if (!fee) return res.status(404).json({ error: 'No fee record found' });

    const paymentAmount = Number(amount || fee.pendingAmount || 0);
    if (!paymentAmount || paymentAmount <= 0) return res.status(400).json({ error: "Valid amount is required" });
    if (paymentAmount > fee.pendingAmount) return res.status(400).json({ error: "Payment amount exceeds pending amount" });

    const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    fee.payments.push({
      amount: paymentAmount,
      method: 'upi',
      transactionId,
      receiptNumber,
      date: new Date(),
      purpose: purpose || fee.feeStructure?.map(item => item.name).join(", ") || `Semester ${fee.semester} Fee`,
    });
    fee.paidAmount += paymentAmount;
    await fee.save();

    res.json({ success: true, receipt: { receiptNumber, amount: paymentAmount, transactionId } });
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
  { id: "bonafide", name: "Bonafide Certificate", fee: 0, processingTime: "3-5 days" },
  { id: "characterCertificate", name: "Character Certificate", fee: 0, processingTime: "3-5 days" },
  { id: "conductCertificate", name: "Conduct Certificate", fee: 0, processingTime: "3-5 days" },
  { id: "studyCertificate", name: "Study Certificate", fee: 0, processingTime: "5-7 days" },
  { id: "courseCompletion", name: "Course Completion Certificate", fee: 0, processingTime: "7-10 days" },
  { id: "migration", name: "Migration Certificate", fee: 0, processingTime: "10-15 days" },
  { id: "transferCertificate", name: "Transfer Certificate", fee: 0, processingTime: "7-10 days" },
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
      fee: 0,
      isPaid: true,
    });

    await Notification.create({
      userId,
      title: "Certificate Request Submitted",
      message: `${certType.name} request submitted for ${purpose.trim()}.`,
      type: "certificate",
      priority: "normal",
      link: "/student/certificates",
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

// POST /api/student/certificates/request - Quick bonafide request from dashboard
export const requestBonafideCertificate = async (req, res) => {
  req.body = {
    type: "bonafide",
    purpose: req.body?.purpose || "General purpose",
    copies: req.body?.copies || 1,
  };
  return applyCertificate(req, res);
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

// GET /api/student/library - Get current student's library card details
export const getStudentLibraryCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ userId }).populate("userId", "name email");
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const now = new Date();
    const transactions = await LibraryTransaction.find({
      studentId: student._id,
      status: { $in: ["Issued", "Overdue"] },
    })
      .sort({ dueDate: 1 })
      .populate({ path: "bookId", select: "title author isbn category" });

    let totalFine = 0;
    const borrowedBooks = transactions.map((transaction) => {
      const isOverdue = transaction.dueDate && now > transaction.dueDate;
      const daysOverdue = isOverdue
        ? Math.ceil((now - transaction.dueDate) / (1000 * 60 * 60 * 24))
        : 0;
      const fineAmount = isOverdue
        ? Math.max(transaction.fineAmount || 0, daysOverdue * 5)
        : transaction.fineAmount || 0;
      totalFine += fineAmount;

      return {
        id: transaction._id,
        title: transaction.bookId?.title || "Unknown book",
        author: transaction.bookId?.author || "-",
        isbn: transaction.bookId?.isbn || "-",
        category: transaction.bookId?.category || "-",
        issueDate: transaction.issueDate,
        dueDate: transaction.dueDate,
        status: isOverdue ? "Overdue" : transaction.status,
        fineAmount,
      };
    });

    res.json({
      libraryCard: {
        studentName: student.userId?.name || "Student",
        rollNumber: student.rollNumber,
        libraryCardsTotal: student.libraryCardsTotal || 0,
        libraryCardsAvailable: student.libraryCardsAvailable || 0,
        borrowedCount: borrowedBooks.length,
        totalFine,
        borrowedBooks,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch library card details" });
  }
};

const sendCertificatePdf = async (req, res, disposition = "attachment") => {
  try {
    const { certificateNumber } = req.params;
    const lookup = [{ certificateNumber }];
    if (mongoose.Types.ObjectId.isValid(certificateNumber)) {
      lookup.push({ _id: certificateNumber });
    }

    const certificate = await Certificate.findOne({
      $or: lookup,
      status: { $in: ["approved", "processing", "ready", "collected"] },
    }).populate({
      path: "studentId",
      populate: { path: "userId", select: "name email" },
    });

    if (!certificate) return res.status(404).send("Certificate not found or not approved");

    if (!certificate.certificateNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(100000 + Math.random() * 900000);
      certificate.certificateNumber = `CERT-${year}-${random}`;
      await certificate.save();
    }

    const pdf = createCertificatePdfBuffer({ certificate, student: certificate.studentId });
    const fileName = sanitizeFileName(`${certificate.typeName}_${certificate.certificateNumber}`) || "certificate";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}.pdf"`);
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch(e) {
    res.status(500).send("Failed to load certificate");
  }
};

// GET /api/student/certificates/:certificateNumber/view
export const viewCertificate = async (req, res) => {
  return sendCertificatePdf(req, res, "inline");
};

// GET /api/student/certificates/:certificateNumber/download
export const downloadCertificate = async (req, res) => {
  return sendCertificatePdf(req, res, "attachment");
};
