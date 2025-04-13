const express = require("express");
const { route } = require("./authRoute");
const router = express.Router();
const mainController = require("../controllers/mainController");

router.get("/team/:id", mainController.teamsProfile);
router.get("/player/:id", mainController.playerProfile);
router.get("/allmatch", mainController.allmatch);
router.get("/allmatch/:id/:sport", mainController.getmatchById);
router.get("/allmatch/:id/:sport", mainController.getmatchById);
router.get("/allplayers", mainController.getAllPlayersSports);
router.get("/home", mainController.home);
router.get("/admin", mainController.admin);
router.get("/login", mainController.login);
router.post("/loginAdd", mainController.loginAdd);

router.get("/compare", mainController.compareStats);

module.exports = router;
