import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
  // Core scheduling fields
  department: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
  },
  // Academic year (BE 1-4)
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
    index: true,
  },
  // Section within the year
  section: {
    type: String,
    required: true,
    default: "A",
    index: true,
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
    index: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },
  dayOfWeek: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    required: true,
    index: true,
  },
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
  },
  
  // Slot details
  subject: {
    type: String,
  },
  className: {
    type: String,
  },
  classroom: {
    type: String,
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdByRole: {
    type: String,
    enum: ["hod", "superuser"],
    default: "hod",
  },
  
  // Semester info
  semesterStart: Date,
  semesterEnd: Date,
  academicYear: String,
  
  // Conflict override (for superuser)
  conflictOverride: {
    type: Boolean,
    default: false,
  },
  overrideReason: String,
  
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  
  // Legacy support - keep periods array for backward compatibility
  day: String,
  periods: [
    {
      periodNo: Number,
      subject: String,
      className: String,
      startTime: String,
      endTime: String,
    },
  ],
}, { timestamps: true });

// Compound index to prevent duplicate scheduling in same slot (same class)
// No two entries for same dept+year+section+day+period
timetableSchema.index(
  { department: 1, year: 1, section: 1, dayOfWeek: 1, period: 1 }, 
  { unique: true }
);

// Index for faculty conflict detection (GLOBAL across departments)
// Faculty can't teach two classes at the same time
timetableSchema.index({ facultyId: 1, dayOfWeek: 1, period: 1 }, { unique: true });

// Index for classroom conflict detection
// Same classroom can't be used by two classes at same time
timetableSchema.index(
  { classroom: 1, dayOfWeek: 1, period: 1 }, 
  { unique: true, 
    sparse: true,
    partialFilterExpression: { classroom: { $exists: true, $ne: "", $ne: null } }
  }
);

// Index for quick schedule lookups
timetableSchema.index({ department: 1, year: 1, section: 1, dayOfWeek: 1, status: 1 });
timetableSchema.index({ facultyId: 1, dayOfWeek: 1, status: 1 });

// Static method to check for conflicts before inserting
timetableSchema.statics.checkConflicts = async function(entry, excludeId = null) {
  const conflicts = [];
  const query = {
    _id: { $ne: excludeId },
    status: "active",
  };

  // 1. Check same class slot conflict
  const classConflict = await this.findOne({
    ...query,
    department: entry.department,
    year: entry.year,
    section: entry.section,
    dayOfWeek: entry.dayOfWeek,
    period: entry.period,
  }).populate("facultyId", "userId").populate("courseId", "name code");

  if (classConflict) {
    conflicts.push({
      type: "CLASS_SLOT",
      message: `This slot (${entry.dayOfWeek} Period ${entry.period}) is already assigned to another subject for Year ${entry.year} Section ${entry.section}`,
      existing: classConflict,
    });
  }

  // 2. Check faculty conflict (global)
  const facultyConflict = await this.findOne({
    ...query,
    facultyId: entry.facultyId,
    dayOfWeek: entry.dayOfWeek,
    period: entry.period,
  }).populate("courseId", "name code");

  if (facultyConflict) {
    conflicts.push({
      type: "FACULTY",
      message: `This faculty is already scheduled for another class at ${entry.dayOfWeek} Period ${entry.period}`,
      existing: facultyConflict,
    });
  }

  // 3. Check classroom conflict
  if (entry.classroom) {
    const roomConflict = await this.findOne({
      ...query,
      classroom: entry.classroom,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
    });

    if (roomConflict) {
      conflicts.push({
        type: "CLASSROOM",
        message: `Classroom ${entry.classroom} is already occupied at ${entry.dayOfWeek} Period ${entry.period}`,
        existing: roomConflict,
      });
    }
  }

  return conflicts;
};

export default mongoose.models.Timetable || mongoose.model("Timetable", timetableSchema);
