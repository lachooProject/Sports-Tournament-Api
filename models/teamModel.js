const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  photo: { type: String, required: true },
  name: { type: String, required: true },
  sport: {
    type: String,
    enum: ["Cricket", "Football", "Badminton"],
    required: true,
  },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  captain: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
});
const Team = mongoose.model("Team", teamSchema);
module.exports = { Team };
