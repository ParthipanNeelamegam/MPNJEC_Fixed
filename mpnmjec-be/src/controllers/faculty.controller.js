import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Course from "../models/Course.js";
import Material from "../models/Material.js";
import TimeTable from "../models/TimeTable.js";
import Marks from "../models/Marks.js"; 
import { getCurrentPeriod, canEditPeriod } from "../utils/period.js";

// ========================
// PERIOD MANAGEMENT
// ========================

// GET /api/faculty/current-period - Get current active period
export const getCurrentPeriodInfo = async (req, res) => {
  try {
    const periodInfo = await getCurrentPeriod();
    res.json(periodInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// FACULTY COURSE MANAGEMENT
// ========================

// GET /api/faculty/:id/courses - Get Faculty's Assigned Courses
export const getFacultyCourses = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id).populate(
      "assignedCourses",
      "code name department semester credits status"
    );

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json({
      courses: faculty.assignedCourses || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/faculty/my-courses - Get Current Faculty's Courses
export const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const faculty = await Faculty.findOne({ userId }).populate(
      "assignedCourses",
      "code name department semester credits status"
    );

    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    res.json({
      courses: faculty.assignedCourses || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ATTENDANCE MANAGEMENT
// ========================

// POST /api/faculty/attendance - Take Attendance
export const takeAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, date, period, students } = req.body;

    if (!courseId || !date || !period || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: "courseId, date, period, and students array are required" });
    }

    // Validate period is editable
    const periodCheck = await canEditPeriod(period);
    if (!periodCheck.canEdit) {
      return res.status(400).json({ error: periodCheck.reason });
    }

    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    // Verify faculty is assigned to this course
    const isAssigned = faculty.assignedCourses.some(c => c.toString() === courseId);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to this course" });
    }

    // Get course to determine department
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const attendanceDate = new Date(date);
    const attendanceRecords = [];

    for (const studentRecord of students) {
      const { studentId, status } = studentRecord;

      // Check if student has approved leave for this date
      const approvedLeave = await Leave.findOne({
        studentId,
        date: attendanceDate,
        status: "approved",
      });

      // Determine attendance status
      let finalStatus = status;
      if (approvedLeave) {
        finalStatus = "leave";
      }

      // Check if attendance already exists
      const existingAttendance = await Attendance.findOne({
        studentId,
        courseId,
        date: attendanceDate,
        period,
      });

      if (existingAttendance) {
        // Skip if already submitted (can't modify without HOD approval)
        continue;
      }

      // Create attendance record
      const attendance = await Attendance.create({
        studentId,
        facultyId: faculty._id,
        courseId,
        department: course.department,
        date: attendanceDate,
        period,
        status: finalStatus,
        approvedByHOD: false,
      });

      attendanceRecords.push(attendance);
    }

    res.status(201).json({
      message: "Attendance recorded successfully",
      count: attendanceRecords.length,
      records: attendanceRecords.map(a => ({
        id: a._id,
        studentId: a.studentId,
        status: a.status,
        date: a.date,
        period: a.period,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/faculty/attendance - Get Attendance Records
export const getAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, date, period } = req.query;

    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    const filter = { facultyId: faculty._id };
    if (courseId) filter.courseId = courseId;
    if (date) filter.date = new Date(date);
    if (period) filter.period = parseInt(period);

    const attendance = await Attendance.find(filter)
      .populate("studentId", "rollNumber")
      .populate("courseId", "code name")
      .sort({ date: -1, period: 1 });

    res.json({
      attendance: attendance.map(a => ({
        id: a._id,
        studentId: a.studentId?._id,
        rollNumber: a.studentId?.rollNumber,
        courseId: a.courseId?._id,
        courseCode: a.courseId?.code,
        courseName: a.courseId?.name,
        date: a.date,
        period: a.period,
        status: a.status,
        approvedByHOD: a.approvedByHOD,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/faculty/students - Get Students by Course or Department
export const getStudentsByCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, year, section } = req.query;

    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    let department = faculty.department;

    // If courseId provided, verify faculty is assigned and get course department
    if (courseId) {
      const isAssigned = faculty.assignedCourses.some(c => c.toString() === courseId);
      if (!isAssigned) {
        return res.status(403).json({ error: "You are not assigned to this course" });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      department = course.department;
    }

    // Build filter for students
    const filter = {
      department,
      status: "active",
    };

    // Add year and section filters if provided
    if (year) filter.year = parseInt(year);
    if (section) filter.section = section;

    const students = await Student.find(filter)
      .populate("userId", "name email")
      .sort({ rollNumber: 1 });

    res.json({
      department,
      students: students.map(s => ({
        _id: s._id,
        rollNumber: s.rollNumber,
        name: s.userId?.name,
        email: s.userId?.email,
        department: s.department,
        year: s.year,
        section: s.section,
        semester: s.semester,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// LEAVE MANAGEMENT
// ========================

// GET /api/faculty/leave - Get Leave Requests for Faculty's Students
export const getLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    // Get courses assigned to this faculty
    const courses = await Course.find({ _id: { $in: faculty.assignedCourses } });
    const departments = [...new Set(courses.map(c => c.department))];

    // Build filter using LeaveRequest model
    const filter = {
      applicantRole: 'student',
      department: { $in: departments.map(d => new RegExp(`^${d}$`, 'i')) },
    };
    // Map old status values to LeaveRequest finalStatus
    if (status) {
      const statusMap = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
      filter.finalStatus = statusMap[status] || status;
    }

    const leaves = await LeaveRequest.find(filter)
      .populate({
        path: "applicantId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.json({
      leaves: leaves.map(l => ({
        id: l._id,
        studentId: l.applicantId?._id,
        studentName: l.applicantId?.userId?.name,
        studentEmail: l.applicantId?.userId?.email,
        rollNumber: l.applicantId?.rollNumber,
        department: l.department,
        date: l.fromDate,
        reason: l.reason,
        status: l.finalStatus?.toLowerCase() || 'pending',
        appliedAt: l.appliedAt || l.createdAt,
        reviewedAt: l.updatedAt,
        remarks: l.facultyApproval?.remarks || l.hodApproval?.remarks || l.principalApproval?.remarks || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/faculty/leave/:id - Approve or Reject Leave
export const updateLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    // Look up the acting profile based on role
    let actorProfile = null;
    let actingRole = userRole;

    if (userRole === 'faculty') {
      actorProfile = await Faculty.findOne({ userId });
    } else if (userRole === 'hod') {
      const HOD = (await import("../models/HOD.js")).default;
      actorProfile = await HOD.findOne({ userId });
      // HOD might also have a faculty profile
      if (!actorProfile) {
        actorProfile = await Faculty.findOne({ userId });
        actingRole = 'faculty';
      }
    }

    if (!actorProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    // Only allow action on pending leaves
    if (leave.finalStatus !== 'Pending') {
      return res.status(400).json({ error: "This leave request has already been processed" });
    }

    // Verify department access
    const courses = await Course.find({ _id: { $in: actorProfile.assignedCourses || [] } });
    const departments = [...new Set(courses.map(c => c.department))];
    const leaveDept = leave.department?.toLowerCase();
    const hasDeptAccess = departments.some(d => d?.toLowerCase() === leaveDept) ||
      actorProfile.department?.toLowerCase() === leaveDept;

    if (!hasDeptAccess) {
      return res.status(403).json({ error: "You are not authorized to review this leave request" });
    }

    // Determine which approval block to update based on acting role
    const approvalMap = {
      faculty: 'facultyApproval',
      hod: 'hodApproval',
      principal: 'principalApproval',
    };
    const approvalField = approvalMap[actingRole];
    if (!approvalField || !leave[approvalField]) {
      return res.status(400).json({ error: "Invalid role for this approval" });
    }

    // Set the acting role's approval block
    const approvalStatus = status === 'approved' ? 'Approved' : 'Rejected';
    leave[approvalField] = {
      status: approvalStatus,
      approvedBy: actorProfile._id,
      approvedAt: new Date(),
      remarks: remarks || undefined,
    };

    // Single-approver model: mark other pending blocks as N/A
    const allBlocks = ['facultyApproval', 'hodApproval', 'principalApproval'];
    for (const block of allBlocks) {
      if (block !== approvalField && leave[block]?.status === 'Pending') {
        leave[block] = { status: 'N/A' };
      }
    }

    // Recalculate final status
    leave.recalculateFinalStatus();
    await leave.save();

    res.json({
      message: `Leave ${status} successfully`,
      leave: {
        id: leave._id,
        status: leave.finalStatus?.toLowerCase() || status,
        reviewedAt: leave[approvalField]?.approvedAt,
        remarks: leave[approvalField]?.remarks,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// DASHBOARD
// ========================

// GET /api/faculty/dashboard/stats - Get faculty dashboard statistics
export const getFacultyDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const faculty = await Faculty.findOne({ userId }).populate("assignedCourses");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    const courseIds = faculty.assignedCourses.map(c => c._id);
    const courseDepartments = [...new Set(faculty.assignedCourses.map(c => c.department))];

    // Get students from departments of assigned courses
    const totalStudents = await Student.countDocuments({
      department: { $in: courseDepartments },
      status: "active",
    });

    // Get today's attendance count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          courseId: { $in: courseIds },
          date: { $gte: today, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        },
      },
    ]);

    // Get pending leave requests count (using LeaveRequest model)
    const pendingLeaves = await LeaveRequest.countDocuments({
      department: { $in: courseDepartments },
      finalStatus: 'Pending',
    });

    // Get total classes taken this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const classesThisMonth = await Attendance.distinct("date", {
      courseId: { $in: courseIds },
      date: { $gte: monthStart },
      markedBy: faculty._id,
    });

    res.json({
      stats: {
        totalCourses: faculty.assignedCourses.length,
        totalStudents,
        pendingLeaves,
        classesThisMonth: classesThisMonth.length,
      },
      todayAttendance: todayAttendance[0] || { total: 0, present: 0 },
      courses: faculty.assignedCourses.map(c => ({
        _id: c._id,
        code: c.code,
        name: c.name,
        department: c.department,
        semester: c.semester,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/faculty/timetable/today - Get today's schedule
export const getTodaySchedule = async (req, res) => {
  try {
    const userId = req.user.id;

    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    const today = new Date();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = daysOfWeek[today.getDay()];

    // Get timetable entries for today
    const schedule = await TimeTable.find({
      facultyId: faculty._id,
      day: dayName,
    })
      .populate("courseId", "code name department")
      .sort({ period: 1 });

    // Define period times (can be made configurable)
    const periodTimes = [
      { period: 1, start: "09:00", end: "09:50" },
      { period: 2, start: "09:50", end: "10:40" },
      { period: 3, start: "10:50", end: "11:40" },
      { period: 4, start: "11:40", end: "12:30" },
      { period: 5, start: "13:30", end: "14:20" },
      { period: 6, start: "14:20", end: "15:10" },
      { period: 7, start: "15:20", end: "16:10" },
      { period: 8, start: "16:10", end: "17:00" },
    ];

    const fullSchedule = periodTimes.map(pt => {
      const entry = schedule.find(s => s.period === pt.period);
      return {
        period: pt.period,
        startTime: pt.start,
        endTime: pt.end,
        hasClass: !!entry,
        course: entry ? {
          _id: entry.courseId?._id,
          code: entry.courseId?.code,
          name: entry.courseId?.name,
        } : null,
        room: entry?.room || null,
        section: entry?.section || null,
      };
    });

    res.json({
      day: dayName,
      date: today.toISOString().split("T")[0],
      schedule: fullSchedule,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// MATERIALS MANAGEMENT
// ========================

// GET /api/faculty/materials - Get materials uploaded by faculty
export const getMaterials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, type, page = 1, limit = 20 } = req.query;

    const filter = { uploadedBy: userId, status: "active" };
    if (courseId) filter.courseId = courseId;
    if (type) filter.type = type;

    const materials = await Material.find(filter)
      .populate("courseId", "code name")
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
        course: m.courseId ? { code: m.courseId.code, name: m.courseId.name } : null,
        fileUrl: m.fileUrl || null,
        fileName: m.fileName || null,
        fileSize: m.fileSize || null,
        downloads: m.downloads,
        views: m.views,
        createdAt: m.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/faculty/materials - Upload new material
export const uploadMaterial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, courseId, subject, type, fileUrl, fileName, fileSize, externalLink, tags } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ error: "Title and subject are required" });
    }

    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    // Get department from course or faculty
    let department = faculty.department;
    let semester;
    if (courseId) {
      const course = await Course.findById(courseId);
      if (course) {
        department = course.department;
        semester = course.semester;
      }
    }

    // Handle uploaded file (if any)
    let uploadedFileUrl = fileUrl;
    let uploadedFileName = fileName;
    let uploadedFileSize = fileSize;
    if (req.file) {
      uploadedFileUrl = `/uploads/materials/${req.file.filename}`;
      uploadedFileName = req.file.originalname;
      uploadedFileSize = req.file.size;
    }

    const material = await Material.create({
      title,
      description,
      courseId,
      department,
      semester,
      subject,
      type: type || "notes",
      fileUrl: uploadedFileUrl,
      fileName: uploadedFileName,
      fileSize: uploadedFileSize,
      externalLink,
      uploadedBy: userId,
      uploadedByName: req.user.name,
      tags: tags || [],
    });

    res.status(201).json({
      message: "Material uploaded successfully",
      material: {
        _id: material._id,
        title: material.title,
        subject: material.subject,
        type: material.type,
        createdAt: material.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/faculty/materials/:id - Update material
export const updateMaterial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, type, tags, status } = req.body;

    const material = await Material.findOne({ _id: id, uploadedBy: userId });
    if (!material) {
      return res.status(404).json({ error: "Material not found or access denied" });
    }

    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (type) material.type = type;
    if (tags) material.tags = tags;
    if (status) material.status = status;

    await material.save();

    res.json({ message: "Material updated successfully", material });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/faculty/materials/:id - Delete material
export const deleteMaterial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const material = await Material.findOne({ _id: id, uploadedBy: userId });
    if (!material) {
      return res.status(404).json({ error: "Material not found or access denied" });
    }

    material.status = "inactive";
    await material.save();

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// MARKS ENTRY
// ========================

// GET /api/faculty/marks - Get marks for a course (faculty must be assigned)
export const getMarksForCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, year, section, semester } = req.query;

    const faculty = await Faculty.findOne({ userId }).populate("assignedCourses");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    // Check if faculty is assigned to this course
    const isAssigned = faculty.assignedCourses.some(c => c._id.toString() === courseId);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to this course" });
    }

    const course = faculty.assignedCourses.find(c => c._id.toString() === courseId);

    // Build query for students
    const studentQuery = {
      department: course.department,
      status: "active",
    };
    if (year && year !== 'undefined') studentQuery.year = parseInt(year);
    if (section && section !== 'undefined' && section !== 'all') studentQuery.section = section;
    // Make semester filter optional: only filter if explicitly required
    // If no students found with semester, try without semester filter
    let students = [];
    if (semester && semester !== 'undefined') {
      students = await Student.find({ ...studentQuery, semester: parseInt(semester) })
        .populate("userId", "name")
        .sort({ rollNumber: 1 });
      if (students.length === 0) {
        // Fallback: try without semester filter
        students = await Student.find(studentQuery)
          .populate("userId", "name")
          .sort({ rollNumber: 1 });
      }
    } else {
      students = await Student.find(studentQuery)
        .populate("userId", "name")
        .sort({ rollNumber: 1 });
    }
    // Final fallback: if still no students, query by department only
    if (students.length === 0) {
      students = await Student.find({ department: course.department, status: "active" })
        .populate("userId", "name")
        .sort({ rollNumber: 1 });
    }


    // Get existing marks
    const Marks = (await import("../models/Marks.js")).default;
    const existingMarks = await Marks.find({
      courseId,
      studentId: { $in: students.map(s => s._id) },
    });

    const marksMap = existingMarks.reduce((acc, m) => {
      acc[m.studentId.toString()] = m;
      return acc;
    }, {});

    res.json({
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
      },
      students: students.map(s => ({
        id: s._id,
        name: s.userId?.name,
        rollNumber: s.rollNumber,
        year: s.year,
        section: s.section,
        semester: s.semester,
        marks: marksMap[s._id.toString()] ? {
          internal1: marksMap[s._id.toString()].internal1,
          internal2: marksMap[s._id.toString()].internal2,
          modelExam: marksMap[s._id.toString()].modelExam,
          finalExam: marksMap[s._id.toString()].finalExam,
          total: marksMap[s._id.toString()].total,
          grade: marksMap[s._id.toString()].grade,
          isPassed: marksMap[s._id.toString()].isPassed,
          verifiedByHOD: marksMap[s._id.toString()].verifiedByHOD,
        } : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/faculty/marks - Enter or update marks
export const enterMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, studentId, semester, internal1, internal2, modelExam, finalExam, academicYear } = req.body;

    if (!courseId || !studentId || !semester) {
      return res.status(400).json({ error: "courseId, studentId, and semester are required" });
    }

    const faculty = await Faculty.findOne({ userId }).populate("assignedCourses");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    // Check if faculty is assigned to this course
    const isAssigned = faculty.assignedCourses.some(c => c._id.toString() === courseId);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to this course" });
    }

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const Marks = (await import("../models/Marks.js")).default;

    // Find or create marks record
    let marks = await Marks.findOne({ studentId, courseId, semester });
    
    if (!marks) {
      marks = new Marks({
        studentId,
        courseId,
        semester,
        enteredBy: faculty._id,
        academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      });
    } else {
      // Check if already verified by HOD
      if (marks.verifiedByHOD) {
        return res.status(403).json({ error: "Marks already verified by HOD. Cannot edit." });
      }
      marks.lastEditedBy = faculty._id;
    }

    // Update marks
    if (internal1 !== undefined) marks.internal1 = internal1;
    if (internal2 !== undefined) marks.internal2 = internal2;
    if (modelExam !== undefined) marks.modelExam = modelExam;
    if (finalExam !== undefined) marks.finalExam = finalExam;

    await marks.save();

    res.json({
      message: "Marks saved successfully",
      marks: {
        studentId: marks.studentId,
        courseId: marks.courseId,
        internal1: marks.internal1,
        internal2: marks.internal2,
        modelExam: marks.modelExam,
        finalExam: marks.finalExam,
        total: marks.total,
        grade: marks.grade,
        isPassed: marks.isPassed,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/faculty/marks/bulk - Bulk enter marks
export const bulkEnterMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, academicYear, marksData } = req.body;
    const semester = Number(req.body.semester);

    if (!courseId || !semester || isNaN(semester) || !marksData || !Array.isArray(marksData)) {
      return res.status(400).json({ error: "courseId, semester, and marksData array are required" });
    }

    const faculty = await Faculty.findOne({ userId }).populate("assignedCourses");
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    // Support both populated Course objects and raw ObjectIds
    const isAssigned = faculty.assignedCourses.some(c => {
      const id = c._id ? c._id.toString() : c.toString();
      return id === courseId;
    });
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to this course" });
    }

    const academicYearStr = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const results = [];

    for (const data of marksData) {
      try {
        const { studentId } = data;
        const internal1 = data.internal1 !== undefined ? Number(data.internal1) : undefined;
        const internal2 = data.internal2 !== undefined ? Number(data.internal2) : undefined;
        const modelExam = data.modelExam !== undefined ? Number(data.modelExam) : undefined;
        const finalExam = data.finalExam !== undefined ? Number(data.finalExam) : undefined;

        let marks = await Marks.findOne({ studentId, courseId, semester });

        if (!marks) {
          marks = new Marks({
            studentId,
            courseId,
            semester,
            enteredBy: faculty._id,
            academicYear: academicYearStr,
            internal1: internal1 ?? 0,
            internal2: internal2 ?? 0,
            modelExam: modelExam ?? 0,
            finalExam: finalExam ?? 0,
          });
        } else {
          if (marks.verifiedByHOD) {
            results.push({ studentId, success: false, error: "Already verified by HOD" });
            continue;
          }
          marks.lastEditedBy = faculty._id;
          if (internal1 !== undefined) marks.internal1 = internal1;
          if (internal2 !== undefined) marks.internal2 = internal2;
          if (modelExam !== undefined) marks.modelExam = modelExam;
          if (finalExam !== undefined) marks.finalExam = finalExam;
        }

        await marks.save();
        results.push({ studentId, success: true });
      } catch (innerErr) {
        results.push({ studentId: data.studentId, success: false, error: innerErr.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (successCount === 0 && failCount > 0) {
      return res.status(500).json({
        error: "All marks failed to save",
        details: results,
      });
    }

    res.json({
      message: `Marks saved: ${successCount} succeeded, ${failCount} failed`,
      results,
      successCount,
      failCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};