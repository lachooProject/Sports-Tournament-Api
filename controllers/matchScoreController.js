const {
  CricketMatch,
  FootballMatch,
  BadmintonMatch,
} = require("../models/matchModel");
const { Player } = require("../models/playerModel");
const { Team } = require("../models/teamModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apperror");

//? All Match Details
exports.getAllmatch = catchAsync(async (req, res, next) => {
  const currentDate = new Date();

  // Get matches for all sports using Promise.all
  const [cricket, football, badminton] = await Promise.all([
    // Cricket Matches
    Promise.all([
      CricketMatch.find({
        status: "upcoming",
        date: { $gte: currentDate },
      })
        .populate("team1 team2")
        .sort({ date: 1 })
        .select("team1Name team2Name date venue status sport score"),
      CricketMatch.find({ status: "live" })
        .populate("team1 team2")
        .select("team1Name team2Name date venue status sport score"),
    ]),

    // Football Matches
    Promise.all([
      FootballMatch.find({
        status: "upcoming",
        date: { $gte: currentDate },
      })
        .populate("team1 team2")
        .sort({ date: 1 })
        .select("team1Name team2Name date venue status sport score"),
      FootballMatch.find({ status: "live" })
        .populate("team1 team2")
        .select("team1Name team2Name date venue status sport score"),
    ]),

    // Badminton Matches
    Promise.all([
      BadmintonMatch.find({
        status: "upcoming",
        date: { $gte: currentDate },
      })
        .populate("team1 team2")
        .sort({ date: 1 })
        .select("team1Name team2Name date venue status sport score"),
      BadmintonMatch.find({ status: "live" })
        .populate("team1 team2")
        .select("team1Name team2Name date venue status sport score"),
    ]),
  ]);

  // Destructure results
  const [cricketUpcoming, cricketLive] = cricket;
  const [footballUpcoming, footballLive] = football;
  const [badmintonUpcoming, badmintonLive] = badminton;

  // Combine all upcoming matches
  const upcomingMatches = [
    ...cricketUpcoming.map((match) => ({
      ...match.toObject(),
      sportType: "cricket",
    })),
    ...footballUpcoming.map((match) => ({
      ...match.toObject(),
      sportType: "football",
    })),
    ...badmintonUpcoming.map((match) => ({
      ...match.toObject(),
      sportType: "badminton",
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Combine all live matches
  const liveMatches = [
    ...cricketLive.map((match) => ({
      ...match.toObject(),
      sportType: "cricket",
    })),
    ...footballLive.map((match) => ({
      ...match.toObject(),
      sportType: "football",
    })),
    ...badmintonLive.map((match) => ({
      ...match.toObject(),
      sportType: "badminton",
    })),
  ];

  res.status(200).json({
    status: "success",
    message: "All matches fetched successfully",
    results: {
      upcoming: upcomingMatches.length,
      live: liveMatches.length,
    },
    data: {
      upcoming: upcomingMatches,
      live: liveMatches,
    },
  });
});

//? Get Cricket Match Controller
//? Create Cricket Match Controller
exports.getAllCricketMatches = catchAsync(async (req, res) => {
  const currentDate = new Date();
  const matchUpcoming = await CricketMatch.find({
    status: "upcoming",
    date: { $gte: currentDate },
  })
    .populate(`team1 team2`)
    .sort({ date: 1 })
    .select(`team1Name team2Name date venue status`);

  const matchLive = await CricketMatch.aggregate([
    {
      $match: {
        status: "live",
      },
    },
  ]);
  const matchRecent = await CricketMatch.aggregate([
    {
      $match: {
        status: "completed",
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    message: "Cricket matches fetched successfully",
    data: {
      matchUpcoming: matchUpcoming,
      matchLive: matchLive,
      matchRecent: matchRecent,
    },
  });
});

exports.createCricketMatch = catchAsync(async (req, res, next) => {
  const team1 = await Team.findById(req.body.team1);
  const team2 = await Team.findById(req.body.team2);
  if (!team1 || !team2) {
    return next(new AppError("Invalid team IDs", 400));
  }
  const team1Players = await Player.find({
    _id: team1.players,
    sport: "Cricket",
  });

  const team2Players = await Player.find({
    _id: team2.players,
    sport: "Cricket",
  });

  const initializePlayerStats = (player) => ({
    playerId: player._id,
    playerName: player.name,
    playerTeam: player.team,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0,
  });

  const allPlayers = team1Players.concat(team2Players);
  const playersStats = allPlayers.map(initializePlayerStats);

  const newMatch = await CricketMatch.create({
    ...req.body,
    team1Name: team1.name,
    team2Name: team2.name,
    playersStats,
  });
  res.status(201).json({
    status: "success",
    message: "Cricket match created successfully",
    match: newMatch,
  });
});

exports.updateStatusCricketMatch = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const { status, toosewon, choosebatting, choosebowling } = req.query;
  if (!status) {
    return next(new AppError("Status is required", 400));
  }
  if (status === "completed") {
    const match = await CricketMatch.findById(matchId);
    if (!match) {
      return next(new AppError("Match not found", 404));
    }
    const team1 = match.score.team1.score;
    const team2 = match.score.team2.score;
    if (team1 > team2) {
      match.winner = match.team1Name;
    } else if (team2 > team1) {
      match.winner = match.team2Name;
    } else {
      match.winner = "Draw";
    }
  }
  if (status === "live") {
    if ((toosewon, choosebatting, choosebowling)) {
      return next(
        new AppError(
          "Toose won, choose batting and choose bowling is required",
          400
        )
      );
    }
    const match = await CricketMatch.findById(matchId);
    if (!match) {
      return next(new AppError("Match not found", 404));
    }
    if (toosewon) {
      match.tosewon = toosewon;
    }
    if (choosebatting) {
      match.choosebatting = choosebatting;
    }
    if (choosebowling) {
      match.choosebowling = choosebowling;
    }
  }
  const match = await CricketMatch.findByIdAndUpdate(
    matchId,
    { status },
    { new: true }
  );
  if (!match) {
    return next(new AppError("Match not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Match status updated successfully",
  });
});

exports.updatePerBallStats = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const {
    runs,
    fours,
    sixes,
    whitballthrough: wideballthrough,
    wicket,
    outType,
  } = req.body;
  const match = await CricketMatch.findById(matchId);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }
  if (!req.body.batsmanId || !req.body.bowlerId) {
    return next(new AppError("Batsman and Bowler IDs are required", 400));
  }
  const batsman = match.playersStats.find((player) =>
    player.playerId.equals(req.body.batsmanId)
  );

  if (!batsman) {
    return next(new AppError("Batsman not found in match", 404));
  }

  // Determine which team is batting
  const battingTeam = batsman.playerTeam.equals(match.team1)
    ? "team1"
    : "team2";
  if (!fours && !sixes && !wicket && !wideballthrough) {
    // Add ball stats with correct ball number
    match.ballStats.push({
      ballNumber: match.score[battingTeam].teamballs,
      runs: runs,
      batsmanId: req.body.batsmanId,
      bowlerId: req.body.bowlerId,
    });
    if (batsman) {
      if (batsman.playerTeam.equals(match.team1)) {
        match.score.team1.score = match.score.team1.score + runs;
        match.score.team1.teamballs += 1;
        batsman.runs += runs;
        batsman.ballsFaced += 1;
      } else if (batsman.playerTeam.equals(match.team2)) {
        match.score.team2.score = match.score.team2.score + runs;
        match.score.team2.teamballs += 1;
        batsman.runs += runs;
        batsman.ballsFaced += 1;
        batsman.sixes += 1;
      }
    }
    const bowler = match.playersStats.find((player) =>
      player.playerId.equals(req.body.bowlerId)
    );
    if (bowler) {
      bowler.runsConceded += runs;
      bowler.ballsBowled += 1;
    }
  } else if (wideballthrough) {
    match.ballStats.push({
      ballNumber: match.score[battingTeam].teamballs,
      runs: 1,
      whitballthrough: true,
      batsmanId: req.body.batsmanId,
      bowlerId: req.body.bowlerId,
    });
    match.score[battingTeam].score += 1;
    match.playersStats.forEach((player) => {
      if (player.playerId.equals(req.body.bowlerId)) {
        player.runsConceded += 1;
        player.ballwhitethrough += 1;
      }
    });
    const batsman = match.playersStats.find((player) =>
      player.playerId.equals(req.body.batsmanId)
    );

    if (batsman) {
      if (batsman.playerTeam === match.team1) {
        match.score.team1.score = match.score.team1.score + 1;
      } else if (batsman.playerTeam.equals(match.team2)) {
        match.score.team2.score = match.score.team2.score + 1;
      }
    }
  } else if (wicket) {
    if (!req.body.outType) {
      return next(new AppError("Out type is required", 400));
    }
    match.ballStats.push({
      ballNumber: match.score[battingTeam].teamballs,
      wicket: true,
      outType: outType,
      batsmanId: req.body.batsmanId,
      bowlerId: req.body.bowlerId,
    });
    match.playersStats.forEach((player) => {
      if (player.playerId.equals(req.body.bowlerId)) {
        player.wickets += 1;
        player.ballsBowled += 1;
      }
      if (player.playerId.equals(req.body.batsmanId)) {
        player.isOut = true;
        player.outType = outType;
        player.ballsFaced += 1;
      }
    });
    const batsman = match.playersStats.find((player) =>
      player.playerId.equals(req.body.batsmanId)
    );
    if (batsman) {
      if (batsman.playerTeam.equals(match.team1)) {
        match.score.team1.wickets += 1;
        match.score.team1.teamballs += 1;
      } else if (batsman.playerTeam.equals(match.team2)) {
        match.score.team2.wickets += 1;
        match.score.team2.teamballs += 1;
      }
    }
  } else if (fours) {
    match.ballStats.push({
      ballNumber: match.score[battingTeam].teamballs,
      runs: 4,
      fours: true,
      batsmanId: req.body.batsmanId,
      bowlerId: req.body.bowlerId,
    });
    const batsman = match.playersStats.find((player) =>
      player.playerId.equals(req.body.batsmanId)
    );
    if (batsman) {
      if (batsman.playerTeam.equals(match.team1)) {
        match.score.team1.score = match.score.team1.score + 4;
        match.score.team1.teamballs += 1;
        batsman.runs += 4;
        batsman.fours += 1;
        batsman.ballsFaced += 1;
      } else if (batsman.playerTeam.equals(match.team2)) {
        match.score.team2.score = match.score.team2.score + 4;
        match.score.team2.teamballs += 1;
        batsman.runs += 4;
        batsman.ballsFaced += 1;
        batsman.fours += 1;
      }
    }
    const bowler = match.playersStats.find((player) =>
      player.playerId.equals(req.body.bowlerId)
    );
    if (bowler) {
      bowler.runsConceded += 4;
      bowler.ballsBowled += 1;
    }
  } else if (sixes) {
    match.ballStats.push({
      ballNumber: match.score[battingTeam].teamballs,
      runs: 6,
      sixes: true,
      batsmanId: req.body.batsmanId,
      bowlerId: req.body.bowlerId,
    });
    const batsman = match.playersStats.find((player) =>
      player.playerId.equals(req.body.batsmanId)
    );
    if (batsman) {
      if (batsman.playerTeam.equals(match.team1)) {
        console.log(match.score.team1.score);
        match.score.team1.score = match.score.team1.score + 6;
        console.log(match.score.team1.score);
        match.score.team1.teamballs += 1;
        batsman.runs += 6;
        batsman.sixes += 1;
        batsman.ballsFaced += 1;
      } else if (batsman.playerTeam.equals(match.team2)) {
        match.score.team2.score = match.score.team2.score + 6;
        match.score.team2.teamballs += 1;
        batsman.runs += 6;
        batsman.ballsFaced += 1;
        batsman.sixes += 1;
      }
    }
    const bowler = match.playersStats.find((player) =>
      player.playerId.equals(req.body.bowlerId)
    );
    if (bowler) {
      bowler.runsConceded += 6;
      bowler.ballsBowled += 1;
    }
  }
  match.save();
  res.status(200).json({
    status: "success",
    message: "Ball stats updated successfully",
    data: {
      match,
    },
  });
});

exports.getCricketMatchById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const match = await CricketMatch.findById(id);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }
  res.status(200).json({
    status: "success",
    message: "Cricket match fetched successfully",
    data: {
      match,
    },
  });
});

//? Football Match Controller
exports.createFootballMatch = async (req, res) => {
  const { team1, team2, date, venue } = req.body;
  const [team1Data, team2Data] = await Promise.all([
    Team.findById(team1).populate("players"),
    Team.findById(team2).populate("players"),
  ]);

  if (!team1Data || !team2Data) {
    return next(new AppError("Team not found", 404));
  }

  // Initialize player stats for both teams
  const playersStats = [
    ...team1Data.players.map((player) => ({
      player: player._id,
      playerName: player.name,
      playerTeam: team1,
      goals: 0,
      assists: 0,
      penalty: 0,
      yellowcards: 0,
      redcards: 0,
      saves: 0,
      shots: 0,
      tackles: 0,
    })),
    ...team2Data.players.map((player) => ({
      player: player._id,
      playerName: player.name,
      playerTeam: team2,
      goals: 0,
      assists: 0,
      penalty: 0,
      yellowcards: 0,
      redcards: 0,
      saves: 0,
      shots: 0,
      tackles: 0,
    })),
  ];

  // Create match with player stats
  const newMatch = await FootballMatch.create({
    team1,
    team2,
    team1Name: team1Data.name,
    team2Name: team2Data.name,
    date,
    venue,
    playersStats,
    status: "upcoming",
  });

  res.status(201).json({
    status: "success",
    message: "Football match created successfully",
    data: {
      match: newMatch,
    },
  });
};

exports.updateStatusFootballMatch = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const { status } = req.query;

  // Input validation
  if (!status || !["upcoming", "live", "completed"].includes(status)) {
    return next(new AppError("Invalid status value", 400));
  }

  // Find and update in one operation

  const match = await FootballMatch.findOneAndUpdate(
    { _id: matchId },
    {
      $set: { status: status },
    },
    {
      new: true, // Return updated document
      runValidators: true, // Run schema validators
    }
  );

  if (!match) {
    return next(new AppError("Match not found", 404));
  }

  // Handle completion logic
  if (status === "completed") {
    const team1Score = match.score.team1;
    const team2Score = match.score.team2;

    // Update winner
    if (team1Score > team2Score) {
      match.winner = match.team1Name;
    } else if (team2Score > team1Score) {
      match.winner = match.team2Name;
    } else {
      match.winner = "Draw";
    }

    // Save winner update
    await match.save();
  }

  res.status(200).json({
    status: "success",
    message: "Match status updated successfully",
    data: {
      match,
    },
  });
});

exports.getFootballMatchById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const match = await FootballMatch.findById(id);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }
  res.status(200).json({
    message: "Football match fetched successfully",
    data: {
      match,
    },
  });
});

exports.updateFootballMatchStats = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const {
    playerId,
    eventType, // 'goal', 'assist', 'yellowCard', 'redCard', 'save', 'tackle', 'shot'
  } = req.body;

  const match = await FootballMatch.findById(matchId);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }

  // Find player in match
  const player = match.playersStats.find((p) => p.player.equals(playerId));

  if (!player) {
    return next(new AppError("Player not found in match", 404));
  }

  // Determine player's team
  const playerTeam = player.playerTeam.equals(match.team1) ? "team1" : "team2";

  // Update stats based on event type
  switch (eventType) {
    case "goal":
      player.goals += 1;
      match.score[playerTeam] += 1;
      player.shots += 1;
      break;

    case "assist":
      player.assists += 1;
      break;

    case "yellowCard":
      player.yellowcards += 1;
      break;

    case "redCard":
      player.redcards += 1;
      break;

    case "save":
      player.saves += 1;
      break;

    case "shot":
      player.shots += 1;
      break;

    case "tackle":
      player.tackles += 1;
      break;

    default:
      return next(new AppError("Invalid event type", 400));
  }

  // Mark modified fields
  match.markModified("playersStats");
  match.markModified("score");
  match.markModified("matchEvents");

  await match.save();

  res.status(200).json({
    status: "success",
    message: "Football match stats updated successfully",
    data: {
      match,
      eventDetails: {
        player: player.playerName,
        eventType,
        currentScore: `${match.team1Name} ${match.score.team1} - ${match.score.team2} ${match.team2Name}`,
      },
    },
  });
});

//? Badminton Match Controller
exports.createBadmintonMatch = catchAsync(async (req, res, next) => {
  const { team1, team2, date, venue } = req.body;

  // First find both teams and their badminton players
  const [team1Data, team2Data] = await Promise.all([
    Team.findById(team1).populate({
      path: "players",
    }),
    Team.findById(team2).populate({
      path: "players",
    }),
  ]);

  if (!team1Data || !team2Data) {
    return next(new AppError("One or both teams not found", 404));
  }

  // Get first badminton player from each team
  const player1Data = team1Data.players[0];
  const player2Data = team2Data.players[0];

  console.log(player1Data);
  console.log(player2Data);

  if (!player1Data || !player2Data) {
    return next(
      new AppError("Both teams must have at least one badminton player", 404)
    );
  }

  // Initialize player stats
  const playersStats = [
    {
      player: player1Data._id,
      playerName: player1Data.name,
      playerTeam: team1Data._id,
      teamName: team1Data.name,
      pointsWon: 0,
      pointsLost: 0,
      aces: 0,
      doubleFaults: 0,
      smashes: 0,
      netPlays: 0,
    },
    {
      player: player2Data._id,
      playerName: player2Data.name,
      playerTeam: team2Data._id,
      teamName: team2Data.name,
      pointsWon: 0,
      pointsLost: 0,
      aces: 0,
      doubleFaults: 0,
      smashes: 0,
      netPlays: 0,
    },
  ];

  // Create and save match
  const newMatch = await BadmintonMatch.create({
    player1: player1Data._id,
    player2: player2Data._id,
    player1Name: player1Data.name,
    player2Name: player2Data.name,
    team1: team1Data._id,
    team2: team2Data._id,
    team1Name: team1Data.name,
    team2Name: team2Data.name,
    sport: "Badminton",
    sportType: "badminton",
    date,
    venue,
    playersStats,
    status: "upcoming",
    score: {
      player1: 0,
      player2: 0,
    },
    sets: [],
    Highlight: [],
  });

  // Populate the created match
  const populatedMatch = await BadmintonMatch.findById(newMatch._id)
    .populate({
      path: "player1",
      select: "name photo",
    })
    .populate({
      path: "player2",
      select: "name photo",
    })
    .populate({
      path: "team1",
      select: "name photo",
    })
    .populate({
      path: "team2",
      select: "name photo",
    });

  res.status(201).json({
    status: "success",
    message: "Badminton match created successfully",
    data: {
      match: populatedMatch,
    },
  });
});

exports.updateStatusBadmintonMatch = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const { status } = req.query;

  // Validate required fields
  if (!status) {
    return next(new AppError("Status is required", 400));
  }

  // Find match
  const match = await BadmintonMatch.findById(matchId);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }

  // Update status
  match.status = status;

  // If match is completed, determine winner
  if (status === "completed") {
    const player1Score = match.score.player1;
    const player2Score = match.score.player2;

    if (player1Score > player2Score) {
      match.winner = match.team1Name;
    } else if (player2Score > player1Score) {
      match.winner = match.team2Name;
    } else {
      match.winner = "Draw";
    }

    // Update player stats if needed
    match.playersStats.forEach((playerStat) => {
      if (playerStat.player.equals(match.winner)) {
        playerStat.matchesWon = (playerStat.matchesWon || 0) + 1;
      }
    });
  }

  // Save changes
  await match.save();

  res.status(200).json({
    status: "success",
    message: "Badminton match status updated successfully",
    data: {
      match,
    },
  });
});
exports.getBadmintonMatchById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const match = await BadmintonMatch.findById(req.params.id);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }
  res.status(200).json({
    message: "Football match fetched successfully",
    data: {
      match,
    },
  });
});
exports.updateBadmintonMatchStats = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const {
    playerId,
    eventType, // 'point', 'ace', 'doubleFault', 'smash', 'netPlay'
    isPointWon,
  } = req.body;

  const match = await BadmintonMatch.findById(matchId);
  if (!match) {
    return next(new AppError("Match not found", 404));
  }

  // Find player in match
  const player = match.playersStats.find((p) => p.player.equals(playerId));

  if (!player) {
    return next(new AppError("Player not found in match", 404));
  }

  // Determine if it's player1 or player2
  const playerNumber = player.player.equals(match.player1)
    ? "player1"
    : "player2";

  try {
    // Update stats based on event type
    switch (eventType) {
      case "point":
        if (isPointWon) {
          player.pointsWon += 1;
          match.score[playerNumber] += 1;
        } else {
          player.pointsLost += 1;
          const oppositePlayer =
            playerNumber === "player1" ? "player2" : "player1";
          match.score[oppositePlayer] += 1;
        }
        break;

      case "ace":
        player.aces += 1;
        player.pointsWon += 1;
        match.score[playerNumber] += 1;
        break;

      case "doubleFault":
        player.doubleFaults += 1;
        player.pointsLost += 1;
        const oppositePlayer =
          playerNumber === "player1" ? "player2" : "player1";
        match.score[oppositePlayer] += 1;
        break;

      case "smash":
        player.smashes += 1;
        if (isPointWon) {
          player.pointsWon += 1;
          match.score[playerNumber] += 1;
        }
        break;

      case "netPlay":
        player.netPlays += 1;
        if (isPointWon) {
          player.pointsWon += 1;
          match.score[playerNumber] += 1;
        }
        break;

      default:
        return next(new AppError("Invalid event type", 400));
    }

    // Mark modified fields
    match.markModified("playersStats");
    match.markModified("score");

    await match.save();

    res.status(200).json({
      status: "success",
      message: "Badminton match stats updated successfully",
      data: {
        match,
        eventDetails: {
          player: player.playerName,
          eventType,
          isPointWon,
          currentScore: `${match.player1Name} ${match.score.player1} - ${match.score.player2} ${match.player2Name}`,
        },
      },
    });
  } catch (error) {
    console.error("Error updating badminton stats:", error);
    return next(new AppError("Error updating match stats", 500));
  }
});

//! END
