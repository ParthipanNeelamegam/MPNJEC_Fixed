import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  // Faculty who should approve (assigned faculty for student's department)
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
  },
  reviewedAt: {
    type: Date,
  },
  remarks: {
    type: String,
  },
}, { timestamps: true });

// Index for efficient queries
leaveSchema.index({ studentId: 1, date: 1 });
leaveSchema.index({ status: 1 });

export default mongoose.models.Leave || mongoose.model("Leave", leaveSchema);
