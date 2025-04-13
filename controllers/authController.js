const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apperror");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { admin, coach, player, user } = require("../models/authModel");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {});
};

exports.login = catchAsync(async (req, res, next) => {
  const { email } = req.query;
  if (!email) {
    return next(new AppError("Please Enter email", 404));
  }
  let user = null;
  let role = null;
  user = await admin.find({ email });
  if (user) role = "admin";
  if (!user) {
    user = await coach.find({ email });
    if (user) role = "coach";
  }
  if (!user) {
    user = await player.find({ email });
    if (user) role = "player";
  }
  if (!user) {
    user = await user.find({ email });
    if (user) role = "user";
  }
  if (!user) {
    return next(new AppError("User Not found", 404));
  }
  const token = signToken(user.id);

  res.status(200).json({
    status: "success",
    message: "Successfully logged in!",
    // token: token,
    otp: "123456",
    role: role,
  });
});

exports.adminAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authorization token missing or invalid.", 401));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    const userData = await admin.findById(decoded.id);
    if (!userData) {
      return next(new AppError("User not found", 404));
    }
    next();
  } catch (err) {
    return next(new AppError("Invalid or expired token.", 401));
  }
  next();
});

exports.coachAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authorization token missing or invalid.", 401));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    const userData = await user.findById(decoded.id);
    if (!userData) {
      return next(new AppError("User not found", 404));
    }
    next();
  } catch (err) {
    return next(new AppError("Invalid or expired token.", 401));
  }
  next();
});
