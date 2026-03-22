import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ["academic", "sports", "cultural", "technical", "research", "placement", "award", "other"],
    required: true,
  },
  category: {
    type: String,
    enum: ["student", "faculty", "department", "institution"],
    default: "student",
  },
  department: {
    type: String,
  },
  achievedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
    },
    rollNumber: {
      type: String,
    },
  },
  date: {
    type: Date,
    required: true,
  },
  venue: {
    type: String,
  },
  organizedBy: {
    type: String,
  },
  award: {
    type: String,
  },
  prize: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  certificateUrl: {
    type: String,
  },
  isHighlighted: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

achievementSchema.index({ type: 1, date: -1 });
achievementSchema.index({ department: 1, date: -1 });

export default mongoose.models.Achievement || mongoose.model("Achievement", achievementSchema);
