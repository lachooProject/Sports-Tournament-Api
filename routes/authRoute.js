const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/adminlogin", authController.login);

module.exports = router;
