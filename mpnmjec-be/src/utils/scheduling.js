import TimeTable from "../models/TimeTable.js";
import Faculty from "../models/Faculty.js";
import Course from "../models/Course.js";
import PeriodConfig from "../models/PeriodConfig.js";

/**
 * Scheduling Utility - Conflict-Free Scheduling Engine
 * Provides global conflict detection across all departments
 */

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_PERIODS = 8;

/**
 * Check if a faculty is available for a specific day and period
 * @param {ObjectId} facultyId - Faculty ID
 * @param {string} dayOfWeek - Day of week
 * @param {number} period - Period number (1-8)
 * @returns {Promise<{available: boolean, conflict: object|null}>}
 */
export const checkFacultyAvailability = async (facultyId, dayOfWeek, period) => {
  const existingSchedule = await TimeTable.findOne({
    facultyId,
    dayOfWeek,
    period,
    status: "active",
  }).populate("courseId", "code name").populate({
    path: "facultyId",
    select: "department",
  });

  if (existingSchedule) {
    return {
      available: false,
      conflict: {
        type: "faculty",
        message: `Faculty already scheduled in ${existingSchedule.department} department at this time`,
        details: {
          department: existingSchedule.department,
          subject: existingSchedule.subject,
          className: existingSchedule.className,
          classroom: existingSchedule.classroom,
        },
      },
    };
  }

  return { available: true, conflict: null };
};

/**
 * Check if a classroom is available for a specific day and period
 * @param {string} classroom - Classroom name/number
 * @param {string} dayOfWeek - Day of week
 * @param {number} period - Period number (1-8)
 * @param {string} department - Department (optional, for same-department check)
 * @returns {Promise<{available: boolean, conflict: object|null}>}
 */
export const checkClassroomAvailability = async (classroom, dayOfWeek, period, department = null) => {
  if (!classroom) return { available: true, conflict: null };

  const query = {
    classroom,
    dayOfWeek,
    period,
    status: "active",
  };

  const existingSchedule = await TimeTable.findOne(query)
    .populate("facultyId", "department")
    .populate("courseId", "code name");

  if (existingSchedule) {
    return {
      available: false,
      conflict: {
        type: "classroom",
        message: `Classroom ${classroom} already booked at this time`,
        details: {
          department: existingSchedule.department,
          subject: existingSchedule.subject,
          className: existingSchedule.className,
          faculty: existingSchedule.facultyId,
        },
      },
    };
  }

  return { available: true, conflict: null };
};

/**
 * Validate all conflicts before scheduling
 * @param {Object} scheduleData - The schedule data to validate
 * @returns {Promise<{valid: boolean, conflicts: Array}>}
 */
export const validateScheduleConflicts = async (scheduleData) => {
  const { facultyId, dayOfWeek, period, classroom, courseId, department } = scheduleData;
  const conflicts = [];

  // 1. Check faculty availability (GLOBAL across all departments)
  const facultyCheck = await checkFacultyAvailability(facultyId, dayOfWeek, period);
  if (!facultyCheck.available) {
    conflicts.push(facultyCheck.conflict);
  }

  // 2. Check classroom availability
  if (classroom) {
    const classroomCheck = await checkClassroomAvailability(classroom, dayOfWeek, period, department);
    if (!classroomCheck.available) {
      conflicts.push(classroomCheck.conflict);
    }
  }

  // 3. Validate course belongs to department or faculty has permission
  if (courseId) {
    const course = await Course.findById(courseId);
    const faculty = await Faculty.findById(facultyId);
    
    if (course && faculty) {
      const facultyDepartments = faculty.getAllDepartments();
      if (course.department !== department && !facultyDepartments.includes(course.department)) {
        conflicts.push({
          type: "permission",
          message: `Faculty doesn't have permission to teach this course in ${department}`,
          details: {
            courseDepartment: course.department,
            facultyDepartment: faculty.department,
            facultySecondaryDepartments: faculty.secondaryDepartments,
          },
        });
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
};

/**
 * Get faculty availability for an entire day
 * @param {ObjectId} facultyId - Faculty ID
 * @param {string} dayOfWeek - Day of week
 * @returns {Promise<Object>} - Availability map with period details
 */
export const getFacultyDayAvailability = async (facultyId, dayOfWeek) => {
  // Get all scheduled periods for this faculty on this day
  const scheduled = await TimeTable.find({
    facultyId,
    dayOfWeek,
    status: "active",
  }).populate("courseId", "code name");

  // Get period configurations
  const periodConfigs = await PeriodConfig.find({}).sort({ periodNumber: 1 });
  
  // Build availability map
  const availability = {};
  const bookedPeriods = {};
  
  scheduled.forEach(entry => {
    bookedPeriods[entry.period] = {
      department: entry.department,
      subject: entry.subject,
      className: entry.className,
      classroom: entry.classroom,
      course: entry.courseId,
    };
  });

  // Use period configs if available, otherwise use defaults
  const periods = periodConfigs.length > 0 ? periodConfigs : [
    { periodNumber: 1, startTime: "09:00", endTime: "09:50" },
    { periodNumber: 2, startTime: "09:50", endTime: "10:40" },
    { periodNumber: 3, startTime: "10:55", endTime: "11:45" },
    { periodNumber: 4, startTime: "11:45", endTime: "12:35" },
    { periodNumber: 5, startTime: "13:30", endTime: "14:20" },
    { periodNumber: 6, startTime: "14:20", endTime: "15:10" },
    { periodNumber: 7, startTime: "15:25", endTime: "16:15" },
    { periodNumber: 8, startTime: "16:15", endTime: "17:05" },
  ];

  periods.forEach(p => {
    const periodNum = p.periodNumber;
    const booked = bookedPeriods[periodNum];
    
    availability[periodNum] = {
      period: periodNum,
      startTime: p.startTime,
      endTime: p.endTime,
      isAvailable: !booked,
      isBreak: p.isBreak || false,
      booking: booked || null,
    };
  });

  const freePeriods = Object.values(availability).filter(p => p.isAvailable && !p.isBreak).map(p => p.period);
  const occupiedPeriods = Object.values(availability).filter(p => !p.isAvailable).map(p => ({
    period: p.period,
    ...p.booking,
  }));

  return {
    facultyId,
    dayOfWeek,
    availability,
    summary: {
      totalPeriods: MAX_PERIODS,
      freePeriods,
      freeCount: freePeriods.length,
      occupiedPeriods,
      occupiedCount: occupiedPeriods.length,
    },
  };
};

/**
 * Get faculty weekly availability overview
 * @param {ObjectId} facultyId - Faculty ID
 * @returns {Promise<Object>} - Weekly availability
 */
export const getFacultyWeeklyAvailability = async (facultyId) => {
  const weeklyAvailability = {};
  
  for (const day of DAYS_OF_WEEK) {
    weeklyAvailability[day] = await getFacultyDayAvailability(facultyId, day);
  }

  // Calculate weekly stats
  let totalFree = 0;
  let totalOccupied = 0;
  
  Object.values(weeklyAvailability).forEach(dayData => {
    totalFree += dayData.summary.freeCount;
    totalOccupied += dayData.summary.occupiedCount;
  });

  return {
    facultyId,
    availability: weeklyAvailability,
    weeklySummary: {
      totalWorkingDays: DAYS_OF_WEEK.length,
      totalPeriods: DAYS_OF_WEEK.length * MAX_PERIODS,
      totalFree,
      totalOccupied,
      utilizationPercent: ((totalOccupied / (DAYS_OF_WEEK.length * MAX_PERIODS)) * 100).toFixed(1),
    },
  };
};

/**
 * Get all available faculty for a specific slot
 * @param {string} department - Department to filter by (optional)
 * @param {string} dayOfWeek - Day of week
 * @param {number} period - Period number
 * @returns {Promise<Array>} - List of available faculty
 */
export const getAvailableFacultyForSlot = async (department, dayOfWeek, period) => {
  // Get all booked faculty for this slot
  const bookedSlots = await TimeTable.find({
    dayOfWeek,
    period,
    status: "active",
  }).select("facultyId");

  const bookedFacultyIds = bookedSlots.map(s => s.facultyId.toString());

  // Build faculty query
  const facultyQuery = { status: "active" };
  if (department) {
    facultyQuery.$or = [
      { department },
      { secondaryDepartments: department },
    ];
  }

  const allFaculty = await Faculty.find(facultyQuery)
    .populate("userId", "name email")
    .populate("assignedCourses", "code name");

  // Filter to only available faculty
  const availableFaculty = allFaculty.filter(f => !bookedFacultyIds.includes(f._id.toString()));

  return availableFaculty.map(f => ({
    _id: f._id,
    name: f.userId?.name,
    email: f.userId?.email,
    empId: f.empId,
    department: f.department,
    isSharedFaculty: f.secondaryDepartments && f.secondaryDepartments.length > 0,
    secondaryDepartments: f.secondaryDepartments || [],
    assignedCourses: f.assignedCourses,
  }));
};

/**
 * Get department schedule for a day
 * @param {string} department - Department name
 * @param {string} dayOfWeek - Day of week
 * @returns {Promise<Array>} - Schedule entries
 */
export const getDepartmentDaySchedule = async (department, dayOfWeek) => {
  const schedule = await TimeTable.find({
    department,
    dayOfWeek,
    status: "active",
  })
    .populate("facultyId", "empId")
    .populate("courseId", "code name")
    .populate({
      path: "facultyId",
      populate: { path: "userId", select: "name" },
    })
    .sort({ period: 1 });

  return schedule.map(entry => ({
    _id: entry._id,
    period: entry.period,
    subject: entry.subject,
    className: entry.className,
    section: entry.section,
    classroom: entry.classroom,
    faculty: {
      _id: entry.facultyId?._id,
      name: entry.facultyId?.userId?.name,
      empId: entry.facultyId?.empId,
    },
    course: entry.courseId ? {
      _id: entry.courseId._id,
      code: entry.courseId.code,
      name: entry.courseId.name,
    } : null,
  }));
};

/**
 * Check if faculty can teach in a department
 * @param {ObjectId} facultyId - Faculty ID
 * @param {string} department - Department name
 * @returns {Promise<boolean>}
 */
export const canFacultyTeachInDepartment = async (facultyId, department) => {
  const faculty = await Faculty.findById(facultyId);
  if (!faculty) return false;

  const allDepartments = faculty.getAllDepartments();
  return allDepartments.includes(department);
};

/**
 * Log scheduling conflict for audit
 * @param {Object} conflictData - Conflict details
 */
export const logSchedulingConflict = async (conflictData) => {
  // For future: Save to ConflictLog collection for audit trail
  console.log("[Scheduling Conflict]", JSON.stringify(conflictData, null, 2));
};

export default {
  checkFacultyAvailability,
  checkClassroomAvailability,
  validateScheduleConflicts,
  getFacultyDayAvailability,
  getFacultyWeeklyAvailability,
  getAvailableFacultyForSlot,
  getDepartmentDaySchedule,
  canFacultyTeachInDepartment,
  logSchedulingConflict,
  DAYS_OF_WEEK,
  MAX_PERIODS,
};
