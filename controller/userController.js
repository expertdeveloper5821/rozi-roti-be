import User from "../models/userModel";
import credentials from "../config/credential.json";
import helper from "../utils/helper";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transporter from "../middleware/emailConfig";
import * as dotenv from "dotenv";
dotenv.config();
import { google } from "googleapis";

// Register_User api
exports.register_user = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      companyName,
      mobileNumber,
      email,
      password,
      confirmPassword,
    } = req.body;

    //   Check if all the required fields are present or not one by one
    if (!firstName) {
      return res.status(400).json({
        error: { message: `First name is required.` },
      });
    }

    if (!lastName) {
      return res.status(400).json({
        error: { message: `Last name is required.` },
      });
    }

    if (!companyName) {
      return res.status(400).json({
        error: { message: `Company name is required.` },
      });
    }

    if (!mobileNumber) {
      return res.status(400).json({
        error: { message: `Mobile Number is required.` },
      });
    }

    if (!email) {
      return res.status(400).json({
        error: { message: `Email is required.` },
      });
    }
    if (!password) {
      return res.status(400).json({
        error: { message: `Password is required.` },
      });
    }

    // Validate email
    const is_email_valid = helper.emailValidate(email);
    if (!is_email_valid) {
      return res.status(401).json({
        error: {
          message: `Not a valid email, please enter valid email`,
        },
      });
    }

    // Check if email already exists or not
    const user_email = await User.findOne({ email });
    if (user_email) {
      return res.status(401).json({
        error: {
          message: `This user email is already exist, please try different email.`,
        },
      });
    }

    // Validate password
    const is_password_valid = helper.passwordValidate(password);
    if (!is_password_valid) {
      return res.status(401).json({
        error: {
          message:
            "Password must be min. 8 characters and contain at least one Uppercase, lowercase, special character and number",
        },
      });
    }

    // Validate mobile number
    const is_phone_number_valid = helper.phonenumberValidate(mobileNumber);
    if (!is_phone_number_valid) {
      return res.status(401).json({
        error: {
          message: "This is not a valid Phone number,enter valid phone number",
        },
      });
    }

    // Confirm Password
    if (password !== confirmPassword) {
      return res.status(401).json({
        error: {
          message: "Password and Confirm Password should be same.",
        },
      });
    }

    // Encrypt the password
    const salt = await bcrypt.genSalt(15);
    const password_hash = await bcrypt.hash(password, salt);
    const confirm_password_hash = await bcrypt.hash(confirmPassword, salt);

    // Create the new user
    const doc = new User({
      firstName,
      lastName,
      companyName,
      mobileNumber,
      email,
      password: password_hash,
      confirmPassword: confirm_password_hash,
    });
    // Save the user
    const user_saved = await doc.save();
    if (user_saved?._id) {
      return res.status(200).json({ message: "User registered Successfully" });
    } else {
      return res.status(200).json({ message: "User not registered" });
    }
  } catch (error) {
    console.error("Error in register_user => register_user", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Login_User api
exports.login_user = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({
        error: { message: `Email is required.` },
      });
    }
    if (!password) {
      return res.status(400).json({
        error: { message: `Password is required.` },
      });
    }
    const user = await User.findOne({ email: email });
    if (user !== null) {
      const is_password_match = await bcrypt.compare(password, user.password);
      if (is_password_match) {
        // token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: "1d",
        });
        await User.findOneAndUpdate({ token: token },  { id: user.id } );
        return res.status(200).json({
          message: "User login successful",
          token: token,
        });
      } else {
        return res.status(401).json({ message: "User password is incorrect" });
      }
    } else {
      return res.status(401).json({ message: "User email is incorrect" });
    }
  } catch (error) {
    console.error("Error in login_user => login_user", error);
    return res.status(400).json({ message: "Error in login_user", error });
  }
};

// Attendance endpoint
// attendanceController.js
exports.record_attendance = async (req, res) => {
  try {
    const { userId } = req.body;

    // Retrieve the user from the database based on the provided userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has already recorded attendance in the last 12 hours
    const currentTime = new Date();
    const lastAttendanceTime = user.lastAttendanceTime;
    const twelveHoursInMilliseconds = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    if (
      lastAttendanceTime &&
      currentTime - lastAttendanceTime < twelveHoursInMilliseconds
    ) {
      return res.status(401).json({
        message: "You can record attendance only once every 12 hours.",
      });
    }

    // Generate the login time
    const loginTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }); // Current timestamp in ISO time format

    // Create a JWT client using the credentials
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    // Authorize the client
    await jwtClient.authorize();

    // Prepare the data to be written to the spreadsheet
    const spreadsheetId = "16TAqd6qwGIstzG5jXTssgC8gLM_j4z0PYJtWbRSX2I8";
    const range = "Sheet1!A:G"; // Assuming the data should be written in columns A and B starting from row 2
    const values = [
      [
        userId,
        user.firstName,
        user.lastName,
        user.email,
        user.mobileNumber,
        user.companyName,
        loginTime,
      ],
    ]; // Change this to the desired data

    // Create a Sheets API instance
    const sheets = google.sheets({ version: "v4", auth: jwtClient });

    // Write the data to the spreadsheet
    const request = {
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      resource: { values },
    };
    const response = await sheets.spreadsheets.values.append(request);

    // Update the lastAttendanceTime for the user
    user.lastAttendanceTime = currentTime;
    await user.save();

    return res
      .status(200)
      .json({ message: "Attendance recorded successfully" });
  } catch (error) {
    console.error("Error in recordAttendance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// Logout_User api
exports.logout_user = async (req, res) => {
  try {
    const userId = req.params.id; // get user ID from the decoded token
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json({ message: "User not found" });
    } else {
      return res.status(200).json({ message: "Successfully logout" });
    }
  } catch (error) {
    console.error("Error in logout_user => logout_user", error);
    return res.status(400).json({ message: "Error in logout_user", error });
  }
};

// Send_User_Password_Reset_Email api
exports.send_user_password_reset_email = async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await User.findOne({ email: email });
      if (user) {
        // generate token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: "5m",
        });
        // convert id into query
        const link = `https://rozi-app.vercel.app/resetpassword/?token=${token}`;
        // send email
        let info = await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: "Rozi-Roti Reset Password link",
          html: `Hi This email send to reset you password, please <a href=${link}>Click Here</a>, This link will expire within 5 minutes`,
        });
        return res.status(200).json({
          message: "Password Reset link Sent... Please check your Email",
        });
      } else {
        return res.status(500).json({ message: "Email Doesn't exists" });
      }
    } else {
      return res.status(500).json({ message: "Email field is required" });
    }
  } catch (error) {
    console.error("Error in send_user_password_reset_email => ", error);
    return res
      .status(400)
      .json({ message: "Error in send_user_password_reset_email", error });
  }
};

// User_Password_Reset api
exports.user_password_reset = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  try {
    const token = req.query.token;
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decode.userId);
    if (!newPassword) {
      return res.status(400).json({
        error: { message: "New password is required." },
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        error: { message: "Confirm password is required." },
      });
    }
    // password validation
    const user_password = helper.passwordValidate(req.body.newPassword);
    if (!user_password) {
      return res.status(401).json({
        error: {
          message:
            "Password must be min. 8 characters and contain at least one Uppercase, lowercase, special character and number",
        },
      });
    }
    if (newPassword !== confirmPassword) {
      return res
        .status(500)
        .json({ message: "New password and confirm password not match." });
    } else {
      const salt = await bcrypt.genSalt(10);
      const newHashpassword = await bcrypt.hash(newPassword, salt);
      await User.findOneAndUpdate(user._id, { $set: {password: newHashpassword} });
      return res.status(200).json({ message: "Password Reset Successfully" });
    }
  } catch (error) {
    console.error("Error in user_password_reset => user_password_reset", error);
    return res.status(500).json({ message: "Link Expire" });
  }
};

// User_Change_Password api
exports.user_password_change = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.params.id;

  try {
    // Check if the old password matches the current password
    const user = await User.findById(userId);
    const is_password_valid = await bcrypt.compare(oldPassword, user.password);
    if (!is_password_valid) {
      return res.status(401).json({
        error: {
          message: "The old password you entered is incorrect.",
        },
      });
    }

    // Validate the new password
    const is_password_strong = helper.passwordValidate(newPassword);
    if (!is_password_strong) {
      return res.status(401).json({
        error: {
          message:
            "The new password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one special character, and one number.",
        },
      });
    }

    // Make sure the new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(401).json({
        error: {
          message: "The new password and confirm password do not match.",
        },
      });
    }

    // Hash and save the new password
    const salt = await bcrypt.genSalt(10);
    const newHashpassword = await bcrypt.hash(newPassword, salt);
    await User.findOneAndUpdate({ _id: userId }, { password: newHashpassword });

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error in user_password_change => user_password_change", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

