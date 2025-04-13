const express = require("express");
const router = express.Router();
const matchScoreController = require("../controllers/matchScoreController");

//? Cricket Match Routes

router.post("/cricketMatches", matchScoreController.createCricketMatch);

router.get("/cricketMatches", matchScoreController.getAllCricketMatches);

router.patch(
  "/cricketMatches/status/:matchId",
  matchScoreController.updateStatusCricketMatch
);

router.patch(
  "/cricketMatches/ballstats/:matchId",
  matchScoreController.updatePerBallStats
);

router.get("/allmatches", matchScoreController.getAllmatch);
router.get("/cricketMatches/:id", matchScoreController.getCricketMatchById);

//? Football Match Routes
router.post("/footballMatches", matchScoreController.createFootballMatch);
router.patch(
  "/footballMatches/status/:matchId",
  matchScoreController.updateStatusFootballMatch
);
router.get("/footballMatches/:id", matchScoreController.getFootballMatchById);
router.patch(
  "/footballMatches/ballstats/:matchId",
  matchScoreController.updateFootballMatchStats
);

//? Badminton Match Routes
router.post("/badmintonMatches", matchScoreController.createBadmintonMatch);
router.patch(
  "/badmintonMatches/status/:matchId",
  matchScoreController.updateStatusBadmintonMatch
);
router.get("/badmintonMatches/:id", matchScoreController.getBadmintonMatchById);
router.patch(
  "/batmintonMatches/ballstats/:matchId",
  matchScoreController.updateBadmintonMatchStats
);

//! Real Api which is used in the website
// Get all Cricket Matches
router.get("/cricketMatches", matchScoreController.getAllCricketMatches);

module.exports = router;
