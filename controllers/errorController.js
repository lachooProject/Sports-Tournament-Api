const appError = require("../utils/apperror");

const handleCastError = (err) => {
  const message = `Invalid ${err.path} : ${err.value}.`;
  return new appError(message, 404);
};

// const handleDuplicateFieldsDB = (err) => {
//   const value = err.errmsg.match(/(["'])(\\?.)*?\1/);
//   const message = `Duplicate field value: ${value}. Please use another value!`;
//   return new appError(message, 400);
// };
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  // Construct a user-friendly error message
  const message = `Duplicate field value: ${field}: ${value}. Please use another number!`;
  return new appError(message, 400);
};
// const handleValidationError = (err) => {
//   // Extract specific validation messages
//   const errors = Object.values(err.errors).map((el) => el.message);
//   const message = `Invalid input data. ${errors.join(". ")}`;
//   return new appError(message, 400);
// };
const handleValidationError = (err) => {
  console.log("Validation Errors:", err.errors); // Log to verify structure
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new appError(message, 400);
};

const handleJsonWebTokenError = () =>
  new appError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new appError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorPro = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("Error", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err, message: err.message };
    console.log(error.code);
    if (error.name === "CastError") error = handleCastError(error);
    if (error.code === 11000) {
      error.errors = err.errors;
      error = handleDuplicateFieldsDB(error);
    }
    // if (error.name === "ValidationError") error = handleValidationError(error);
    if (err.name === "ValidationError") {
      error.errors = err.errors; // Include the nested `errors` object
      error = handleValidationError(error); // Pass it to the handler
    }
    if (error.name === "JsonWebTokenError") error = handleJsonWebTokenError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorPro(error, res);
  }
};
