import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ["attendance", "performance", "fee", "academic", "faculty", "student", "department", "custom"],
    required: true,
  },
  category: {
    type: String,
    enum: ["daily", "weekly", "monthly", "semester", "annual", "custom"],
    default: "monthly",
  },
  department: {
    type: String,
  },
  year: {
    type: Number,
  },
  section: {
    type: String,
  },
  semester: {
    type: Number,
  },
  academicYear: {
    type: String,
  },
  dateRange: {
    start: Date,
    end: Date,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  generatedByRole: {
    type: String,
    enum: ["admin", "hod", "principal", "faculty"],
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  fileUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ["generating", "ready", "failed"],
    default: "ready",
  },
}, { timestamps: true });

reportSchema.index({ type: 1, department: 1, createdAt: -1 });

export default mongoose.models.Report || mongoose.model("Report", reportSchema);
