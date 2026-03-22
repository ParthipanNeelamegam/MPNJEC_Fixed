import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rollNumber: {
    type: String,
    unique: true,
    required: true,
  },
  fatherName: {
    type: String,
  },
  motherName: {
    type: String,
  },
  dob: {
    type: Date,
  },
  aadhaar: {
    type: String,
  },
  mobile: {
    type: String,
  },
  parentMobile: {
    type: String,
  },
  address: {
    type: String,
  },
  department: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  section: {
    type: String,
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
    default: 1,
  },
  admissionYear: {
    type: Number,
  },
  cgpa: {
    type: Number,
    default: 0,
  },
  attendance: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  libraryCardsTotal: {
    type: Number,
    default: 2,
  },
  libraryCardsAvailable: {
    type: Number,
    default: 2,
  },
}, { timestamps: true });

export default mongoose.models.Student || mongoose.model("Student", studentSchema);
