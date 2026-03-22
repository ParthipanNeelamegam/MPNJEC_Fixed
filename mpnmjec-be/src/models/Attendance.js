import mongoose from "mongoose"

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  department: {
    type: String,
    required: true,
    lowercase: true,
  },
  date: {
    type: Date,
    required: true,
  },
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
  },
  status: {
    type: String,
    enum: ["present", "absent", "leave"],
    required: true,
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
  approvedByHOD: {
    type: Boolean,
    default: false,
  },
  hodRemarks: {
    type: String,
  },
}, { timestamps: true });

// Unique constraint: one attendance per student per course per date per period
attendanceSchema.index({ studentId: 1, courseId: 1, date: 1, period: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
