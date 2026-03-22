import mongoose from "mongoose";

const feeItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  method: {
    type: String,
    enum: ["online", "cash", "cheque", "dd"],
    default: "online",
  },
  transactionId: {
    type: String,
  },
  receiptNumber: {
    type: String,
  },
  remarks: {
    type: String,
  },
});

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  feeStructure: [feeItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  pendingAmount: {
    type: Number,
    default: function() {
      return this.totalAmount - this.paidAmount;
    },
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "partial", "paid", "overdue"],
    default: "pending",
  },
  payments: [paymentSchema],
}, { timestamps: true });

// Calculate pending amount before saving
feeSchema.pre("save", async function() {
  this.pendingAmount = this.totalAmount - this.paidAmount;
  if (this.paidAmount >= this.totalAmount) {
    this.status = "paid";
  } else if (this.paidAmount > 0) {
    this.status = "partial";
  } else if (new Date() > this.dueDate) {
    this.status = "overdue";
  }
});

export default mongoose.models.Fee || mongoose.model("Fee", feeSchema);