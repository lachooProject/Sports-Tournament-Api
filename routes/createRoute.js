const express = require("express");
const router = express.Router();
const createController = require("../controllers/createContoller");
const auth = require("../controllers/authController");

router.post(
  "/admin",
  createController.checkOldUserOrNot,
  createController.createAdmin
);
router
  .route("/coach")
  .post(
    auth.adminAuth,
    createController.checkOldUserOrNot,
    createController.createCoach
  )
  .get(createController.getcoach);
router
  .route("/player")
  .post(
    auth.coachAuth,
    createController.checkOldUserOrNot,
    createController.createPlayer
  )
  .get(createController.getPlayer);
router.post(
  "/user",
  createController.checkOldUserOrNot,
  createController.createUser
);

router.delete("/admin/:id", createController.deleteAdmin);
router
  .route("/coach/:id")
  .delete(createController.deleteCoach)
  .get(createController.getCoachUsingId);
router
  .route("/player/:id")
  .delete(createController.deletePlayer)
  .get(createController.getPlayerUsingId);
router.delete("/user/:id", createController.deleteUser);

module.exports = router;
