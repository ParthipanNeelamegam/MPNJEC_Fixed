import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true }, // unique when set, allows null
  username: { type: String, unique: true, sparse: true }, // unique when set, allows null
  password: String,
  role: {
    type: String,
    enum: ["student", "faculty", "hod", "admin", "principal", "superUser", "librarian"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  phone: {
    type: String,
    default: '',
  },
}, { timestamps: true })

// Compound index for faster login queries
userSchema.index({ email: 1, username: 1 });

export default mongoose.model("User", userSchema);
