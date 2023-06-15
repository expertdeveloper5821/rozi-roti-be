import mongoose from "mongoose";


let userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    companyName: { type: String, required: true },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: true },
    lastAttendanceTime: { type: Date, required: false },
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
