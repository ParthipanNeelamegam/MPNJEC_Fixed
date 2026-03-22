import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'N/A'],
    default: 'Pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  approvedAt: {
    type: Date,
  },
  remarks: {
    type: String,
  },
}, { _id: false });

const leaveRequestSchema = new mongoose.Schema({
  // Applicant Information
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'applicantModel',
    required: true,
  },
  applicantModel: {
    type: String,
    enum: ['Student', 'Faculty', 'HOD'],
    required: true,
  },
  applicantRole: {
    type: String,
    enum: ['student', 'faculty', 'hod'],
    required: true,
  },
  applicantUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Department & Class Info
  department: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    min: 1,
    max: 4,
  },
  section: {
    type: String,
  },

  // Leave Details
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'emergency', 'personal', 'academic', 'other'],
    default: 'casual',
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },

  // Approval Blocks
  facultyApproval: {
    type: approvalSchema,
    default: () => ({ status: 'Pending' }),
  },
  hodApproval: {
    type: approvalSchema,
    default: () => ({ status: 'Pending' }),
  },
  principalApproval: {
    type: approvalSchema,
    default: () => ({ status: 'Pending' }),
  },

  // Final Status
  finalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },

  // Timestamps
  appliedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Indexes for efficient queries
leaveRequestSchema.index({ applicantId: 1, appliedAt: -1 });
leaveRequestSchema.index({ finalStatus: 1 });
leaveRequestSchema.index({ department: 1, 'facultyApproval.status': 1 });
leaveRequestSchema.index({ department: 1, 'hodApproval.status': 1 });
leaveRequestSchema.index({ 'principalApproval.status': 1 });
leaveRequestSchema.index({ applicantRole: 1 });
leaveRequestSchema.index({ year: 1, section: 1 });

// Virtual to calculate leave duration
leaveRequestSchema.virtual('leaveDuration').get(function() {
  if (this.fromDate && this.toDate) {
    const diffTime = Math.abs(this.toDate - this.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }
  return 0;
});

// Pre-validate middleware to set initial approval statuses based on role
leaveRequestSchema.pre('validate', function() {
  if (this.isNew) {
    if (this.applicantRole === 'student') {
      // Student: all 3 approvals required — default Pending
    } else if (this.applicantRole === 'faculty') {
      // Faculty: no faculty-level approval needed
      this.facultyApproval = { status: 'N/A' };
    } else if (this.applicantRole === 'hod') {
      // HOD: only principal approval needed
      this.facultyApproval = { status: 'N/A' };
      this.hodApproval = { status: 'N/A' };
    }
  }
});

// Method to recalculate finalStatus based on approval blocks
// Any single authorized approver can approve or reject the leave
// LEAVE APPROVAL REQUIREMENTS:
//   Student leave  → Class Advisor  OR  HOD  OR  Principal  (any one approves = final)
//   Faculty leave  → HOD  OR  Principal  (any one approves = final)
//   HOD leave      → Principal only (principal must approve)
leaveRequestSchema.methods.recalculateFinalStatus = function() {
  const approvals = [this.facultyApproval, this.hodApproval, this.principalApproval];

  // Any rejection by anyone → Rejected
  if (approvals.some(a => a?.status === 'Rejected')) {
    this.finalStatus = 'Rejected';
    return this;
  }

  // Any approval by an authorised approver → Approved
  if (approvals.some(a => a?.status === 'Approved')) {
    this.finalStatus = 'Approved';
    return this;
  }

  this.finalStatus = 'Pending';
  return this;
};

export default mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveRequestSchema);
