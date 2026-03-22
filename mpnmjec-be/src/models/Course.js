import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    default: 1,
  },
  section: {
    type: String,
    default: "",
  },
  credits: {
    type: Number,
    default: 3,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
}, { timestamps: true });

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
