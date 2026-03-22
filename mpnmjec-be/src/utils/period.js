import PeriodConfig from "../models/PeriodConfig.js";

/**
 * Get current period based on server time
 * @returns {Object} { currentPeriod, allPeriods, serverTime, canEdit: boolean }
 */
export const getCurrentPeriod = async () => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  const currentMinutes = timeToMinutes(currentTime);

  const periods = await PeriodConfig.find({ isBreak: { $ne: true } }).sort({ periodNumber: 1 });

  if (periods.length === 0) {
    // Seed default periods if none exist
    await PeriodConfig.seedDefaultPeriods();
    return getCurrentPeriod(); // Retry
  }

  let activePeriod = null;
  let editablePeriods = [];

  for (const period of periods) {
    const startMinutes = timeToMinutes(period.startTime);
    const endMinutes = timeToMinutes(period.endTime);
    const editWindowEnd = endMinutes + 15; // 15 minute edit window after period ends

    // Check if current time is within this period
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      activePeriod = period.periodNumber;
    }

    // Check if period is still editable (within 15 minutes of end)
    if (currentMinutes >= startMinutes && currentMinutes <= editWindowEnd) {
      editablePeriods.push(period.periodNumber);
    }
  }

  return {
    currentPeriod: activePeriod,
    editablePeriods,
    allPeriods: periods.map(p => ({
      periodNumber: p.periodNumber,
      startTime: p.startTime,
      endTime: p.endTime,
      isActive: p.periodNumber === activePeriod,
      canEdit: editablePeriods.includes(p.periodNumber),
    })),
    serverTime: now.toISOString(),
    currentTimeFormatted: currentTime,
  };
};

/**
 * Check if a specific period is currently editable
 * @param {Number} periodNumber 
 * @returns {Object} { canEdit, reason }
 */
export const canEditPeriod = async (periodNumber) => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentMinutes = timeToMinutes(currentTime);

  const period = await PeriodConfig.findOne({ periodNumber });
  if (!period) {
    return { canEdit: false, reason: "Period not found" };
  }

  const startMinutes = timeToMinutes(period.startTime);
  const endMinutes = timeToMinutes(period.endTime);
  const editWindowEnd = endMinutes + 15;

  // Period hasn't started yet
  if (currentMinutes < startMinutes) {
    return { canEdit: false, reason: "Period hasn't started yet" };
  }

  // Within edit window (period active or within 15 minutes after)
  if (currentMinutes <= editWindowEnd) {
    return { canEdit: true, reason: "Within edit window" };
  }

  // Past edit window
  return { canEdit: false, reason: "Edit window has closed (15 minutes after period end)" };
};

/**
 * Get period configuration by period number
 * @param {Number} periodNumber 
 * @returns {Object} period config
 */
export const getPeriodConfig = async (periodNumber) => {
  return await PeriodConfig.findOne({ periodNumber });
};

/**
 * Convert time string to minutes from midnight
 * @param {String} time - "HH:MM" format
 * @returns {Number} minutes from midnight
 */
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if today is a working day (not Sunday)
 * @returns {Boolean}
 */
export const isWorkingDay = () => {
  const today = new Date();
  return today.getDay() !== 0; // 0 is Sunday
};

/**
 * Get attendance statistics for a date range
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {String} department 
 * @returns {Object} statistics
 */
export const getAttendanceStats = async (startDate, endDate, department) => {
  const Attendance = (await import("../models/Attendance.js")).default;
  
  const filter = {
    date: { $gte: startDate, $lte: endDate },
  };
  if (department) filter.department = department.toLowerCase();

  const records = await Attendance.find(filter);
  
  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  const absent = records.filter(r => r.status === "absent").length;
  const leave = records.filter(r => r.status === "leave").length;

  return {
    total,
    present,
    absent,
    leave,
    presentPercentage: total ? Math.round((present / total) * 100) : 0,
  };
};
