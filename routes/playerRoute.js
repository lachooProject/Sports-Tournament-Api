const express = require("express");
const router = express.Router();
const addPlayerController = require("../controllers/addPlayerController");
const multer = require("multer");

// var uploader = multer({
//   storage: multer.diskStorage({}),
//   limits: { fileSize: 500000 },
// });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname + req.body.name);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024, // 1MB
  },
});

router.post(
  "/addplayer",
  upload.single("photo"),
  addPlayerController.createPlayer
);
router.get("/allplayers", addPlayerController.getAllPlayersSports);
router.get("/allteams", addPlayerController.getTeamSports);
router.get("/players", addPlayerController.getAllPlayers);
router.get("/players/:playerId", addPlayerController.getPlayerById);
router.patch("/updateplayer/:playerId", addPlayerController.updatePlayer);
router.delete("/deleteplayer/:playerId", addPlayerController.deletePlayer);

router.post(
  "/addteam",
  upload.single("teamPhoto"),
  addPlayerController.createTeam
);
router.get("/teams", addPlayerController.getAllTeams);
router
  .route("/team/:teamId")
  .patch(addPlayerController.updateTeam)
  .get(addPlayerController.getTeamById)
  .delete(addPlayerController.deleteTeam);

module.exports = router;
