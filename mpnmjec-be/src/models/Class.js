import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },
  section: {
    type: String,
    default: null,
  },
  // Class Advisor
  advisorFacultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    default: null,
  },
  // Student count (cached for performance)
  studentCount: {
    type: Number,
    default: 0,
  },
  // Academic info
  academicYear: {
    type: String, // e.g., "2025-2026"
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
}, { timestamps: true });

// Compound index to ensure unique class per department + year + section
classSchema.index({ department: 1, year: 1, section: 1 }, { unique: true });

// Index for quick lookups
classSchema.index({ department: 1, status: 1 });
classSchema.index({ advisorFacultyId: 1 });

// Static method to get or create a class
classSchema.statics.getOrCreateClass = async function(department, year, section) {
  let classDoc = await this.findOne({ department, year, section });
  
  if (!classDoc) {
    classDoc = await this.create({
      department,
      year,
      section: section || null,
    });
  }
  
  return classDoc;
};

// Static method to seed default classes for a department
classSchema.statics.seedDepartmentClasses = async function(department) {
  const years = [1, 2, 3, 4];
  const sections = ["A", "B"];
  
  const classes = [];
  for (const year of years) {
    for (const section of sections) {
      classes.push({
        department,
        year,
        section,
      });
    }
  }
  
  // Use upsert to avoid duplicates
  for (const cls of classes) {
    await this.findOneAndUpdate(
      { department: cls.department, year: cls.year, section: cls.section },
      { $setOnInsert: cls },
      { upsert: true, new: true }
    );
  }
};

export default mongoose.models.Class || mongoose.model("Class", classSchema);
