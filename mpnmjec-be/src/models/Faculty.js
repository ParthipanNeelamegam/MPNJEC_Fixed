import mongoose from "mongoose";

const facultySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  empId: {
    type: String,
    unique: true,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  // Secondary departments for cross-department teaching
  secondaryDepartments: [{
    type: String,
  }],
  designation: {
    type: String,
  },
  experience: {
    type: Number,
    default: 0,
  },
  assignedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  }],
  // Class Advisor fields
  isClassAdvisor: {
    type: Boolean,
    default: false,
  },
  advisorFor: {
    department: { type: String },
    year: { type: Number, min: 1, max: 4 },
    section: { type: String },
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
}, { timestamps: true });

// Virtual to check if faculty teaches in multiple departments
facultySchema.virtual('isSharedFaculty').get(function() {
  return this.secondaryDepartments && this.secondaryDepartments.length > 0;
});

// Get all departments faculty can teach in
facultySchema.methods.getAllDepartments = function() {
  return [this.department, ...(this.secondaryDepartments || [])];
};

export default mongoose.models.Faculty || mongoose.model("Faculty", facultySchema);
