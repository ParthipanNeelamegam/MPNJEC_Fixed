import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },
  department: {
    type: String,
    required: true,
  },
  semester: {
    type: Number,
  },
  subject: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["notes", "pdf", "video", "assignment", "question_paper", "syllabus", "other"],
    default: "notes",
  },
  fileUrl: {
    type: String,
  },
  fileName: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  externalLink: {
    type: String,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadedByName: {
    type: String,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  tags: [{
    type: String,
  }],
}, { timestamps: true });

materialSchema.index({ department: 1, semester: 1, subject: 1 });
materialSchema.index({ title: "text", description: "text", subject: "text" });

export default mongoose.models.Material || mongoose.model("Material", materialSchema);
