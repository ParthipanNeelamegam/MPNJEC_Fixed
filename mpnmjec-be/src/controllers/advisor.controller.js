import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import Marks from "../models/Marks.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

// ========================
// CLASS ADVISOR VALIDATION
// ========================

// Middleware to check if faculty is a class advisor
export const requireClassAdvisor = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const faculty = await Faculty.findOne({ userId });
    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }
    
    if (!faculty.isClassAdvisor) {
      return res.status(403).json({ error: "Access denied. Class Advisor privileges required." });
    }
    
    if (!faculty.advisorFor || !faculty.advisorFor.department || !faculty.advisorFor.year) {
      return res.status(400).json({ error: "Class Advisor assignment not configured properly" });
    }
    
    // Attach faculty and advisor info to request
    req.faculty = faculty;
    req.advisorFor = faculty.advisorFor;
    
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// ADVISOR PROFILE
// ========================

// GET /api/advisor/profile - Get advisor profile and class info
export const getAdvisorProfile = async (req, res) => {
  try {
    const faculty = req.faculty;
    const advisorFor = req.advisorFor;
    
    // Count students in advisor's class
    const studentCount = await Student.countDocuments({
      department: advisorFor.department,
      year: advisorFor.year,
      section: advisorFor.section || { $exists: true },
      status: "active",
    });
    
    await faculty.populate("userId", "name email");
    
    res.json({
      faculty: {
        _id: faculty._id,
        name: faculty.userId?.name,
        email: faculty.userId?.email,
        empId: faculty.empId,
        department: faculty.department,
        designation: faculty.designation,
      },
      advisorFor: {
        department: advisorFor.department,
        year: advisorFor.year,
        section: advisorFor.section,
        studentCount,
      },
      isClassAdvisor: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// STUDENT MANAGEMENT
// ========================

// GET /api/advisor/students - Get students in advisor's class
export const getAdvisorStudents = async (req, res) => {
  try {
    const advisorFor = req.advisorFor;
    const { page = 1, limit = 50, search } = req.query;
    
    const query = {
      department: advisorFor.department,
      year: advisorFor.year,
      status: "active",
    };
    
    if (advisorFor.section) {
      query.section = advisorFor.section;
    }
    
    // Search by name or roll number
    if (search) {
      const users = await User.find({ 
        name: { $regex: search, $options: "i" } 
      }).select("_id");
      const userIds = users.map(u => u._id);
      
      query.$or = [
        { userId: { $in: userIds } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }
    
    const students = await Student.find(query)
      .populate("userId", "name email")
      .sort({ rollNumber: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Student.countDocuments(query);
    
    res.json({
      students: students.map(s => ({
        _id: s._id,
        name: s.userId?.name,
        email: s.userId?.email,
        rollNumber: s.rollNumber,
        department: s.department,
        year: s.year,
        section: s.section,
        semester: s.semester,
        cgpa: s.cgpa,
        attendance: s.attendance,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/advisor/student/:id - Get student profile with marks
export const getStudentDetails = async (req, res) => {
  try {
    const advisorFor = req.advisorFor;
    const { id } = req.params;
    
    const student = await Student.findById(id).populate("userId", "name email");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    // Verify student belongs to advisor's class
    if (student.department !== advisorFor.department || 
        student.year !== advisorFor.year ||
        (advisorFor.section && student.section !== advisorFor.section)) {
      return res.status(403).json({ error: "Student not in your assigned class" });
    }
    
    // Get all marks for this student
    const marks = await Marks.find({ studentId: id })
      .populate("courseId", "code name department semester credits")
      .populate("enteredBy", "empId")
      .sort({ semester: 1, "courseId.code": 1 });
    
    // Group marks by semester
    const marksBySemester = marks.reduce((acc, m) => {
      const sem = m.semester;
      if (!acc[sem]) acc[sem] = [];
      acc[sem].push({
        _id: m._id,
        course: m.courseId ? {
          _id: m.courseId._id,
          code: m.courseId.code,
          name: m.courseId.name,
        } : null,
        internal1: m.internal1,
        internal2: m.internal2,
        modelExam: m.modelExam,
        finalExam: m.finalExam,
        total: m.total,
        grade: m.grade,
        isPassed: m.isPassed,
        status: m.status,
        isLocked: m.isLocked,
      });
      return acc;
    }, {});
    
    res.json({
      student: {
        _id: student._id,
        name: student.userId?.name,
        email: student.userId?.email,
        rollNumber: student.rollNumber,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dob: student.dob,
        mobile: student.mobile,
        parentMobile: student.parentMobile,
        address: student.address,
        department: student.department,
        year: student.year,
        section: student.section,
        semester: student.semester,
        admissionYear: student.admissionYear,
        cgpa: student.cgpa,
        attendance: student.attendance,
      },
      marksBySemester,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// MARKS MANAGEMENT
// ========================

// GET /api/advisor/courses - Get courses for advisor's class
export const getAdvisorCourses = async (req, res) => {
  try {
    const advisorFor = req.advisorFor;
    const { semester } = req.query;
    
    const query = {
      department: advisorFor.department,
      status: "active",
    };
    
    // Filter by semester if provided, otherwise get courses for current year
    if (semester) {
      query.semester = parseInt(semester);
    } else {
      // Year 1 = Sem 1,2; Year 2 = Sem 3,4; etc.
      const semStart = (advisorFor.year - 1) * 2 + 1;
      const semEnd = semStart + 1;
      query.semester = { $in: [semStart, semEnd] };
    }
    
    const courses = await Course.find(query).sort({ semester: 1, code: 1 });
    
    res.json({
      courses: courses.map(c => ({
        _id: c._id,
        code: c.code,
        name: c.name,
        semester: c.semester,
        credits: c.credits,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/advisor/marks - Add or update marks
export const addOrUpdateMarks = async (req, res) => {
  try {
    const faculty = req.faculty;
    const advisorFor = req.advisorFor;
    const { studentId, courseId, semester, internal1, internal2, modelExam, finalExam, reason } = req.body;
    
    // Validate required fields
    if (!studentId || !courseId || !semester) {
      return res.status(400).json({ error: "studentId, courseId, and semester are required" });
    }
    
    // Verify student belongs to advisor's class
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    if (student.department !== advisorFor.department || 
        student.year !== advisorFor.year ||
        (advisorFor.section && student.section !== advisorFor.section)) {
      return res.status(403).json({ error: "Student not in your assigned class" });
    }
    
    // Verify course exists and belongs to department
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    if (course.department !== advisorFor.department) {
      return res.status(403).json({ error: "Course not in your department" });
    }
    
    // Check if marks already exist
    let marks = await Marks.findOne({ studentId, courseId, semester });
    
    if (marks) {
      // Update existing marks
      if (marks.isLocked) {
        return res.status(403).json({ error: "Marks are locked and cannot be edited" });
      }
      
      // Store edit history
      marks.editHistory.push({
        editedBy: faculty._id,
        previousValues: {
          internal1: marks.internal1,
          internal2: marks.internal2,
          modelExam: marks.modelExam,
          finalExam: marks.finalExam,
        },
        reason: reason || "Updated by class advisor",
      });
      
      marks.internal1 = internal1 ?? marks.internal1;
      marks.internal2 = internal2 ?? marks.internal2;
      marks.modelExam = modelExam ?? marks.modelExam;
      marks.finalExam = finalExam ?? marks.finalExam;
      marks.lastEditedBy = faculty._id;
      marks.status = "submitted";
      marks.verifiedByHOD = false; // Reset verification on edit
      
      await marks.save();
      
      res.json({
        message: "Marks updated successfully",
        marks: {
          _id: marks._id,
          studentId: marks.studentId,
          courseId: marks.courseId,
          semester: marks.semester,
          internal1: marks.internal1,
          internal2: marks.internal2,
          modelExam: marks.modelExam,
          finalExam: marks.finalExam,
          total: marks.total,
          grade: marks.grade,
          isPassed: marks.isPassed,
          status: marks.status,
        },
      });
    } else {
      // Create new marks entry
      marks = new Marks({
        studentId,
        courseId,
        semester,
        internal1: internal1 || 0,
        internal2: internal2 || 0,
        modelExam: modelExam || 0,
        finalExam: finalExam || 0,
        enteredBy: faculty._id,
        status: "submitted",
      });
      
      await marks.save();
      
      res.status(201).json({
        message: "Marks added successfully",
        marks: {
          _id: marks._id,
          studentId: marks.studentId,
          courseId: marks.courseId,
          semester: marks.semester,
          internal1: marks.internal1,
          internal2: marks.internal2,
          modelExam: marks.modelExam,
          finalExam: marks.finalExam,
          total: marks.total,
          grade: marks.grade,
          isPassed: marks.isPassed,
          status: marks.status,
        },
      });
    }
  } catch (error) {
    // Handle duplicate entry error
    if (error.code === 11000) {
      return res.status(409).json({ error: "Marks already exist for this student, course, and semester" });
    }
    res.status(500).json({ error: error.message });
  }
};

// POST /api/advisor/marks/bulk - Bulk add/update marks for a course
export const bulkAddMarks = async (req, res) => {
  try {
    const faculty = req.faculty;
    const advisorFor = req.advisorFor;
    const { courseId, semester, marksData } = req.body;
    
    if (!courseId || !semester || !marksData || !Array.isArray(marksData)) {
      return res.status(400).json({ error: "courseId, semester, and marksData array are required" });
    }
    
    // Verify course
    const course = await Course.findById(courseId);
    if (!course || course.department !== advisorFor.department) {
      return res.status(403).json({ error: "Course not in your department" });
    }
    
    // Get students in advisor's class
    const studentQuery = {
      department: advisorFor.department,
      year: advisorFor.year,
      status: "active",
    };
    if (advisorFor.section) studentQuery.section = advisorFor.section;
    
    const validStudents = await Student.find(studentQuery).select("_id");
    const validStudentIds = validStudents.map(s => s._id.toString());
    
    const results = { success: [], failed: [] };
    
    for (const data of marksData) {
      const { studentId, internal1, internal2, modelExam, finalExam } = data;
      
      // Validate student belongs to class
      if (!validStudentIds.includes(studentId)) {
        results.failed.push({ studentId, error: "Student not in your class" });
        continue;
      }
      
      try {
        let marks = await Marks.findOne({ studentId, courseId, semester });
        
        if (marks) {
          if (marks.isLocked) {
            results.failed.push({ studentId, error: "Marks are locked" });
            continue;
          }
          
          marks.editHistory.push({
            editedBy: faculty._id,
            previousValues: {
              internal1: marks.internal1,
              internal2: marks.internal2,
              modelExam: marks.modelExam,
              finalExam: marks.finalExam,
            },
            reason: "Bulk update by class advisor",
          });
          
          marks.internal1 = internal1 ?? marks.internal1;
          marks.internal2 = internal2 ?? marks.internal2;
          marks.modelExam = modelExam ?? marks.modelExam;
          marks.finalExam = finalExam ?? marks.finalExam;
          marks.lastEditedBy = faculty._id;
          marks.status = "submitted";
          marks.verifiedByHOD = false;
          
          await marks.save();
        } else {
          marks = new Marks({
            studentId,
            courseId,
            semester,
            internal1: internal1 || 0,
            internal2: internal2 || 0,
            modelExam: modelExam || 0,
            finalExam: finalExam || 0,
            enteredBy: faculty._id,
            status: "submitted",
          });
          
          await marks.save();
        }
        
        results.success.push({
          studentId,
          marksId: marks._id,
          total: marks.total,
          grade: marks.grade,
        });
      } catch (err) {
        results.failed.push({ studentId, error: err.message });
      }
    }
    
    res.json({
      message: `Processed ${marksData.length} entries`,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/advisor/marks - Get marks for a course/semester
export const getMarks = async (req, res) => {
  try {
    const advisorFor = req.advisorFor;
    const { courseId, semester } = req.query;
    
    if (!courseId || !semester) {
      return res.status(400).json({ error: "courseId and semester are required" });
    }
    
    // Get students in class
    const studentQuery = {
      department: advisorFor.department,
      year: advisorFor.year,
      status: "active",
    };
    if (advisorFor.section) studentQuery.section = advisorFor.section;
    
    const students = await Student.find(studentQuery)
      .populate("userId", "name")
      .sort({ rollNumber: 1 });
    
    const studentIds = students.map(s => s._id);
    
    // Get marks for these students
    const marks = await Marks.find({
      studentId: { $in: studentIds },
      courseId,
      semester: parseInt(semester),
    });
    
    const marksMap = marks.reduce((acc, m) => {
      acc[m.studentId.toString()] = m;
      return acc;
    }, {});
    
    // Combine students with their marks
    const data = students.map(s => ({
      student: {
        _id: s._id,
        name: s.userId?.name,
        rollNumber: s.rollNumber,
      },
      marks: marksMap[s._id.toString()] ? {
        _id: marksMap[s._id.toString()]._id,
        internal1: marksMap[s._id.toString()].internal1,
        internal2: marksMap[s._id.toString()].internal2,
        modelExam: marksMap[s._id.toString()].modelExam,
        finalExam: marksMap[s._id.toString()].finalExam,
        total: marksMap[s._id.toString()].total,
        grade: marksMap[s._id.toString()].grade,
        isPassed: marksMap[s._id.toString()].isPassed,
        status: marksMap[s._id.toString()].status,
        isLocked: marksMap[s._id.toString()].isLocked,
      } : null,
    }));
    
    res.json({
      courseId,
      semester: parseInt(semester),
      data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// RESULT ANALYSIS
// ========================

// GET /api/advisor/result-analysis - Get class result analysis
export const getResultAnalysis = async (req, res) => {
  try {
    const advisorFor = req.advisorFor;
    const { semester } = req.query;
    
    if (!semester) {
      return res.status(400).json({ error: "semester is required" });
    }
    
    const analysis = await Marks.getClassAnalysis(
      advisorFor.department,
      advisorFor.year,
      advisorFor.section,
      parseInt(semester)
    );
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/advisor/semester-comparison - Compare results across semesters
export const getSemesterComparison = async (req, res) => {
  try {
    const advisorFor = req.advisorFor;
    
    // Get analysis for all possible semesters for this year
    const semStart = (advisorFor.year - 1) * 2 + 1;
    const semesters = [semStart, semStart + 1];
    
    const comparisons = [];
    
    for (const sem of semesters) {
      const analysis = await Marks.getClassAnalysis(
        advisorFor.department,
        advisorFor.year,
        advisorFor.section,
        sem
      );
      
      if (analysis.totalStudents > 0) {
        comparisons.push({
          semester: sem,
          totalStudents: analysis.totalStudents,
          passCount: analysis.passCount,
          failCount: analysis.failCount,
          passPercentage: analysis.passPercentage,
          averageMark: analysis.averageMark,
        });
      }
    }
    
    res.json({
      class: {
        department: advisorFor.department,
        year: advisorFor.year,
        section: advisorFor.section,
      },
      comparisons,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
