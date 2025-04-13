const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
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
const user = mongoose.model("user", userModel);
module.exports = { user };
