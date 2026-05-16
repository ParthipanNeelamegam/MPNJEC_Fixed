import mongoose from "mongoose";

const feeItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["semester", "mess", "tuition", "book", "hostel", "exam", "other"],
    default: "semester",
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
    enum: ["online", "upi", "cash", "cheque", "dd", "card", "netbanking"],
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
  purpose: {
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
  fineAmount: {
    type: Number,
    default: 0,
  },
  finePerDay: {
    type: Number,
    default: 0,
  },
  pendingAmount: {
    type: Number,
    default: function() {
      return this.totalAmount + (this.fineAmount || 0) - this.paidAmount;
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
  if (this.dueDate && this.finePerDay > 0 && this.paidAmount < this.totalAmount) {
    const today = new Date();
    if (today > this.dueDate) {
      const due = new Date(this.dueDate);
      due.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const daysOverdue = Math.max(0, Math.ceil((today - due) / (1000 * 60 * 60 * 24)));
      this.fineAmount = daysOverdue * this.finePerDay;
    }
  }

  this.pendingAmount = Math.max(0, this.totalAmount + (this.fineAmount || 0) - this.paidAmount);
  if (this.paidAmount >= this.totalAmount + (this.fineAmount || 0)) {
    this.status = "paid";
  } else if (this.paidAmount > 0) {
    this.status = "partial";
  } else if (new Date() > this.dueDate) {
    this.status = "overdue";
  }
});

export default mongoose.models.Fee || mongoose.model("Fee", feeSchema);
