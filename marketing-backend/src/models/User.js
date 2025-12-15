import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,

  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  isApproved: {
    type: Boolean,
    default: false, // ADMIN APPROVAL
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
