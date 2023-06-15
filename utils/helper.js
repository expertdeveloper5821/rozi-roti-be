import jwt from "jsonwebtoken";

// email validation
function emailValidate(email) {
  if (String(email).match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
    return true;
  } else {
    return false;
  }
}

// password validation
const passwordValidate = (password) => {
  const regEx = new RegExp(
    "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
  );
  return regEx.test(password);
};

const phonenumberValidate = (mobileNumber) => {
  const regEx = /^\d{10}$/;
  return regEx.test(mobileNumber);
};

// token validation
const checkToken = async (req, res, next) => {
  try {
    const header = req.headers["authorization"];
    if (!header) {
      res.status(401).json({
        error: {
          message: "Token is require",
        },
      });
    } else {
      const token = header.split(" ")[1];
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      if (decode.userId) {
        req.userId = decode.userId;
        next();
      } else {
        res.status(401).json({
          error: {
            message: "Invalid Token",
          },
        });
      }
    }
  } catch (error) {
    console.error("Error in checkToken => checkToken", error);
    return res.status(401).json({
      error: {
        message: error.message || "You Dont have a permision",
      },
    });
  }
};

module.exports = {
  emailValidate,
  passwordValidate,
  phonenumberValidate,
  checkToken,
};
