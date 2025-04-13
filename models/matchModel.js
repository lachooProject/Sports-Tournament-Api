const mongoose = require("mongoose");

const ballStatSchema = new mongoose.Schema({
  ballNumber: { type: Number, required: true },
  runs: { type: Number, default: 0 },
  whitballthrough: { type: Boolean, default: false },
  fours: { type: Boolean, default: false },
  sixes: { type: Boolean, default: false },
  wicket: { type: Boolean, default: false },
  extras: { type: Number, default: 0 },
  outType: {
    type: String,
    enum: ["bowled", "caught", "run out", "lbw", "stumped", "hit wicket"],
  },
  batsmanId: { type: mongoose.Schema.Types.ObjectId, ref: "CricketPlayer" },
  bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: "CricketPlayer" },
});

const cricketMatchSchema = new mongoose.Schema({
  team1: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  team1Name: { type: String },
  team2Name: { type: String },
  team2: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  sport: { type: String, default: "cricket" },
  tosewon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: "67e7010ae97f55305a4ca564",
  },
  choosebatting: { type: Boolean, default: false },
  choosebowling: { type: Boolean, default: false },
  winner: { type: String },
  score: {
    team1: {
      score: { type: Number, default: 0 },
      teamballs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
    team2: {
      score: { type: Number, default: 0 },
      teamballs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
  },
  playersStats: [
    {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      playerName: { type: String },
      playerTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      isOut: { type: Boolean, default: false },
      outType: {
        type: String,
        enum: ["bowled", "caught", "run out", "lbw", "stumped", "hit wicket"],
      },
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      ballsBowled: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      ballwhitethrough: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
    },
  ],
  status: {
    type: String,
    enum: ["upcoming", "live", "completed","due"],
    default: "upcoming",
  },
  ballStats: [ballStatSchema],
  Highlight: [{ type: String }],
});

const footballMatchSchema = new mongoose.Schema({
  team1: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  team1Name: { type: String },
  team2Name: { type: String },
  sport: { type: String, default: "football" },
  team2: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  winner: { type: String },
  score: {
    team1: { type: Number, default: 0 },
    team2: { type: Number, default: 0 },
  },
  playersStats: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      playerName: { type: String },
      playerTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      goals: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      penalty: { type: Number, default: 0 },
      yellowcards: { type: Number, default: 0 },
      redcards: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      shots: { type: Number, default: 0 },
      tackles: { type: Number, default: 0 },
    },
  ],
  status: {
    type: String,
    enum: ["upcoming", "live", "completed", "due"],
    default: "upcoming",
  },
  Highlight: [{ type: String }],
});

const badmintonMatchSchema = new mongoose.Schema({
  player1: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  team1: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  team1Name: { type: String },
  team2Name: { type: String },
  sport: { type: String, default: "badminton" },
  team2: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  winner: { type: String },
  score: {
    player1: { type: Number, default: 0 },
    player2: { type: Number, default: 0 },
  },
  playersStats: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      playerName: { type: String },
      playerTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      teamName: { type: String },
      pointsWon: { type: Number, default: 0 },
      pointsLost: { type: Number, default: 0 },
      aces: { type: Number, default: 0 },
      doubleFaults: { type: Number, default: 0 },
      smashes: { type: Number, default: 0 },
      netPlays: { type: Number, default: 0 },
    },
  ],
  status: {
    type: String,
    enum: ["upcoming", "live", "completed", "due"],
    default: "upcoming",
  },
  Highlight: [{ type: String }],
});
const CricketMatch = mongoose.model("CricketMatch", cricketMatchSchema);
const FootballMatch = mongoose.model("FootballMatch", footballMatchSchema);
const BadmintonMatch = mongoose.model("BadmintonMatch", badmintonMatchSchema);

module.exports = {
  CricketMatch,
  FootballMatch,
  BadmintonMatch,
};
