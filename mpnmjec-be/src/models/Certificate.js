import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  type: {
    type: String,
    enum: ["bonafide", "characterCertificate", "conductCertificate", "studyCertificate", "courseCompletion", "migration", "transferCertificate", "other"],
    required: true,
  },
  typeName: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  copies: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
  },
  fee: {
    type: Number,
    default: 100,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "processing", "ready", "collected"],
    default: "pending",
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  remarks: {
    type: String,
  },
  readyAt: {
    type: Date,
  },
  collectedAt: {
    type: Date,
  },
  certificateNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
}, { timestamps: true });

// Generate certificate number on approval
certificateSchema.pre("save", async function() {
  if (this.isModified("status") && this.status === "ready" && !this.certificateNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    this.certificateNumber = `CERT-${year}-${random}`;
    this.readyAt = new Date();
  }
});

export default mongoose.models.Certificate || mongoose.model("Certificate", certificateSchema);