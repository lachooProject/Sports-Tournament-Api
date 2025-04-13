const { Player } = require("../models/playerModel");
const { Team } = require("../models/teamModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apperror");
const cloudinary = require("../utils/FileUpload");

exports.createPlayer = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Enter the image", 400));
  }
  const result = await cloudinary.uploadToCloudinary(req.file.path, {
    folder: "player_photos",
  });

  const newPlayer = await Player.create({
    ...req.body,
    photo: result.secure_url,
  });

  res.status(201).json({
    status: "success",
    message: "New Player created successfully",
    data: {
      newPlayer,
    },
  });
});

exports.getAllPlayers = catchAsync(async (req, res) => {
  const players = await Player.find();
  res.status(200).json({
    status: "success",
    message: "Players fetched successfully",
    data: {
      playerData,
    },
  });
});

exports.getPlayerById = catchAsync(async (req, res, next) => {
  const { playerId } = req.params;

  const player = await Player.findById(playerId);
  if (!player) {
    return next(new AppError("Player not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Player fetched successfully",
    data: {
      player,
    },
  });
});

exports.getAllPlayersSports = catchAsync(async (req, res, next) => {
  const { sports } = req.query;
  let players;
  if (!sports) {
    players = await Player.find({}).select(`_id name photo sport`);
  } else {
    players = await Player.find({
      sport: sports,
    }).select(`_id name photo sport`);
  }
  res.status(200).json({
    status: "Success",
    message: "Fetch all the player ${sports}",
    data: players,
  });
});

exports.updatePlayer = catchAsync(async (req, res) => {
  const { playerId } = req.params;

  const updatedPlayer = await Player.findByIdAndUpdate(playerId, req.body, {
    new: true,
  });
  if (!updatedPlayer) {
    return next(new AppError("Player not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Player updated successfully",
    data: {
      updatedPlayer,
    },
  });
});

exports.deletePlayer = catchAsync(async (req, res) => {
  const { playerId } = req.params;

  const deletedPlayer = await Player.findByIdAndDelete(playerId);
  if (!deletedPlayer) {
    return next(new AppError("Player not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Cricket player deleted successfully",
  });
});

//? Team Controller
//* Create a new team

exports.createTeam = catchAsync(async (req, res, next) => {
  const { players } = req.body;
  if (!req.file) {
    return next(new AppError("Enter the image", 400));
  }
  const result = await cloudinary.uploadToCloudinary(req.file.path, {
    folder: "teams_photo",
  });
  const newTeam = await Team.create({ ...req.body, photo: result.secure_url });
  for (data of players) {
    const PlayerUpdate = await Player.findById(data);
    PlayerUpdate.teamName = newTeam.name;
    PlayerUpdate.team = newTeam._id;
    await PlayerUpdate.save();
  }
  res.status(201).json({
    status: "success",
    message: "New Team created successfully",
    data: {
      newTeam,
    },
  });
});

exports.getTeamSports = catchAsync(async (req, res, next) => {
  const { sports } = req.query;

  if (!sports) {
    const team = await Team.find().select(`name _id photo sport`);
    res.status(200).json({
      status: "success",
      message: `Teams fetched successfully`,
      results: team.length,
      data: team,
    });
    return;
  }

  const teams = await Team.find({ sport: sports })
    .select("_id name photo category")
    .populate({
      path: "players",
      select: "name category photo",
      match: { sport: sports },
    });

  if (!teams) {
    return next(new AppError(`No teams found for sport: ${sports}`, 404));
  }

  // Format response data
  const formattedTeams = teams.map((team) => ({
    teamId: team._id,
    teamName: team.name,
    teamPhoto: team.photo,
    teamCategory: team.category,
    players: team.players.map((player) => ({
      playerId: player._id,
      playerName: player.name,
      playerPhoto: player.photo,
      playerCategory: player.category,
    })),
  }));

  res.status(200).json({
    status: "success",
    message: `Teams fetched successfully for ${sports}`,
    results: teams.length,
    data: {
      teams: formattedTeams,
    },
  });
});

//* Get all teams
exports.getAllTeams = catchAsync(async (req, res) => {
  const teams = await Team.find();
  res.status(200).json({
    status: "success",
    message: "Teams fetched successfully",
    data: {
      teams,
    },
  });
});

exports.getTeamById = catchAsync(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId).populate({
    path: "players",
    select: "name _id photo category team",
  });
  if (!team) {
    return next(new AppError("Team not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Team fetched successfully",
    noofMembers: team.players.length,
    data: {
      team,
    },
  });
});

exports.updateTeam = catchAsync(async (req, res) => {
  const { teamId } = req.params;

  const updatedTeam = await Team.findByIdAndUpdate(teamId, req.body, {
    new: true,
  });
  if (!updatedTeam) {
    return next(new AppError("Team not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Team updated successfully",
    data: {
      updatedTeam,
    },
  });
});

exports.deleteTeam = catchAsync(async (req, res) => {
  const { teamId } = req.params;

  const deletedTeam = await Team.findByIdAndDelete(teamId);
  if (!deletedTeam) {
    return next(new AppError("Team not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Team deleted successfully",
  });
});
