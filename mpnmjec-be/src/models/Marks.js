import mongoose from "mongoose";

const marksSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
  },
  // Academic year for tracking
  academicYear: {
    type: String, // e.g., "2025-2026"
  },
  // Internal marks
  internal1: {
    type: Number,
    min: 0,
    max: 25,
    default: 0,
  },
  internal2: {
    type: Number,
    min: 0,
    max: 25,
    default: 0,
  },
  // Model exam
  modelExam: {
    type: Number,
    min: 0,
    max: 50,
    default: 0,
  },
  // Final exam
  finalExam: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  // Computed fields
  total: {
    type: Number,
    default: 0,
  },
  grade: {
    type: String,
    enum: ["O", "A+", "A", "B", "C", "F", ""],
    default: "",
  },
  isPassed: {
    type: Boolean,
    default: false,
  },
  // Audit trail
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
  },
  // Verification
  verifiedByHOD: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HOD",
  },
  // Locking
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockedAt: {
    type: Date,
  },
  // Edit history for audit
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
    editedAt: { type: Date, default: Date.now },
    previousValues: {
      internal1: Number,
      internal2: Number,
      modelExam: Number,
      finalExam: Number,
    },
    reason: String,
  }],
  status: {
    type: String,
    enum: ["draft", "submitted", "verified", "locked"],
    default: "draft",
  },
}, { timestamps: true });

// Compound index to prevent duplicate marks per student + course + semester
marksSchema.index({ studentId: 1, courseId: 1, semester: 1 }, { unique: true });

// Index for quick lookups
marksSchema.index({ courseId: 1, semester: 1 });
marksSchema.index({ enteredBy: 1 });

// Calculate grade based on total marks
function calculateGrade(total) {
  if (total >= 90) return "O";
  if (total >= 80) return "A+";
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  return "F";
}

// Pre-save hook to calculate total and grade
marksSchema.pre("save", async function() {
  const internalAvg = ((this.internal1 || 0) + (this.internal2 || 0)) / 2;
  const modelNorm = (this.modelExam || 0) / 2;
  const finalNorm = (this.finalExam || 0) / 2;

  this.total = Math.round(internalAvg + modelNorm + finalNorm);
  this.grade = calculateGrade(this.total);
  this.isPassed = this.finalExam >= 50;
});

// Static method to get class result analysis
marksSchema.statics.getClassAnalysis = async function(department, year, section, semester) {
  const Student = mongoose.model("Student");
  
  // Get students in this class
  const studentQuery = { department, year, status: "active" };
  if (section) studentQuery.section = section;
  
  const students = await Student.find(studentQuery).select("_id");
  const studentIds = students.map(s => s._id);
  
  if (studentIds.length === 0) {
    return {
      totalStudents: 0,
      passCount: 0,
      failCount: 0,
      passPercentage: 0,
      averageMark: 0,
      toppers: [],
      subjectWise: [],
    };
  }
  
  // Aggregate marks
  const analysis = await this.aggregate([
    {
      $match: {
        studentId: { $in: studentIds },
        semester: semester,
        status: { $ne: "draft" },
      }
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "course",
      }
    },
    { $unwind: "$course" },
    {
      $group: {
        _id: "$studentId",
        totalMarks: { $sum: "$total" },
        subjectCount: { $sum: 1 },
        passedSubjects: { $sum: { $cond: ["$isPassed", 1, 0] } },
        failedSubjects: { $sum: { $cond: ["$isPassed", 0, 1] } },
        marks: { $push: { courseId: "$courseId", courseName: "$course.name", total: "$total", grade: "$grade", isPassed: "$isPassed" } },
      }
    },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "_id",
        as: "student",
      }
    },
    { $unwind: "$student" },
    {
      $lookup: {
        from: "users",
        localField: "student.userId",
        foreignField: "_id",
        as: "user",
      }
    },
    { $unwind: "$user" },
    {
      $project: {
        studentId: "$_id",
        studentName: "$user.name",
        rollNumber: "$student.rollNumber",
        totalMarks: 1,
        subjectCount: 1,
        passedSubjects: 1,
        failedSubjects: 1,
        averageMark: { $divide: ["$totalMarks", "$subjectCount"] },
        isPassed: { $eq: ["$failedSubjects", 0] },
        marks: 1,
      }
    },
    { $sort: { totalMarks: -1 } },
  ]);
  
  // Calculate summary
  const totalStudents = analysis.length;
  const passCount = analysis.filter(a => a.isPassed).length;
  const failCount = totalStudents - passCount;
  const passPercentage = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
  const averageMark = totalStudents > 0 
    ? Math.round(analysis.reduce((sum, a) => sum + a.averageMark, 0) / totalStudents) 
    : 0;
  
  // Get toppers (top 3)
  const toppers = analysis.slice(0, 3).map(a => ({
    studentId: a.studentId,
    name: a.studentName,
    rollNumber: a.rollNumber,
    totalMarks: a.totalMarks,
    average: Math.round(a.averageMark),
  }));
  
  // Subject-wise analysis
  const subjectWise = await this.aggregate([
    {
      $match: {
        studentId: { $in: studentIds },
        semester: semester,
        status: { $ne: "draft" },
      }
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "course",
      }
    },
    { $unwind: "$course" },
    {
      $group: {
        _id: "$courseId",
        courseName: { $first: "$course.name" },
        courseCode: { $first: "$course.code" },
        totalStudents: { $sum: 1 },
        passCount: { $sum: { $cond: ["$isPassed", 1, 0] } },
        avgMark: { $avg: "$total" },
        maxMark: { $max: "$total" },
        minMark: { $min: "$total" },
      }
    },
    {
      $project: {
        courseId: "$_id",
        courseName: 1,
        courseCode: 1,
        totalStudents: 1,
        passCount: 1,
        passPercentage: { 
          $round: [{ $multiply: [{ $divide: ["$passCount", "$totalStudents"] }, 100] }, 0] 
        },
        avgMark: { $round: ["$avgMark", 1] },
        maxMark: 1,
        minMark: 1,
      }
    },
  ]);
  
  return {
    department,
    year,
    section,
    semester,
    totalStudents,
    passCount,
    failCount,
    passPercentage,
    averageMark,
    toppers,
    subjectWise,
    studentResults: analysis,
  };
};

export default mongoose.models.Marks || mongoose.model("Marks", marksSchema);