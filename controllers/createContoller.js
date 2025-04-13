const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apperror");
const { admin, coach, player, user } = require("../models/authModel");

exports.checkOldUserOrNot = catchAsync(async (req, res, next) => {
  console.log("Checking if user already exists...");
  const { email, phone } = req.body;

  const [adminUser, coachUser, playerUser, normalUser] = await Promise.all([
    admin.findOne({ $or: [{ email }, { phone }] }),
    coach.findOne({ $or: [{ email }, { phone }] }),
    player.findOne({ $or: [{ email }, { phone }] }),
    user.findOne({ $or: [{ email }, { phone }] }),
  ]);

  if (adminUser || coachUser || playerUser || normalUser) {
    return res.status(400).json({
      status: "fail",
      message:
        "User already exists with this email or phone. Delete old ID to create a new user.",
    });
  }

  next();
});

// ? Create the Type of user
exports.createAdmin = catchAsync(async (req, res, next) => {
  const UserData = await admin.create(req.body);
  res.status(200).json({
    status: "Success",
    message: "Admin Create successfully",
  });
});

exports.createCoach = catchAsync(async (req, res, next) => {
  const UserData = await coach.create(req.body);
  res.status(200).json({
    status: "Success",
    message: "coach Create successfully",
  });
});

exports.createPlayer = catchAsync(async (req, res, next) => {
  const UserData = await player.create(req.body);
  res.status(200).json({
    status: "Success",
    message: "player Create successfully",
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const UserData = await user.create(req.body);
  res.status(200).json({
    status: "Success",
    message: "user Create successfully",
  });
});

// ? Get the all the user
exports.getcoach = catchAsync(async (req, res, next) => {
  const userData = await coach.find();
  res.status(200).json({
    status: "success",
    message: "All the coach Fetch",
    data: userData,
  });
});

exports.getPlayer = catchAsync(async (req, res, next) => {
  const userData = await player.find();
  res.status(200).json({
    status: "success",
    message: "All the coach Fetch",
    data: userData,
  });
});

// ? Get detail Using the id
exports.getCoachUsingId = catchAsync(async (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("User id not found", 400));
  }
  const userData = await coach.findById(req.params.id);
  if (!userData) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "coach data fetch",
    data: userData,
  });
});

exports.getPlayerUsingId = catchAsync(async (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("User id not found", 400));
  }
  const userData = await player.findById(req.params.id);
  if (!userData) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "coach data fetch",
    data: userData,
  });
});

// ? Delete Type User
exports.deleteAdmin = catchAsync(async (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("User id not found", 400));
  }
  const { id } = req.params;
  const checkUser = await admin.findByIdAndDelete(id);
  if (!checkUser) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Admin delete successfully",
  });
});

exports.deleteCoach = catchAsync(async (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("User id not found", 400));
  }
  const { id } = req.params;
  const checkUser = await coach.findByIdAndDelete(id);
  if (!checkUser) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "coach delete successfully",
  });
});

exports.deletePlayer = catchAsync(async (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("User id not found", 400));
  }
  const { id } = req.params;
  const userCheck = await player.findByIdAndDelete(id);
  if (!userCheck) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "player delete successfully",
    tour: userCheck,
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("User id not found", 400));
  }
  const { id } = req.params;
  const userCheck = await user.findByIdAndDelete(id);
  if (!userCheck) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "user delete successfully",
    tour: userCheck,
  });
});
