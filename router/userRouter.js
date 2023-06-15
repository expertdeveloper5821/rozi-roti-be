import express from "express";
const router = express();
import userController from "../controller/userController";
import helper from "../utils/helper";


// create user route
router.post("/create", userController.register_user);

//login route
router.post("/login", userController.login_user);

// QR Code Scan
router.post('/record-attendance', helper.checkToken, userController.record_attendance);

//logout route
router.post("/logout/:id", userController.logout_user);

// send mail route
router.post("/sendmail", userController.send_user_password_reset_email);

//reset password route
router.post("/reset-password", userController.user_password_reset);

//change password route
router.post("/change-password/:id", helper.checkToken, userController.user_password_change);

module.exports = router;
