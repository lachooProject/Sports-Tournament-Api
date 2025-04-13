const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cron = require('node-cron');

process.on("uncaughtException", (err) => {
  console.log("UncaughtException 😒😒 Shutting down");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {})
  .then(() => console.log("Database connected successfully"));

const port = process.env.PORT || 2000;
const server = app.listen(port, () => {
  console.log("App runing on the ", port);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
