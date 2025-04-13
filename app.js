const express = require("express");
const morgan = require("morgan");
const globalErrorHandler = require("./controllers/errorController");
const authRoute = require("./routes/authRoute");
const createRoute = require("./routes/createRoute");
const playerRoute = require("./routes/PlayerRoute");
const matchScore = require("./routes/matchScoreRoute");
const cors = require("cors");
const { player } = require("./models/authModel");
const mainRoute = require("./routes/mainRoute");

const app = express();
app.use(cors());
// 1) MIDDLEWARES
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  console.log("Hello from the middleware!");
  console.log(req.body);
  next();
});

//2) Checking the time for the request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// app.use('/',(req,res,next) =>{
//   res.status(200).json({
//     status:'Its working'
//   })
// });

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/create", createRoute);
app.use("/api/v2/matchScore", matchScore);
app.use("/api/v2/admin", playerRoute);
app.use("/api/v2/main", mainRoute);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
