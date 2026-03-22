import User from "../models/User.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import HOD from "../models/HOD.js";
import Principal from "../models/Principal.js";
import Course from "../models/Course.js";
import Fee from "../models/Fee.js";
import Certificate from "../models/Certificate.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Helper: Generate cryptographically secure random password (10 chars)
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(10);
  return [...bytes].map(b => chars[b % chars.length]).join('');
};

// ========================
// STUDENT MANAGEMENT
// ========================

// POST /api/admin/students - Create Student
export const createStudent = async (req, res) => {
  try {
    let { 
      name, 
      email, 
      fatherName,
      motherName,
      dob,
      aadhaar,
      mobile,
      parentMobile,
      address,
      rollNumber, 
      department, 
      year, 
      section,
      admissionYear 
    } = req.body;

    // Normalize inputs
    name = name?.trim();
    email = email?.toLowerCase().trim();
    rollNumber = rollNumber?.toUpperCase().trim();
    department = department?.toLowerCase().trim();

    // Validate required fields
    if (!name || !email || !rollNumber || !department || !year) {
      return res.status(400).json({ error: "Name, email, roll number, department, and year are required" });
    }

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Check if username (rollNumber) already exists in User
    const existingUserByUsername = await User.findOne({ username: rollNumber.toLowerCase() });
    if (existingUserByUsername) {
      return res.status(400).json({ error: "Username (roll number) already exists" });
    }

    // Check if roll number is unique in Student
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({ error: "Roll number already exists" });
    }

    // Generate username (rollNumber) and password
    const username = rollNumber.toLowerCase();
    const generatedPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create User
    const user = await User.create({
      name,
      email,
      username,
      password: hashedPassword,
      role: "student",
      isActive: true,
    });

    // Create Student document
    const student = await Student.create({
      userId: user._id,
      rollNumber,
      fatherName: fatherName?.trim() || "",
      motherName: motherName?.trim() || "",
      dob: dob ? new Date(dob) : undefined,
      aadhaar: aadhaar?.trim() || "",
      mobile: mobile?.trim() || "",
      parentMobile: parentMobile?.trim() || "",
      address: address?.trim() || "",
      department,
      year: parseInt(year),
      section: section?.trim() || "",
      admissionYear: admissionYear ? parseInt(admissionYear) : new Date().getFullYear(),
      status: "active",
    });

    // Return success with credentials (password shown only once)
    res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: {
        id: student._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        section: student.section,
      },
      credentials: {
        username: username,
        password: generatedPassword, // Plain password returned only once
      },
    });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ error: error.message || "Failed to create student" });
  }
};

// GET /api/admin/students - Get All Students
export const getStudents = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Only include active students by default
    const filter = includeInactive === 'true' ? {} : { status: 'active' };
    
    const students = await Student.find(filter).populate("userId", "name email username");
    
    const formatted = students.map(s => ({
      id: s._id,
      userId: s.userId?._id,
      name: s.userId?.name,
      email: s.userId?.email,
      username: s.userId?.username,
      rollNumber: s.rollNumber,
      department: s.department,
      year: s.year,
      section: s.section,
      cgpa: s.cgpa,
      attendance: s.attendance,
      status: s.status,
    }));

    res.json({ students: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/students/:id - Update Student
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, rollNumber, department, year, section, cgpa, attendance, status } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Update User info if provided
    if (name || email) {
      const updateData = {};
      if (name) updateData.name = name.trim(); // preserve proper case (fix: was .toLowerCase())
      if (email) updateData.email = email.toLowerCase().trim();
      await User.findByIdAndUpdate(student.userId, updateData);
    }

    // Update Student info
    if (rollNumber) student.rollNumber = rollNumber.toUpperCase();
    if (department) student.department = department.toLowerCase();
    if (year) student.year = year;
    if (section !== undefined) student.section = section;
    if (cgpa !== undefined) student.cgpa = cgpa;
    if (attendance !== undefined) student.attendance = attendance;
    if (status) student.status = status;

    await student.save();

    const updatedStudent = await Student.findById(id).populate("userId", "name email username");

    res.json({
      message: "Student updated successfully",
      student: {
        id: updatedStudent._id,
        userId: updatedStudent.userId?._id,
        name: updatedStudent.userId?.name,
        email: updatedStudent.userId?.email,
        username: updatedStudent.userId?.username,
        rollNumber: updatedStudent.rollNumber,
        department: updatedStudent.department,
        year: updatedStudent.year,
        section: updatedStudent.section,
        cgpa: updatedStudent.cgpa,
        attendance: updatedStudent.attendance,
        status: updatedStudent.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/students/:id - Soft Delete Student
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Soft delete: Set student status to inactive
    student.status = "inactive";
    await student.save();

    // Set user isActive to false
    await User.findByIdAndUpdate(student.userId, { isActive: false });

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// FACULTY MANAGEMENT
// ========================

// POST /api/admin/faculty - Create Faculty
export const createFaculty = async (req, res) => {
  try {
    let { name, email, username, password, empId, department, designation, experience, coursesAssigned, phone } = req.body;

    // Normalize inputs
    name = name?.trim(); // preserve proper case (fix: was .toLowerCase())
    email = email?.toLowerCase();
    username = username?.toLowerCase();
    empId = empId?.toUpperCase();
    department = department?.toLowerCase();

    if (!name || !empId || !department) {
      return res.status(400).json({ error: "Name, employee ID, and department are required" });
    }

    // Generate username from empId if not provided
    const finalUsername = username || empId.toLowerCase();

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: finalUsername });
    if (existingUsername) {
      return res.status(400).json({ error: "User with this username already exists" });
    }

    // Check if empId is unique
    const existingFaculty = await Faculty.findOne({ empId });
    if (existingFaculty) {
      return res.status(400).json({ error: "Employee ID already exists" });
    }

    // Generate password if not provided
    const finalPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create User
    const user = await User.create({
      name,
      email: email || undefined,
      username: finalUsername,
      password: hashedPassword,
      role: "faculty",
      phone: phone?.trim() || '',
    });

    // Create Faculty document
    const faculty = await Faculty.create({
      userId: user._id,
      empId,
      department,
      designation: designation || "",
      experience: experience || 0,
      coursesAssigned: coursesAssigned || [],
      status: "active",
    });

    res.status(201).json({
      message: "Faculty created successfully",
      faculty: {
        id: faculty._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        empId: faculty.empId,
        department: faculty.department,
        designation: faculty.designation,
        experience: faculty.experience,
        coursesAssigned: faculty.coursesAssigned,
        status: faculty.status,
      },
      generatedPassword: password ? undefined : finalPassword,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/faculty - Get All Faculty
export const getFaculty = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Only include active faculty by default
    const filter = includeInactive === 'true' ? {} : { status: 'active' };
    
    const faculty = await Faculty.find(filter)
      .populate("userId", "name email username")
      .populate("assignedCourses", "code name department semester credits");
    
    const formatted = faculty.map(f => ({
      id: f._id,
      userId: f.userId?._id,
      name: f.userId?.name,
      email: f.userId?.email,
      username: f.userId?.username,
      empId: f.empId,
      department: f.department,
      designation: f.designation,
      experience: f.experience,
      assignedCourses: f.assignedCourses || [],
      status: f.status,
    }));

    res.json({ faculty: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/faculty/:id - Update Faculty
export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, empId, department, designation, experience, coursesAssigned, status, phone } = req.body;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Update User info if provided
    if (name || email || phone) {
      const updateData = {};
      if (name) updateData.name = name.trim(); // preserve proper case (fix: was .toLowerCase())
      if (email) updateData.email = email.toLowerCase().trim();
      if (phone) updateData.phone = phone.trim();
      await User.findByIdAndUpdate(faculty.userId, updateData);
    }

    // Update Faculty info
    if (empId) faculty.empId = empId.toUpperCase();
    if (department) faculty.department = department.toLowerCase();
    if (designation !== undefined) faculty.designation = designation;
    if (experience !== undefined) faculty.experience = experience;
    if (status) faculty.status = status;

    await faculty.save();

    const updatedFaculty = await Faculty.findById(id)
      .populate("userId", "name email username")
      .populate("assignedCourses", "code name department semester credits");

    res.json({
      message: "Faculty updated successfully",
      faculty: {
        id: updatedFaculty._id,
        userId: updatedFaculty.userId?._id,
        name: updatedFaculty.userId?.name,
        email: updatedFaculty.userId?.email,
        username: updatedFaculty.userId?.username,
        empId: updatedFaculty.empId,
        department: updatedFaculty.department,
        designation: updatedFaculty.designation,
        experience: updatedFaculty.experience,
        assignedCourses: updatedFaculty.assignedCourses || [],
        status: updatedFaculty.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/faculty/:id - Soft Delete Faculty
export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Soft delete
    faculty.status = "inactive";
    await faculty.save();

    await User.findByIdAndUpdate(faculty.userId, { isActive: false });

    res.json({ message: "Faculty deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/faculty/:id/assign-courses - Assign Courses to Faculty
export const assignCoursesToFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseIds } = req.body;

    if (!courseIds || !Array.isArray(courseIds)) {
      return res.status(400).json({ error: "courseIds array is required" });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Validate courses exist and match department
    const Course = (await import("../models/Course.js")).default;
    const courses = await Course.find({ _id: { $in: courseIds } });

    if (courses.length !== courseIds.length) {
      return res.status(400).json({ error: "Some courses not found" });
    }

    // Prevent duplicate assignments
    const existingCourseIds = faculty.assignedCourses.map(c => c.toString());
    const newCourseIds = courseIds.filter(cId => !existingCourseIds.includes(cId));

    faculty.assignedCourses = [...faculty.assignedCourses, ...newCourseIds];
    await faculty.save();

    const updatedFaculty = await Faculty.findById(id)
      .populate("userId", "name email username")
      .populate("assignedCourses", "code name department semester credits");

    res.json({
      message: "Courses assigned successfully",
      faculty: {
        id: updatedFaculty._id,
        name: updatedFaculty.userId?.name,
        assignedCourses: updatedFaculty.assignedCourses || [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/faculty/:facultyId/courses/:courseId - Remove Course from Faculty
export const removeCourseFromFaculty = async (req, res) => {
  try {
    const { facultyId, courseId } = req.params;

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    faculty.assignedCourses = faculty.assignedCourses.filter(
      (c) => c.toString() !== courseId
    );
    await faculty.save();

    const updatedFaculty = await Faculty.findById(facultyId)
      .populate("userId", "name email username")
      .populate("assignedCourses", "code name department semester credits year section");

    res.json({
      message: "Course removed from faculty",
      faculty: {
        id: updatedFaculty._id,
        name: updatedFaculty.userId?.name,
        assignedCourses: updatedFaculty.assignedCourses || [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// COURSE MANAGEMENT
// ========================

// POST /api/admin/courses - Create Course
export const createCourse = async (req, res) => {
  try {
    const Course = (await import("../models/Course.js")).default;
    let { code, name, department, semester, year, section, credits } = req.body;

    code = code?.toUpperCase();
    department = department?.toLowerCase();

    if (!code || !name || !department || !semester) {
      return res.status(400).json({ error: "Code, name, department, and semester are required" });
    }

    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({ error: "Course code already exists" });
    }

    const course = await Course.create({
      code,
      name,
      department,
      semester: parseInt(semester),
      year: year ? parseInt(year) : Math.ceil(parseInt(semester) / 2),
      section: section?.trim() || "",
      credits: credits || 3,
    });

    res.status(201).json({
      message: "Course created successfully",
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        department: course.department,
        semester: course.semester,
        year: course.year,
        section: course.section,
        credits: course.credits,
        status: course.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/courses - Get All Courses
export const getCourses = async (req, res) => {
  try {
    const Course = (await import("../models/Course.js")).default;
    const { department } = req.query;

    const filter = {};
    if (department) filter.department = department.toLowerCase();

    const courses = await Course.find(filter);

    res.json({
      courses: courses.map(c => ({
        id: c._id,
        code: c.code,
        name: c.name,
        department: c.department,
        semester: c.semester,
        year: c.year,
        section: c.section,
        credits: c.credits,
        status: c.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/courses/:id - Update Course
export const updateCourse = async (req, res) => {
  try {
    const Course = (await import("../models/Course.js")).default;
    const { id } = req.params;
    const { code, name, department, semester, credits, status } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (code) course.code = code.toUpperCase();
    if (name) course.name = name;
    if (department) course.department = department.toLowerCase();
    if (semester) course.semester = semester;
    if (credits !== undefined) course.credits = credits;
    if (status) course.status = status;

    await course.save();

    res.json({
      message: "Course updated successfully",
      course: {
        id: course._id,
        code: course.code,
        name: course.name,
        department: course.department,
        semester: course.semester,
        credits: course.credits,
        status: course.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// HOD MANAGEMENT
// ========================

// POST /api/admin/hod - Create/Assign HOD
export const createHOD = async (req, res) => {
  try {
    let { name, email, username, password, department, facultyId, phone } = req.body;

    // Normalize inputs
    department = department?.toLowerCase();

    if (!department) {
      return res.status(400).json({ error: "Department is required" });
    }

    // Check if HOD already exists for this department
    const existingHOD = await HOD.findOne({ department });
    if (existingHOD) {
      return res.status(400).json({ error: "HOD already exists for this department" });
    }

    let user;
    let generatedPassword = null;

    // If facultyId provided, promote existing faculty to HOD
    if (facultyId) {
      const faculty = await Faculty.findById(facultyId).populate("userId");
      if (!faculty) {
        return res.status(404).json({ error: "Faculty not found" });
      }

      // Update user role to HOD
      user = await User.findByIdAndUpdate(faculty.userId._id, { role: "hod" }, { new: true });
    } else {
      // Create new user for HOD
      name = name?.trim();
      email = email?.toLowerCase().trim();
      username = username?.toLowerCase().trim();

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const identifier = email || username;
      if (!identifier) {
        return res.status(400).json({ error: "Email or username is required" });
      }

      const existingUser = await User.findOne(email ? { email } : { username });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email/username already exists" });
      }

      generatedPassword = password || generatePassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      user = await User.create({
        name,
        email: email || undefined,
        username: username || undefined,
        password: hashedPassword,
        role: "hod",
        phone: phone?.trim() || '',
      });
    }

    // Create HOD document
    const hod = await HOD.create({
      userId: user._id,
      department,
    });

    const response = {
      message: "HOD assigned successfully",
      hod: {
        id: hod._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        department: hod.department,
      },
    };

    // Include credentials for new user creation (not faculty promotion)
    if (generatedPassword) {
      response.credentials = {
        username: user.username || user.email,
        password: generatedPassword,
      };
      response.generatedPassword = generatedPassword;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/hod - Get All HODs
export const getHODs = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    // Only include active HODs by default
    const filter = includeInactive === 'true' ? {} : { status: 'active' };
    
    const hods = await HOD.find(filter).populate("userId", "name email username phone");
    
    // Get faculty and student counts for each HOD's department
    const formatted = await Promise.all(hods.map(async (h) => {
      const facultyCount = await Faculty.countDocuments({ 
        department: h.department, 
        status: 'active' 
      });
      const studentCount = await Student.countDocuments({ 
        department: h.department, 
        status: 'active' 
      });
      
      return {
        id: h._id,
        userId: h.userId?._id,
        name: h.userId?.name,
        email: h.userId?.email,
        username: h.userId?.username,
        phone: h.userId?.phone || '',
        department: h.department,
        status: h.status || 'active',
        facultyCount,
        studentCount,
        joinedAt: h.createdAt,
      };
    }));

    res.json({ hods: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/hod/:id - Update HOD
export const updateHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, phone, status } = req.body;

    const hod = await HOD.findById(id).populate("userId");
    if (!hod) {
      return res.status(404).json({ error: "HOD not found" });
    }

    // Update HOD document if department changed
    if (department && department !== hod.department) {
      // Check if department already has an HOD
      const existingHOD = await HOD.findOne({ department: department.toLowerCase(), _id: { $ne: id } });
      if (existingHOD) {
        return res.status(400).json({ error: "Another HOD already exists for this department" });
      }
      hod.department = department.toLowerCase();
    }

    // Update status if provided
    if (status && ['active', 'inactive'].includes(status)) {
      hod.status = status;
      // Also update user isActive status
      if (hod.userId) {
        await User.findByIdAndUpdate(hod.userId._id, { isActive: status === 'active' });
      }
    }

    await hod.save();

    // Update user details if provided
    if (hod.userId) {
      const updates = {};
      if (name) {
        // Preserve proper case — capitalize each word
        updates.name = name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
      }
      if (phone !== undefined) updates.phone = phone.trim();

      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(hod.userId._id, updates);
      }
    }

    const updatedHOD = await HOD.findById(id).populate("userId", "name email username phone");

    res.json({
      message: "HOD updated successfully",
      hod: {
        id: updatedHOD._id,
        name: updatedHOD.userId?.name,
        email: updatedHOD.userId?.email,
        phone: updatedHOD.userId?.phone || '',
        department: updatedHOD.department,
        status: updatedHOD.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/hod/:id - Remove HOD (reverts to faculty)
export const deleteHOD = async (req, res) => {
  try {
    const { id } = req.params;

    const hod = await HOD.findById(id).populate("userId");
    if (!hod) {
      return res.status(404).json({ error: "HOD not found" });
    }

    // Revert user role to faculty
    if (hod.userId) {
      await User.findByIdAndUpdate(hod.userId._id, { role: "faculty" });
    }

    // Delete HOD document
    await HOD.findByIdAndDelete(id);

    res.json({ message: "HOD removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// PRINCIPAL MANAGEMENT
// ========================

// POST /api/admin/principal - Create Principal
export const createPrincipal = async (req, res) => {
  try {
    let { name, email, username, password, userId, hodId } = req.body;

    // Check if principal already exists
    const existingPrincipal = await Principal.findOne();
    if (existingPrincipal) {
      // If principal exists, we need to replace (delete old and create new)
      await Principal.deleteOne({ _id: existingPrincipal._id });
      // Revert old principal's user role
      if (existingPrincipal.userId) {
        await User.findByIdAndUpdate(existingPrincipal.userId, { role: "faculty" });
      }
    }

    let user;
    let generatedPassword = null;

    // If hodId provided, promote existing HOD to Principal
    if (hodId) {
      const hod = await HOD.findById(hodId).populate("userId");
      if (!hod) {
        return res.status(404).json({ error: "HOD not found" });
      }

      // Update user role to principal
      user = await User.findByIdAndUpdate(hod.userId._id, { role: "principal" }, { new: true });

      // Remove HOD document
      await HOD.deleteOne({ _id: hodId });
    } else if (userId) {
      // If userId provided, promote existing user to Principal
      user = await User.findByIdAndUpdate(userId, { role: "principal" }, { new: true });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
    } else {
      // Create new user for Principal
      name = name?.trim();
      email = email?.toLowerCase().trim();
      username = username?.toLowerCase().trim();

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const identifier = email || username;
      if (!identifier) {
        return res.status(400).json({ error: "Email or username is required" });
      }

      const existingUser = await User.findOne(email ? { email } : { username });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email/username already exists" });
      }

      generatedPassword = password || generatePassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      user = await User.create({
        name,
        email: email || undefined,
        username: username || undefined,
        password: hashedPassword,
        role: "principal",
      });
    }

    // Create Principal document
    const principal = await Principal.create({
      userId: user._id,
    });

    const response = {
      message: "Principal created successfully",
      principal: {
        id: principal._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    };

    // Include credentials for new user creation
    if (generatedPassword) {
      response.credentials = {
        username: user.username || user.email,
        password: generatedPassword,
      };
      response.generatedPassword = generatedPassword;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/principal - Get Principal
export const getPrincipal = async (req, res) => {
  try {
    const principal = await Principal.findOne().populate("userId", "name email username isActive");
    
    if (!principal) {
      return res.json({ principal: null });
    }

    res.json({
      principal: {
        id: principal._id,
        userId: principal.userId?._id,
        name: principal.userId?.name,
        email: principal.userId?.email,
        username: principal.userId?.username,
        status: principal.status || (principal.userId?.isActive ? 'active' : 'inactive'),
        isActive: principal.userId?.isActive ?? true,
        createdAt: principal.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/principal/:id - Update Principal
export const updatePrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, status } = req.body;

    const principal = await Principal.findById(id).populate("userId");
    if (!principal) {
      return res.status(404).json({ error: "Principal not found" });
    }

    // Update user details if provided
    if (principal.userId) {
      const updates = {};
      if (name) updates.name = name.trim();
      if (phone) updates.phone = phone;
      if (status) updates.isActive = status === 'active';
      
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(principal.userId._id, updates);
      }
    }

    // Update principal status
    if (status) {
      principal.status = status;
      await principal.save();
    }

    const updatedPrincipal = await Principal.findById(id).populate("userId", "name email username");
    
    res.json({
      message: "Principal updated successfully",
      principal: {
        id: updatedPrincipal._id,
        name: updatedPrincipal.userId?.name,
        email: updatedPrincipal.userId?.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/principal/:id - Remove Principal
export const deletePrincipal = async (req, res) => {
  try {
    const { id } = req.params;

    const principal = await Principal.findById(id).populate("userId");
    if (!principal) {
      return res.status(404).json({ error: "Principal not found" });
    }

    // Revert user role to faculty
    if (principal.userId) {
      await User.findByIdAndUpdate(principal.userId._id, { role: "faculty" });
    }

    // Delete Principal document
    await Principal.findByIdAndDelete(id);

    res.json({ message: "Principal removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// USER MANAGEMENT
// ========================

// GET /api/admin/users - Get all users with optional role filter
export const getAllUsers = async (req, res) => {
  try {
    const { role, department, status, page = 1, limit = 50 } = req.query;
    
    // Build user filter
    const userFilter = {};
    if (role) userFilter.role = role;
    if (status) userFilter.isActive = status === "active";

    // Get users
    const users = await User.find(userFilter)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Enrich with profile data based on role
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const baseUser = {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      // Add role-specific profile data
      switch (user.role) {
        case "student": {
          const student = await Student.findOne({ userId: user._id });
          if (student) {
            if (department && student.department !== department.toLowerCase()) return null;
            return {
              ...baseUser,
              rollNumber: student.rollNumber,
              department: student.department,
              year: student.year,
              section: student.section,
            };
          }
          break;
        }
        case "faculty": {
          const faculty = await Faculty.findOne({ userId: user._id });
          if (faculty) {
            if (department && faculty.department !== department.toLowerCase()) return null;
            return {
              ...baseUser,
              empId: faculty.empId,
              department: faculty.department,
              designation: faculty.designation,
            };
          }
          break;
        }
        case "hod": {
          const hod = await HOD.findOne({ userId: user._id });
          if (hod) {
            if (department && hod.department !== department.toLowerCase()) return null;
            return {
              ...baseUser,
              department: hod.department,
            };
          }
          break;
        }
        case "principal": {
          const principal = await Principal.findOne({ userId: user._id });
          if (principal) {
            return { ...baseUser };
          }
          break;
        }
        default:
          return baseUser;
      }
      return baseUser;
    }));

    // Filter out nulls (from department filter)
    const filteredUsers = enrichedUsers.filter(u => u !== null);
    
    const total = await User.countDocuments(userFilter);

    res.json({
      users: filteredUsers,
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

// GET /api/admin/users/:id - Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const baseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    // Get role-specific profile
    let profile = null;
    switch (user.role) {
      case "student":
        profile = await Student.findOne({ userId: user._id });
        break;
      case "faculty":
        profile = await Faculty.findOne({ userId: user._id }).populate("assignedCourses");
        break;
      case "hod":
        profile = await HOD.findOne({ userId: user._id });
        break;
      case "principal":
        profile = await Principal.findOne({ userId: user._id });
        break;
    }

    res.json({
      user: baseUser,
      profile,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// DASHBOARD STATS
// ========================

// GET /api/admin/dashboard/stats - Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalHODs,
      totalCourses,
      pendingLeaves,
      pendingCertificates,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "active" }),
      Faculty.countDocuments(),
      Faculty.countDocuments({ status: "active" }),
      HOD.countDocuments(),
      Course.countDocuments({ status: "active" }),
      Leave.countDocuments({ status: "pending" }),
      Certificate.countDocuments({ status: "pending" }),
    ]);

    // Get department-wise student count
    const departmentStats = await Student.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get year-wise student count
    const yearStats = await Student.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Get recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentStudents = await Student.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    const recentFaculty = await Faculty.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    res.json({
      stats: {
        totalStudents,
        activeStudents,
        totalFaculty,
        activeFaculty,
        totalHODs,
        totalCourses,
        pendingLeaves,
        pendingCertificates,
      },
      departmentStats,
      yearStats,
      recentActivity: {
        newStudents: recentStudents,
        newFaculty: recentFaculty,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/dashboard/chart-data - Get chart data for dashboard
export const getDashboardChartData = async (req, res) => {
  try {
    // Department-wise student distribution
    const departmentDistribution = await Student.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$department", students: { $sum: 1 } } },
      { $project: { department: { $toUpper: "$_id" }, students: 1, _id: 0 } },
      { $sort: { students: -1 } },
    ]);

    // Monthly enrollment trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentTrend = await Student.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Attendance overview (average by department)
    const attendanceOverview = await Attendance.aggregate([
      {
        $group: {
          _id: "$studentId",
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $group: {
          _id: "$student.department",
          avgAttendance: {
            $avg: {
              $multiply: [
                { $divide: ["$presentClasses", { $max: ["$totalClasses", 1] }] },
                100,
              ],
            },
          },
        },
      },
      { $project: { department: { $toUpper: "$_id" }, attendance: { $round: ["$avgAttendance", 1] }, _id: 0 } },
    ]);

    res.json({
      departmentDistribution,
      enrollmentTrend,
      attendanceOverview,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// FEE MANAGEMENT
// ========================

// GET /api/admin/fees - Get all fee records
export const getFeeRecords = async (req, res) => {
  try {
    const { department, status, academicYear, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    let fees = await Fee.find(filter)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Filter by department if specified
    if (department) {
      fees = fees.filter(
        (f) => f.studentId?.department?.toLowerCase() === department.toLowerCase()
      );
    }

    const feeRecords = fees.map((fee) => ({
      _id: fee._id,
      studentId: fee.studentId?._id,
      studentName: fee.studentId?.userId?.name || "Unknown",
      email: fee.studentId?.userId?.email,
      rollNumber: fee.studentId?.rollNumber,
      department: fee.studentId?.department?.toUpperCase(),
      year: fee.studentId?.year,
      academicYear: fee.academicYear,
      semester: fee.semester,
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      pendingAmount: fee.pendingAmount,
      dueDate: fee.dueDate,
      status: fee.status,
      lastPaymentDate: fee.payments?.length > 0 
        ? fee.payments[fee.payments.length - 1].date 
        : null,
    }));

    const total = await Fee.countDocuments(filter);

    res.json({
      fees: feeRecords,
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

// GET /api/admin/fees/summary - Get fee summary by department
export const getFeeSummary = async (req, res) => {
  try {
    const summary = await Fee.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $group: {
          _id: "$student.department",
          totalStudents: { $addToSet: "$studentId" },
          totalAmount: { $sum: "$totalAmount" },
          collectedAmount: { $sum: "$paidAmount" },
          pendingAmount: { $sum: "$pendingAmount" },
        },
      },
      {
        $project: {
          department: { $toUpper: "$_id" },
          totalStudents: { $size: "$totalStudents" },
          totalAmount: 1,
          collectedAmount: 1,
          pendingAmount: 1,
          collectionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$collectedAmount", { $max: ["$totalAmount", 1] }] },
                  100,
                ],
              },
              1,
            ],
          },
          _id: 0,
        },
      },
      { $sort: { department: 1 } },
    ]);

    // Overall summary
    const overall = await Fee.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          collectedAmount: { $sum: "$paidAmount" },
          pendingAmount: { $sum: "$pendingAmount" },
          totalRecords: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      departmentSummary: summary,
      overall: overall[0] || {
        totalAmount: 0,
        collectedAmount: 0,
        pendingAmount: 0,
        totalRecords: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/fees - Create fee record for student
export const createFeeRecord = async (req, res) => {
  try {
    const { studentId, academicYear, semester, feeStructure, totalAmount, dueDate } = req.body;

    if (!studentId || !academicYear || !semester || !totalAmount || !dueDate) {
      return res.status(400).json({ 
        error: "Student ID, academic year, semester, total amount, and due date are required" 
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if fee record already exists
    const existingFee = await Fee.findOne({ studentId, academicYear, semester });
    if (existingFee) {
      return res.status(400).json({ 
        error: "Fee record already exists for this student, academic year, and semester" 
      });
    }

    const fee = await Fee.create({
      studentId,
      academicYear,
      semester,
      feeStructure: feeStructure || [],
      totalAmount,
      dueDate: new Date(dueDate),
    });

    res.status(201).json({ message: "Fee record created successfully", fee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/fees/:id - Update fee record
export const updateFeeRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { feeStructure, totalAmount, dueDate, status } = req.body;

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ error: "Fee record not found" });
    }

    if (feeStructure) fee.feeStructure = feeStructure;
    if (totalAmount) fee.totalAmount = totalAmount;
    if (dueDate) fee.dueDate = new Date(dueDate);
    if (status) fee.status = status;

    await fee.save();

    res.json({ message: "Fee record updated successfully", fee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/admin/fees/:id/payment - Record a payment
export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, transactionId, remarks } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }

    const fee = await Fee.findById(id);
    if (!fee) {
      return res.status(404).json({ error: "Fee record not found" });
    }

    if (amount > fee.pendingAmount) {
      return res.status(400).json({ error: "Payment amount exceeds pending amount" });
    }

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    fee.payments.push({
      amount,
      method: method || "online",
      transactionId,
      receiptNumber,
      remarks,
    });

    fee.paidAmount += amount;
    await fee.save();

    res.json({ 
      message: "Payment recorded successfully", 
      fee,
      receipt: {
        receiptNumber,
        amount,
        date: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// CERTIFICATE MANAGEMENT
// ========================

// GET /api/admin/certificates - Get all certificate requests
export const getCertificateRequests = async (req, res) => {
  try {
    const { status, type, department, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    let certificates = await Certificate.find(filter)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("reviewedBy", "name")
      .sort({ appliedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Filter by department if specified
    if (department) {
      certificates = certificates.filter(
        (c) => c.studentId?.department?.toLowerCase() === department.toLowerCase()
      );
    }

    const certificateList = certificates.map((cert) => ({
      _id: cert._id,
      studentId: cert.studentId?._id,
      studentName: cert.studentId?.userId?.name || "Unknown",
      email: cert.studentId?.userId?.email,
      rollNumber: cert.studentId?.rollNumber,
      department: cert.studentId?.department?.toUpperCase(),
      year: cert.studentId?.year,
      type: cert.type,
      typeName: cert.typeName,
      purpose: cert.purpose,
      copies: cert.copies,
      fee: cert.fee,
      isPaid: cert.isPaid,
      status: cert.status,
      appliedAt: cert.appliedAt,
      reviewedAt: cert.reviewedAt,
      reviewedBy: cert.reviewedBy?.name,
      remarks: cert.remarks,
      certificateNumber: cert.certificateNumber,
    }));

    const total = await Certificate.countDocuments(filter);

    res.json({
      certificates: certificateList,
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

// PUT /api/admin/certificates/:id - Update certificate status
export const updateCertificateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ error: "Certificate request not found" });
    }

    const validStatuses = ["pending", "approved", "rejected", "processing", "ready", "collected"];
    // Accept both cases — normalize to lowercase
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (normalizedStatus) {
      certificate.status = normalizedStatus;
      certificate.reviewedAt = new Date();
      certificate.reviewedBy = req.user.id || req.user._id;
    }
    if (remarks) certificate.remarks = remarks;

    await certificate.save();

    res.json({ message: "Certificate status updated successfully", certificate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/certificates/stats - Get certificate statistics
export const getCertificateStats = async (req, res) => {
  try {
    const stats = await Certificate.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = await Certificate.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const statusMap = {};
    stats.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    res.json({
      byStatus: {
        pending: statusMap.pending || 0,
        approved: statusMap.approved || 0,
        rejected: statusMap.rejected || 0,
        processing: statusMap.processing || 0,
        ready: statusMap.ready || 0,
        collected: statusMap.collected || 0,
      },
      byType: typeStats,
      total: stats.reduce((sum, s) => sum + s.count, 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========================
// LIBRARIAN MANAGEMENT
// ========================

// POST /api/admin/librarian - Create Librarian
export const createLibrarian = async (req, res) => {
  try {
    let { name, email, username, password, empId } = req.body;

    name = name?.trim();
    email = email?.toLowerCase()?.trim();
    username = username?.toLowerCase()?.trim();
    empId = empId?.toUpperCase()?.trim();

    if (!name || !empId) {
      return res.status(400).json({ error: "Name and employee ID are required" });
    }

    const finalUsername = username || empId.toLowerCase();

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
    }

    const existingUsername = await User.findOne({ username: finalUsername });
    if (existingUsername) {
      return res.status(400).json({ error: "User with this username already exists" });
    }

    const finalPassword = password || generatePassword();
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const user = await User.create({
      name,
      email: email || undefined,
      username: finalUsername,
      password: hashedPassword,
      role: "librarian",
      isActive: true,
    });

    res.status(201).json({
      message: "Librarian created successfully",
      librarian: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        empId,
        status: "active",
      },
      generatedPassword: password ? undefined : finalPassword,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/admin/librarian - Get All Librarians
export const getLibrarians = async (req, res) => {
  try {
    const filter = { role: "librarian" };
    const { includeInactive } = req.query;
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    const librarians = await User.find(filter).select("name email username isActive createdAt");

    const formatted = librarians.map((l) => ({
      id: l._id,
      name: l.name,
      email: l.email,
      username: l.username,
      status: l.isActive ? "active" : "inactive",
      createdAt: l.createdAt,
    }));

    res.json({ librarians: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/admin/librarian/:id - Update Librarian
export const updateLibrarian = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status } = req.body;

    const user = await User.findOne({ _id: id, role: "librarian" });
    if (!user) {
      return res.status(404).json({ error: "Librarian not found" });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (status === "active") user.isActive = true;
    if (status === "inactive") user.isActive = false;

    await user.save();

    res.json({
      message: "Librarian updated successfully",
      librarian: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        status: user.isActive ? "active" : "inactive",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/admin/librarian/:id - Delete Librarian
export const deleteLibrarian = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: "librarian" });
    if (!user) {
      return res.status(404).json({ error: "Librarian not found" });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "Librarian deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};