const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const catchAsync = require("../utils/catchAsync");

const AdminModel = mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please tell email"],
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: "Please tell valid Email",
    },
  },
  name: {
    type: String,
    required: [true, "Please tell name"],
  },
  password: {
    type: String,
    required: [true, "Password not tell"],
  },
});

AdminModel.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

AdminModel.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const coachModel = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell Name"],
  },
  email: {
    type: String,
    required: [true, "Please tell email"],
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: "Please tell valid Email",
    },
  },
  phone: {
    type: Number,
    unique: true,
    required: [true, "Please tell phone"],
  },
  address: {
    type: String,
    required: [true, "Please tell address"],
  },
  dob: {
    type: Date,
    required: [true, "Please tell Date of Birth"],
  },
  specialization: {
    type: String,
    required: [true, "Please tell Specialization"],
    enum: {
      values: ["Cricket", "Football"],
      message: "Please choose the correct specialization",
    },
  },
  education: {
    type: String,
    required: [true, "Please tell education"],
  },
  bio: {
    type: String,
    required: [true, "Tell About your journey"],
  },
  photoUrl: {
    type: String,
    default: "",
  },
});

const playerModel = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell Name"],
  },
  email: {
    type: String,
    required: [true, "Please tell email"],
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: "Please tell valid Email",
    },
  },
  phone: {
    type: Number,
    unique: true,
    required: [true, "Please tell phone"],
  },
  address: {
    type: String,
    required: [true, "Please tell address"],
  },
  dob: {
    type: Date,
    required: [true, "Please tell Date of Birth"],
  },
  education: {
    type: String,
    required: [true, "Please tell education"],
  },
  sports_type: [],
  fatherName: {
    type: String,
    required: [true, "Please tell father name"],
  },
  motherName: {
    type: String,
    required: [true, "Please tell mother name"],
  },
  aaddhar_number: {
    type: Number,
    required: [true, "Please tell your aadhar number"],
  },
  gender: {
    type: String,
    required: [true, "Please tell gender"],
    enum: {
      values: ["male", "female", "other"],
      message: "Please tell the correct gender",
    },
  },
  photoUrl: {
    type: String,
    default: "",
  },
});

const userModel = mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please tell email"],
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: "Please tell valid Email",
    },
  },
  type: {
    type: String,
    default: "normal",
  },
});

const admin = mongoose.model("admin", AdminModel);
const coach = mongoose.model("coach", coachModel);
const player = mongoose.model("player", playerModel);
const user = mongoose.model("user", userModel);
module.exports = { user };
