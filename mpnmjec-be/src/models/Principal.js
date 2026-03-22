import mongoose from "mongoose";


const principalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
}, { timestamps: true });

export default mongoose.models.Principal || mongoose.model("Principal", principalSchema);
