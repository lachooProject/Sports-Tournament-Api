const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  photo: { type: String, required: true },
  name: { type: String, required: true },
  fatherName: { type: String, required: true },
  motherName: { type: String, required: true },
  phone: { type: Number, required: true },
  email: { type: String, required: true },
  rollNo: { type: Number, required: true },
  age: { type: Number, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  teamName: { type: String },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  category: {
    type: String,
  },
  losses: { type: Number, default: 0 },
  ranking: { type: Number, default: 0 },
  sport: {
    type: String,
    enum: ["Cricket", "Football", "Badminton"],
    required: true,
  },
  stats: {
    cricket: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      battingAverage: { type: Number, default: 0 },
      bowlingEconomy: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
    },
    football: {
      goals: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      fouls: { type: Number, default: 0 },
      yellowCards: { type: Number, default: 0 },
      redCards: { type: Number, default: 0 },
      passAccuracy: { type: Number, default: 0 },
    },
    badminton: {
      pointsScored: { type: Number, default: 0 },
      matchesWon: { type: Number, default: 0 },
      setsWon: { type: Number, default: 0 },
      smashCount: { type: Number, default: 0 },
    },
  },
});

const Player = mongoose.model("Player", playerSchema);

module.exports = { Player };
