const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apperror");
const { Player } = require("../models/playerModel");
const { Team } = require("../models/teamModel");
const { user } = require("../models/authModel");
const jwt = require("jsonwebtoken");
const {
  CricketMatch,
  FootballMatch,
  BadmintonMatch,
} = require("../models/matchModel");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {});
};

exports.teamsProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const team = await Team.findById(id).populate({
    path: "players",
    select: "name photo category _id sport age position",
  });

  if (!team) {
    return next(new AppError("No team found with that ID", 404));
  }

  // Get total wins from matches by team ID
  const [cricketWins, footballWins, badmintonWins] = await Promise.all([
    CricketMatch.countDocuments({
      $or: [
        { team1: team._id, winner: team.name },
        { team2: team._id, winner: team.name },
      ],
    }),
    FootballMatch.countDocuments({
      $or: [
        { team1: team._id, winner: team.name },
        { team2: team._id, winner: team.name },
      ],
    }),
    BadmintonMatch.countDocuments({
      $or: [
        { team1: team._id, winner: team.name },
        { team2: team._id, winner: team.name },
      ],
    }),
  ]);

  // Get recent matches
  const recentMatches = await Promise.all([
    CricketMatch.find({
      $or: [{ team1: team._id }, { team2: team._id }],
      status: "completed",
    })
      .sort({ date: -1 })
      .limit(5),
    FootballMatch.find({
      $or: [{ team1: team._id }, { team2: team._id }],
      status: "completed",
    })
      .sort({ date: -1 })
      .limit(5),
    BadmintonMatch.find({
      $or: [{ team1: team._id }, { team2: team._id }],
      status: "completed",
    })
      .sort({ date: -1 })
      .limit(5),
  ]);

  // Group players by sport
  const playersBySport = {
    Cricket: team.players.filter((player) => player.sport === "Cricket"),
    Football: team.players.filter((player) => player.sport === "Football"),
    Badminton: team.players.filter((player) => player.sport === "Badminton"),
  };

  // Format team data for visualization
  const formattedTeam = {
    basicInfo: {
      _id: team._id,
      name: team.name,
      logo: team.logo,
      photo: team.photo,
      establishedYear: team.createdAt,
    },
    stats: {
      totalPlayers: team.players.length,
      sportWiseStats: {
        Cricket: {
          players: playersBySport.Cricket.length,
          wins: cricketWins,
          recentForm: recentMatches[0].map((match) => ({
            date: match.date,
            result: match.winner === team.name ? "W" : "L",
            opponent: match.team1.equals(team._id)
              ? match.team2Name
              : match.team1Name,
            score: `${match.score.team1} - ${match.score.team2}`,
          })),
        },
        Football: {
          players: playersBySport.Football.length,
          wins: footballWins,
          recentForm: recentMatches[1].map((match) => ({
            date: match.date,
            result: match.winner === team.name ? "W" : "L",
            opponent:
              match.team1 === team.name ? match.team2Name : match.team1Name,
            score: `${match.score.team1} - ${match.score.team2}`,
          })),
        },
        Badminton: {
          players: playersBySport.Badminton.length,
          wins: badmintonWins,
          recentForm: recentMatches[2].map((match) => ({
            date: match.date,
            result: match.winner === team.name ? "W" : "L",
            opponent: match.team1.equals(team._id)
              ? match.team2Name
              : match.team1Name,
            score: `${match.score.player1} - ${match.score.player2}`,
          })),
        },
      },
    },
    players: playersBySport,
    visualData: {
      pieChart: {
        labels: ["Cricket", "Football", "Badminton"],
        data: [
          playersBySport.Cricket.length,
          playersBySport.Football.length,
          playersBySport.Badminton.length,
        ],
      },
      performanceGraph: {
        labels: ["Cricket", "Football", "Badminton"],
        wins: [cricketWins, footballWins, badmintonWins],
        winPercentages: [
          ((cricketWins / (recentMatches[0].length || 1)) * 100).toFixed(1),
          ((footballWins / (recentMatches[1].length || 1)) * 100).toFixed(1),
          ((badmintonWins / (recentMatches[2].length || 1)) * 100).toFixed(1),
        ],
      },
      recentForm: {
        dates: recentMatches
          .flat()
          .map((m) => m.date)
          .sort((a, b) => b - a)
          .slice(0, 5),
        results: recentMatches
          .flat()
          .sort((a, b) => b.date - a.date)
          .slice(0, 5),
      },
    },
  };

  res.status(200).json({
    status: "success",
    data: {
      team: formattedTeam,
    },
  });
});

exports.playerProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  // Update population to include more team fields
  const player = await Player.findById(id).populate("team", "name photo _id");

  if (!player) {
    return next(new AppError("Player not found", 404));
  }

  // Get last 6 matches for performance trends
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  let matchStats = {};
  let performanceHistory = [];
  let strengthsAndWeaknesses = {};
  let careerStats = {};
  let visualData = {};

  switch (player.sport) {
    case "Cricket":
      const cricketMatches = await CricketMatch.find({
        "playersStats.playerId": player._id,
        status: "completed",
      })
        .sort({ date: -1 })
        .limit(6);
      const matchplayed = cricketMatches.filter((match) =>
        match.playersStats.some((p) => p.playerId.equals(player._id))
      ).length;
      const totalwin = cricketMatches.filter((match) => {
        const playerInMatch = match.playersStats.some((p) =>
          p.playerId.equals(player._id)
        );
        const playerStat = match.playersStats.find((p) =>
          p.playerId.equals(player._id)
        );
        const playerTeamName = playerStat
          ? playerStat.playerTeam.equals(match.team1)
            ? match.team1Name
            : match.team2Name
          : 0;

        // Check if player's team name matches the winning team name
        const isWinner = match.winner === playerTeamName;

        return playerInMatch && isWinner;
      }).length;
      const winPercentage = (totalwin / matchplayed) * 100;
      careerStats = {
        matchesPlayed: matchplayed,
        wins: totalwin,
        losses: cricketMatches.filter((match) => {
          // Check if the player played in this match
          const playerInMatch = match.playersStats.some((p) =>
            p.playerId.equals(player._id)
          );

          // Get the player's team name
          const playerStat = match.playersStats.find((p) =>
            p.playerId.equals(player._id)
          );
          const playerTeamName = playerStat
            ? playerStat.playerTeam.equals(match.team1)
              ? match.team1Name
              : match.team2Name
            : 0;

          // Check if the player's team lost (i.e., winner is not player's team)
          const isLoser =
            match.winner && playerTeamName && match.winner !== playerTeamName;

          return playerInMatch && isLoser;
        }).length,
        ranking: 0,
        totalBoundaries: cricketMatches.reduce(
          (acc, match) => {
            const stats =
              match.playersStats.find((p) => p.playerId.equals(player._id)) ||
              {};
            acc.totalFours += stats.fours || 0;
            acc.totalSixes += stats.sixes || 0;
            return acc;
          },
          { totalFours: 0, totalSixes: 0 }
        ),
        totalWickets: cricketMatches.reduce(
          (acc, match) => {
            const stats =
              match.playersStats.find((p) => p.playerId.equals(player._id)) ||
              {};
            acc.totalWickets += stats.wickets || 0;
            return acc;
          },
          { totalWickets: 0 }
        ),
        winPercentage: winPercentage === null ? 0 : winPercentage,
      };

      performanceHistory = {
        dates: cricketMatches.map((m) => m.date.toLocaleDateString()),
        batting: {
          runs: cricketMatches.map(
            (m) =>
              m.playersStats.find((p) => p.playerId.equals(player._id))?.runs ||
              0
          ),
          strikeRate: cricketMatches.map((m) => {
            const stats = m.playersStats.find((p) =>
              p.playerId.equals(player._id)
            );
            return stats?.ballsFaced
              ? ((stats.runs / stats.ballsBowled) * 100).toFixed(2)
              : 0;
          }),
        },
        bowling: {
          wickets: cricketMatches.map(
            (m) =>
              m.playersStats.find((p) => p.playerId.equals(player._id))
                ?.wickets || 0
          ),
          economy: cricketMatches.map((m) => {
            const stats = m.playersStats.find((p) =>
              p.playerId.equals(player._id)
            );
            return stats?.ballsBowled
              ? (stats.runsConceded / (stats.ballsBowled / 6)).toFixed(2)
              : 0;
          }),
        },
      };
      visualData = calculatePlayerPerformance(
        player._id,
        cricketMatches,
        player.category === "Bowler" ? "Bowler" : "Batsman"
      );

      matchStats = {
        battingStats: {
          totalRuns: cricketMatches.reduce((sum, match) => {
            const playerStats = match.playersStats.find((p) =>
              p.playerId.equals(player._id)
            );
            return sum + (playerStats?.runs || 0);
          }, 0),
          battingAverage: player.stats.cricket.battingAverage,
          strikeRate: player.stats.cricket.strikeRate,
          highestScore: Math.max(
            ...cricketMatches.map(
              (m) =>
                m.playersStats.find((p) => p.playerId.equals(player._id))
                  ?.runs || 0
            )
          ),
          boundaries: {
            fours: cricketMatches.reduce(
              (total, match) =>
                total +
                (match.playersStats.find((p) => p.playerId.equals(player._id))
                  ?.fours || 0),
              0
            ),
            sixes: cricketMatches.reduce(
              (total, match) =>
                total +
                (match.playersStats.find((p) => p.playerId.equals(player._id))
                  ?.sixes || 0),
              0
            ),
          },
        },
        bowlingStats: {
          wickets: player.stats.cricket.wickets,
          economy: player.stats.cricket.bowlingEconomy,
          bestBowling: {
            wickets: Math.max(
              ...cricketMatches.map(
                (m) =>
                  m.playersStats.find((p) => p.playerId.equals(player._id))
                    ?.wickets || 0
              )
            ),
            runs: Math.min(
              ...cricketMatches.map(
                (m) =>
                  m.playersStats.find((p) => p.playerId.equals(player._id))
                    ?.runsConceded || 999
              )
            ),
          },
        },
      };

      strengthsAndWeaknesses = {
        strengths: [
          player.stats.cricket.battingAverage > 30
            ? "Strong Batting Average"
            : null,
          player.stats.cricket.strikeRate > 120
            ? "Excellent Strike Rate"
            : null,
          player.stats.cricket.bowlingEconomy < 7 ? "Economic Bowling" : null,
        ].filter(Boolean),
        areasToImprove: [
          player.stats.cricket.battingAverage < 20
            ? "Batting Consistency"
            : null,
          player.stats.cricket.strikeRate < 100 ? "Batting Strike Rate" : null,
          player.stats.cricket.bowlingEconomy > 8 ? "Bowling Economy" : null,
        ].filter(Boolean),
      };
      break;

    case "Football":
      const footballMatches = await FootballMatch.find({
        "playersStats.player": player._id,
        status: "completed",
      })
        .sort({ date: -1 })
        .limit(6);
        
      console.log(footballMatches);


      const Foomatchplayed = footballMatches.filter((match) =>
        match.playersStats.some((p) => p.player.equals(player._id))
      ).length;



      const Foototalwin = footballMatches.filter((match) => {
        const playerInMatch = match.playersStats.some((p) =>
          p.player.equals(player._id)
        );
        const playerStat = match.playersStats.find((p) =>
          p.player.equals(player._id)
        );
        const playerTeamName = playerStat
          ? playerStat.playerTeam.equals(match.team1)
            ? match.team1Name
            : match.team2Name
          : 0;

        const isWinner = match.winner === playerTeamName;

        return playerInMatch && isWinner;
      }).length;




      const FoowinPercentage = (Foototalwin / Foomatchplayed) * 100;

      careerStats = {
        matchesPlayed: Foomatchplayed,
        wins: Foototalwin,
        losses: footballMatches.filter((match) => {
          
          const playerInMatch = match.playersStats.some((p) =>
            p.player.equals(player._id)
          );

          // Get the player's team name
          const playerStat = match.playersStats.find((p) =>
            p.player.equals(player._id)
          );
          const playerTeamName = playerStat
            ? playerStat.playerTeam.equals(match.team1)
              ? match.team1Name
              : match.team2Name
            : 0;

          const isLoser =
            match.winner && playerTeamName && match.winner !== playerTeamName;

          return playerInMatch && isLoser;
        }).length,


        ranking: 0,
        winPercentage: FoowinPercentage === null ? 0 : FoowinPercentage,
      };

      performanceHistory = {
        dates: footballMatches.map((m) => m.date.toLocaleDateString()),
        attack: {
          goals: footballMatches.map(
            (m) =>
              m.playersStats.find((p) => p.player.equals(player._id))?.goals ||
              0
          ),
          assists: footballMatches.map(
            (m) =>
              m.playersStats.find((p) => p.player.equals(player._id))
                ?.assists || 0
          ),
        },
        defense: {
          tackles: footballMatches.map(
            (m) =>
              m.playersStats.find((p) => p.player.equals(player._id))
                ?.tackles || 0
          ),
        },
      };

      visualData = calculateFootballPerformance(player._id, footballMatches);

      matchStats = {
        attacking: {
          goals: player.stats.football.goals,
          assists: player.stats.football.assists,
          shotAccuracy: `${(
            (player.stats.football.goals / player.stats.football.shots) *
            100
          ).toFixed(1)}%`,
        },
        discipline: {
          fouls: player.stats.football.fouls,
          yellowCards: player.stats.football.yellowCards,
          redCards: player.stats.football.redCards,
        },
        general: {
          passAccuracy: `${player.stats.football.passAccuracy}%`,
          tackles: footballMatches.reduce(
            (total, match) =>
              total +
              (match.playersStats.find((p) => p.player.equals(player._id))
                ?.tackles || 0),
            0
          ),
        },
      };

      strengthsAndWeaknesses = {
        strengths: [
          player.stats.football.goals > 5 ? "Goal Scoring Ability" : null,
          player.stats.football.assists > 3 ? "Playmaking Skills" : null,
          player.stats.football.passAccuracy > 80
            ? "Excellent Pass Accuracy"
            : null,
        ].filter(Boolean),
        areasToImprove: [
          player.stats.football.yellowCards > 3 ? "Discipline" : null,
          player.stats.football.passAccuracy < 70 ? "Passing Accuracy" : null,
          player.stats.football.goals < 2 ? "Goal Scoring" : null,
        ].filter(Boolean),
      };
      break;

    case "Badminton":
      const badmintonMatches = await BadmintonMatch.find({
        $or: [{ player1: player._id }, { player2: player._id }],
        status: "completed",
      })
        .sort({ date: -1 })
        .limit(6);
      
       const Batmatchplayed = badmintonMatches.filter((match) =>
         match.playersStats.some((p) => p.player.equals(player._id))
       ).length;

       const Battotalwin = badmintonMatches.filter((match) => {
         const playerInMatch = match.playersStats.some((p) =>
           p.player.equals(player._id)
         );
         const playerStat = match.playersStats.find((p) =>
           p.player.equals(player._id)
         );
         const playerTeamName = playerStat
           ? playerStat.playerTeam.equals(match.team1)
             ? match.team1Name
             : match.team2Name
           : 0;

         const isWinner = match.winner === playerTeamName;

         return playerInMatch && isWinner;
       }).length;

       const BatwinPercentage = (Battotalwin / Batmatchplayed) * 100;

      careerStats = {
        matchesPlayed: Batmatchplayed,
        wins: Battotalwin,
        losses: badmintonMatches.filter((match) => {
          const playerInMatch = match.playersStats.some((p) =>
            p.player.equals(player._id)
          );

          // Get the player's team name
          const playerStat = match.playersStats.find((p) =>
            p.player.equals(player._id)
          );
          const playerTeamName = playerStat
            ? playerStat.playerTeam.equals(match.team1)
              ? match.team1Name
              : match.team2Name
            : 0;

          const isLoser =
            match.winner && playerTeamName && match.winner !== playerTeamName;

          return playerInMatch && isLoser;
        }).length,
        ranking: 0,
        winPercentage: BatwinPercentage,
      };


      visualData = calculateBadmintonPerformance(player._id, badmintonMatches);

      performanceHistory = {
        dates: badmintonMatches.map((m) => m.date.toLocaleDateString()),
        performance: {
          pointsWon: badmintonMatches.map(
            (m) =>
              m.playersStats.find((p) => p.player.equals(player._id))
                ?.pointsWon || 0
          ),
          smashes: badmintonMatches.map(
            (m) =>
              m.playersStats.find((p) => p.player.equals(player._id))
                ?.smashes || 0
          ),
        },
      };

      matchStats = {
        overall: {
          matchesWon: player.stats.badminton.matchesWon,
          winRate: `${(
            (player.stats.badminton.matchesWon / player.matchesPlayed) *
            100
          ).toFixed(1)}%`,
          totalPoints: player.stats.badminton.pointsScored,
        },
        technical: {
          smashes: player.stats.badminton.smashCount,
          aces: badmintonMatches.reduce(
            (total, match) =>
              total +
              (match.playersStats.find((p) => p.player.equals(player._id))
                ?.aces || 0),
            0
          ),
          netPlays: badmintonMatches.reduce(
            (total, match) =>
              total +
              (match.playersStats.find((p) => p.player.equals(player._id))
                ?.netPlays || 0),
            0
          ),
        },
      };

      strengthsAndWeaknesses = {
        strengths: [
          player.stats.badminton.smashCount > 20 ? "Strong Smashing" : null,
          player.stats.badminton.matchesWon > 5 ? "Consistent Winner" : null,
        ].filter(Boolean),
        areasToImprove: [
          player.stats.badminton.matchesWon < 3
            ? "Match Winning Ability"
            : null,
          player.stats.badminton.smashCount < 10 ? "Attacking Play" : null,
        ].filter(Boolean),
      };
      break;
  }

  // Calculate performance metrics for radar chart
  const performanceMetrics = {
    labels:
      player.sport === "Cricket"
        ? ["Batting", "Bowling", "Fielding", "Consistency", "Form"]
        : player.sport === "Football"
        ? ["Attack", "Defense", "Passing", "Speed", "Teamwork"]
        : ["Serves", "Smashes", "Returns", "Net Play", "Movement"],
    data: calculatePerformanceMetrics(player, matchStats), // Implementation depends on sport
  };

  // Format response with enhanced team info
  const playerProfile = {
    basicInfo: {
      _id: player._id,
      name: player.name,
      photo: player.photo,
      age: player.age,
      sport: player.sport,
      teamInfo: player.team
        ? {
            _id: player.team._id,
            name: player.team.name,
            photo: player.team.photo,
          }
        : {
            _id: "NO Team",
            name: "NO Team",
            photo: "NO Team",
          },
      category: player.category,
      position: player.position,
    },
    careerStats:
      careerStats
        ,
    currentForm: {
      recentMatches: performanceHistory,
      performanceMetrics,
      strengthsAndWeaknesses,
    },
    visualData: {
      performanceHistory,
      radarData:
        {
              labels: visualData.radarData.labels,
              data: visualData.radarData.data,
            },
          
      heatmapData: {
        matchDates: performanceHistory.dates,
        intensity: calculateIntensity(matchStats), // Implementation depends on sport
      },
    },
  };

  res.status(200).json({
    status: "success",
    data: {
      player: playerProfile,
    },
  });
});

exports.allmatch = catchAsync(async (req, res, next) => {
  const now = new Date();

  const [cricketMatches, footballMatches, badmintonMatches] = await Promise.all(
    [
      CricketMatch.find({})
        .select(
          "team1 team2 date venue status score currentInnings currentOver Highlight"
        )
        .populate("team1 team2", "name photo _id")
        .sort({ date: 1 }),
      FootballMatch.find({})
        .select("team1 team2 date venue status score Highlight")
        .populate("team1 team2", "name photo _id")
        .sort({ date: 1 }),
      BadmintonMatch.find({})
        .select("team1 team2 date venue status score Highlight")
        .populate("team1 team2", "name photo _id")
        .sort({ date: 1 }),
    ]
  );

  const formatMatches = {
    cricket: {
      upcoming: [],
      due: [],
      live: [],
      completed: [],
    },
    football: {
      upcoming: [],
      due: [],
      live: [],
      completed: [],
    },
    badminton: {
      upcoming: [],
      due: [],
      live: [],
      completed: [],
    },
  };

  const processMatches = (matches, sport) => {
    for (const match of matches) {
      const baseData = {
        _id: match._id,
        date: match.date,
        venue: match.venue,
        team1: {
          _id: match.team1._id,
          name: match.team1.name,
          photo: match.team1.photo,
        },
        team2: {
          _id: match.team2._id,
          name: match.team2.name,
          photo: match.team2.photo,
        },
        score: match.score || { team1: 0, team2: 0 },
      };

      if (match.status === "upcoming") {
        if (new Date(match.date) < now) {
          formatMatches[sport].due.push({ ...baseData, status: "due" });
        } else {
          formatMatches[sport].upcoming.push({
            ...baseData,
            status: "upcoming",
          });
        }
      } else if (match.status === "live") {
        formatMatches[sport].live.push({
          ...baseData,
          status: "live",
          currentInnings: match.currentInnings,
          currentOver: match.currentOver,
        });
      } else if (match.status === "completed") {
        formatMatches[sport].completed.push({
          ...baseData,
          status: "completed",
          highlight: match.Highlight || [],
        });
      }
    }
  };

  processMatches(cricketMatches, "cricket");
  processMatches(footballMatches, "football");
  processMatches(badmintonMatches, "badminton");

  res.status(200).json({
    status: "success",
    data: {
      matches: formatMatches,
      counts: {
        cricket: {
          upcoming: formatMatches.cricket.upcoming.length,
          due: formatMatches.cricket.due.length,
          live: formatMatches.cricket.live.length,
          completed: formatMatches.cricket.completed.length,
        },
        football: {
          upcoming: formatMatches.football.upcoming.length,
          due: formatMatches.football.due.length,
          live: formatMatches.football.live.length,
          completed: formatMatches.football.completed.length,
        },
        badminton: {
          upcoming: formatMatches.badminton.upcoming.length,
          due: formatMatches.badminton.due.length,
          live: formatMatches.badminton.live.length,
          completed: formatMatches.badminton.completed.length,
        },
      },
    },
  });
});


exports.getmatchById = catchAsync(async (req, res, next) => {
  const { id, sport } = req.params;

  let match;
  let MatchModel;

  // Determine which model to use based on sport
  switch (sport.toLowerCase()) {
    case "cricket":
      MatchModel = CricketMatch;
      match = await CricketMatch.findById(id)
        .populate("team1 team2", "name photo _id")
        .populate("playersStats.playerId", "name photo category _id team")
        .select(
          "team1 team2 date venue status score currentInnings currentOver playersStats tossWinner tossChoice overs highlight"
        );
      break;
    case "football":
      MatchModel = FootballMatch;
      match = await FootballMatch.findById(id)
        .populate("team1 team2", "name photo _id")
        .populate("playersStats.player", "name photo category _id team")
        .select(
          "team1 team2 date venue status score playersStats halftime highlight"
        );
      break;
    case "badminton":
      MatchModel = BadmintonMatch;
      match = await BadmintonMatch.findById(id)
        .populate("team1 team2", "name photo _id")
        .populate("playersStats.player", "name photo category _id team")
        .select(
          "team1 team2 date venue status score playersStats sets highlight"
        );
      break;
    default:
      return next(new AppError("Invalid sport type", 400));
  }

  if (!match) {
    return next(new AppError("No match found with that ID", 404));
  }

  // Format match data based on sport type
  const formattedMatch = {
    _id: match._id,
    date: match.date,
    venue: match.venue,
    status: match.status,
    team1: {
      _id: match.team1._id,
      name: match.team1.name,
      photo: match.team1.photo,
    },
    team2: {
      _id: match.team2._id,
      name: match.team2.name,
      photo: match.team2.photo,
    },
    score: match.score,
    highlight: match.highlight || [],
    sportSpecific: {},
  };

  // Add sport-specific data
  switch (sport.toLowerCase()) {
    case "cricket":
      formattedMatch.sportSpecific = {
        currentInnings: match.currentInnings,
        currentOver: match.currentOver,
        tossWinner: match.tossWinner,
        tossChoice: match.tossChoice,
        overs: match.overs,
        playerStats: match.playersStats
          .map((player) => ({
            player: {
              _id: player.playerId._id,
              name: player.playerId.name,
              photo: player.playerId.photo,
              category: player.playerId.category,
              teamId: player.playerId.team,
            },
            // Combined batting and bowling stats
            stats: {
              runs: player.runs || 0,
              ballsFaced: player.ballsFaced || 0,
              fours: player.fours || 0,
              sixes: player.sixes || 0,
              strikeRate: player.strikeRate || 0,
              out: player.outType || false,
              overs:
                `${Math.floor(player.ballsBowled / 6)}.${
                  player.ballsBowled % 6
                }` || "0.0",
              wickets: player.wickets || 0,
              runsConceded: player.runsConceded || 0,
              economy: player.economy || 0,
            },
          }))
          // Sort players by runs (descending) then wickets (descending)
          .sort((a, b) => {
            if (b.stats.runs !== a.stats.runs) {
              return b.stats.runs - a.stats.runs;
            }
            return b.stats.wickets - a.stats.wickets;
          }),
      };
      break;
    case "football":
      formattedMatch.sportSpecific = {
        halftime: match.halftime,
        playerStats: match.playersStats.map((player) => ({
          player: {
            _id: player.player._id,
            name: player.player.name,
            photo: player.player.photo,
            category: player.player.category,
            teamId: player.player.team,
          },
          goals: player.goals,
          assists: player.assists,
          tackles: player.tackles,
          fouls: player.fouls,
          yellowCards: player.yellowcards,
          redCard: player.redcards,
          saves: player.saves,
          shots: player.shots,
          penalty: player.penalty,
        })),
      };
      break;
    case "badminton":
      formattedMatch.sportSpecific = {
        playerStats: match.playersStats.map((player) => ({
          player: {
            _id: player.player?._id,
            name: player.player?.name || "Unknown",
            photo: player.player?.photo || "No photo available",
            category: player.player?.category,
            teamId: player.player?.team,
          },
          pointsWon: player.pointsWon || 0,
          smashes: player.smashes || 0,
          aces: player.aces || 0,
        })),
      };
      break;
  }

  res.status(200).json({
    status: "success",
    data: {
      match: formattedMatch,
    },
  });
});

exports.home = catchAsync(async (req, res, next) => {
  // Get upcoming matches from all sports
  const [cricketMatches, footballMatches, badmintonMatches] = await Promise.all(
    [
      CricketMatch.find({ status: "upcoming" })
        .select("team1 team2 date venue sport")
        .populate("team1 team2", "name")
        .sort({ date: 1 })
        .limit(2),
      FootballMatch.find({ status: "upcoming" })
        .select("team1 team2 date venue sport")
        .populate("team1 team2", "name")
        .sort({ date: 1 })
        .limit(2),
      BadmintonMatch.find({ status: "upcoming" })
        .select("team1 team2 date venue sport")
        .populate("team1 team2", "name")
        .sort({ date: 1 })
        .limit(2),
    ]
  );

  // Get top players from all sports
  const topPlayers = await Player.find({})
    .select("_id name photo age sport category")
    .sort(
      "-stats.cricket.runs -stats.football.goals -stats.badminton.matchesWon"
    )
    .limit(5);

  // Get tournament counts
  const [cricketCount, footballCount, badmintonCount] = await Promise.all([
    CricketMatch.countDocuments(),
    FootballMatch.countDocuments(),
    BadmintonMatch.countDocuments(),
  ]);

  // Format response
  const response = {
    upcomingMatches: [
      ...cricketMatches,
      ...footballMatches,
      ...badmintonMatches,
    ]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 2)
      .map((match) => ({
        _id: match._id,
        team1Name: match.team1.name,
        team2Name: match.team2.name,
        sport: match.sport || match.constructor.modelName.replace("Match", ""),
        date: match.date,
        venue: match.venue,
      })),
    topPlayers: topPlayers.map((player) => ({
      _id: player._id,
      name: player.name,
      photo: player.photo,
      age: player.age,
      sport: player.sport,
      category: player.category,
    })),
    tournaments: {
      total:
        Math.ceil((cricketCount + footballCount + badmintonCount) / 10) * 10 +
        "+",
    },
    sportPresent: {
      cricket: cricketCount > 0,
      football: footballCount > 0,
      badminton: badmintonCount > 0,
    },
  };

  res.status(200).json({
    status: "success",
    data: response,
  });
});

exports.admin = catchAsync(async (req, res, next) => {
  // Get total matches across all sports
  const [cricketMatches, footballMatches, badmintonMatches] = await Promise.all(
    [
      CricketMatch.countDocuments(),
      FootballMatch.countDocuments(),
      BadmintonMatch.countDocuments(),
    ]
  );

  // Get total active/live matches
  const [activeCricket, activeFootball, activeBadminton] = await Promise.all([
    CricketMatch.countDocuments({ status: "live" }),
    FootballMatch.countDocuments({ status: "live" }),
    BadmintonMatch.countDocuments({ status: "live" }),
  ]);

  // Get total users/players
  const totalPlayers = await Player.countDocuments();

  // Get total teams
  const totalTeams = await Team.countDocuments();

  // Format response
  const response = {
    matches: {
      total: cricketMatches + footballMatches + badmintonMatches,
      active: activeCricket + activeFootball + activeBadminton,
      sportWise: {
        cricket: cricketMatches,
        football: footballMatches,
        badminton: badmintonMatches,
      },
      activeByType: {
        cricket: activeCricket,
        football: activeFootball,
        badminton: activeBadminton,
      },
    },
    users: {
      total: totalPlayers,
    },
    teams: {
      total: totalTeams,
    },
  };

  res.status(200).json({
    status: "success",
    data: response,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email } = req.query;
  if (!email) {
    return next(new AppError("Tell email", 404));
  }
  const otp = 123456;
  res.status(200).json({
    status: "success",
    otp: otp,
  });
});

exports.loginAdd = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide email", 400));
  }

  // Check if user already exists
  let existingUser = await user.findOne({ email });

  if (existingUser) {
    // If user exists, just create new token
    const token = signToken(existingUser._id);
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token: token,
      type: existingUser.type,
      isNewUser: false,
    });
  }

  // If user doesn't exist, create new user
  const newUser = await user.create({ email });
  const token = signToken(newUser._id);

  res.status(201).json({
    status: "success",
    message: "Account created successfully",
    token,
    isNewUser: true,
  });
});

exports.compareStats = catchAsync(async (req, res, next) => {
  const { player1, player2, sport } = req.query;

  // Get both players' data
  const [player1Data, player2Data] = await Promise.all([
    Player.findById(player1).populate("team", "name photo"),
    Player.findById(player2).populate("team", "name photo"),
  ]);

  if (!player1Data || !player2Data) {
    return next(new AppError("One or both players not found", 404));
  }

  if (
    player1Data.sport !== player2Data.sport ||
    player1Data.sport.toLowerCase() !== sport.toLowerCase()
  ) {
    return next(new AppError("Players must be from the same sport", 400));
  }

  let visaldata = {};

  // Helper function to get career stats from matches
  const getCareerStats = async (playerId, sport) => {
    let matches,
      wins = 0;

    switch (sport.toLowerCase()) {
      case "cricket":
        matches = await CricketMatch.find({
          "playersStats.playerId": playerId,
          status: "completed",
        }).populate({
          path: "playersStats.playerTeam",
          select: "name", // Get only the team name
        });

        wins = matches.filter((match) => {
          const playerStats = match.playersStats.find((p) =>
            p.playerId.equals(playerId)
          );
          return playerStats && match.winner === playerStats.playerTeam.name; // Compare names
        }).length;
        break;

      case "football":
        matches = await FootballMatch.find({
          "playersStats.player": playerId,
          status: "completed",
        }).populate({
          path: "playersStats.playerTeam",
          select: "name", // Get only the team name
        });
        wins = matches.filter((match) => {
          const playerStats = match.playersStats.find((p) =>
            p.player.equals(playerId)
          );
          return match.winner === playerStats.playerTeam.name; // Compare as strings
        }).length;
        break;

      case "badminton":
        matches = await BadmintonMatch.find({
          $or: [{ player1: playerId }, { player2: playerId }],
          status: "completed",
        }).populate({
          path: "playersStats.playerTeam",
          select: "name", // Get only the team name
        });
       wins = matches.filter((match) => {
         const playerStats = match.playersStats.find((p) =>
           p.player.equals(playerId)
         );
         return match.winner === playerStats.playerTeam.name; // Compare as strings
       }).length;
        break;
    }

    return {
      matchesPlayed: matches.length,
      wins,
      losses: matches.length - wins,
      winPercentage: ((wins / Math.max(1, matches.length)) * 100).toFixed(1),
    };
  };

  // Get career stats for both players
  const [player1CareerStats, player2CareerStats] = await Promise.all([
    getCareerStats(player1Data._id, sport),
    getCareerStats(player2Data._id, sport),
  ]);

  let comparisonData = {
    player1: {
      basicInfo: {
        _id: player1Data._id,
        name: player1Data.name,
        photo: player1Data.photo,
        age: player1Data.age,
        team:player1Data.team ? {
          name: player1Data.team.name || "No Team",
          logo: player1Data.team.photo || "No Team",
        } : {
          name: "No Team",
          logo: "No Team",
        }
      },
      careerStats: player1CareerStats,
    },
    player2: {
      basicInfo: {
        _id: player2Data._id,
        name: player2Data.name,
        photo: player2Data.photo,
        age: player2Data.age,
        team: player2Data.team ? {
          name: player2Data.team.name || "No Team",
          photo: player2Data.team.photo || "No Team",
        } : {
          name: "No Team",
          logo: "No Team",
        },
      },
      careerStats: player2CareerStats,
    },
    comparison: {},
  };

  // Add sport-specific comparison stats
  switch (sport.toLowerCase()) {
    case "cricket":
      // Get all completed matches for both players
      const [player1Matches, player2Matches] = await Promise.all([
        CricketMatch.find({
          "playersStats.playerId": player1Data._id,
          status: "completed",
        }),
        CricketMatch.find({
          "playersStats.playerId": player2Data._id,
          status: "completed",
        }),
      ]);

      const player1visaldata = calculatePlayerPerformance(player1Data._id, player1Matches, "Batsman");
      const player2visaldata = calculatePlayerPerformance(
          player2Data._id,
          player2Matches,
          "Batsman"
        );

      visaldata = {
        labels : player1visaldata.radarData.labels,
        player1Data : player1visaldata.radarData.data,
        player2Data : player2visaldata.radarData.data,
      }

      const getPlayerStats = (matches, playerId) => {
        const stats = {
          totalBalls: 0,
          totalRuns: 0,
          totalWickets: 0,
          totalFours: 0,
          totalSixes: 0,
          totalBallsBowled: 0,
          totalRunsConceded: 0,
          totalWhiteBalls: 0,
          dismissals: {
            bowled: 0,
            caught: 0,
            runOut: 0,
            lbw: 0,
            stumped: 0,
            hitWicket: 0,
          },
        };

        matches.forEach((match) => {
          const playerStats = match.playersStats.find((p) =>
            p.playerId.equals(playerId)
          );
          if (playerStats) {
            stats.totalBalls += playerStats.ballsFaced;
            stats.totalRuns += playerStats.runs;
            stats.totalFours += playerStats.fours;
            stats.totalSixes += playerStats.sixes;
            stats.totalBallsBowled += playerStats.ballsBowled;
            stats.totalRunsConceded += playerStats.runsConceded;
            stats.totalWickets += playerStats.wickets;
            stats.totalWhiteBalls += playerStats.ballwhitethrough;

            if (playerStats.isOut && playerStats.outType) {
              stats.dismissals[playerStats.outType]++;
            }
          }
        });

        return stats;
      };

      const player1Stats = getPlayerStats(player1Matches, player1Data._id);
      const player2Stats = getPlayerStats(player2Matches, player2Data._id);

      comparisonData.comparison = {
        batting: {
          overall: {
            matches: {
              player1: player1Matches.length,
              player2: player2Matches.length,
            },
            runs: {
              player1: player1Stats.totalRuns,
              player2: player2Stats.totalRuns,
            },
            average: {
              player1: (
                player1Stats.totalRuns / Math.max(1, player1Matches.length)
              ).toFixed(2),
              player2: (
                player2Stats.totalRuns / Math.max(1, player2Matches.length)
              ).toFixed(2),
            },
            strikeRate: {
              player1: (
                (player1Stats.totalRuns /
                  Math.max(1, player1Stats.totalBalls)) *
                100
              ).toFixed(2),
              player2: (
                (player2Stats.totalRuns /
                  Math.max(1, player2Stats.totalBalls)) *
                100
              ).toFixed(2),
            },
          },
          boundaries: {
            fours: {
              player1: player1Stats.totalFours,
              player2: player2Stats.totalFours,
            },
            sixes: {
              player1: player1Stats.totalSixes,
              player2: player2Stats.totalSixes,
            },
            boundaryPercentage: {
              player1: (
                ((player1Stats.totalFours * 4 + player1Stats.totalSixes * 6) /
                  Math.max(1, player1Stats.totalRuns)) *
                100
              ).toFixed(1),
              player2: (
                ((player2Stats.totalFours * 4 + player2Stats.totalSixes * 6) /
                  Math.max(1, player2Stats.totalRuns)) *
                100
              ).toFixed(1),
            },
          },
          dismissals: {
            bowled: {
              player1: player1Stats.dismissals.bowled,
              player2: player2Stats.dismissals.bowled,
            },
            caught: {
              player1: player1Stats.dismissals.caught,
              player2: player2Stats.dismissals.caught,
            },
            lbw: {
              player1: player1Stats.dismissals.lbw,
              player2: player2Stats.dismissals.lbw,
            },
            runOut: {
              player1: player1Stats.dismissals.runOut,
              player2: player2Stats.dismissals.runOut,
            },
            stumped: {
              player1: player1Stats.dismissals.stumped,
              player2: player2Stats.dismissals.stumped,
            },
            hitWicket: {
              player1: player1Stats.dismissals.hitWicket,
              player2: player2Stats.dismissals.hitWicket,
            },
          },
        },
        bowling: {
          overall: {
            wickets: {
              player1: player1Stats.totalWickets,
              player2: player2Stats.totalWickets,
            },
            economy: {
              player1: (
                (player1Stats.totalRunsConceded /
                  Math.max(1, player1Stats.totalBallsBowled)) *
                6
              ).toFixed(2),
              player2: (
                (player2Stats.totalRunsConceded /
                  Math.max(1, player2Stats.totalBallsBowled)) *
                6
              ).toFixed(2),
            },
            average: {
              player1: (
                player1Stats.totalRunsConceded /
                Math.max(1, player1Stats.totalWickets)
              ).toFixed(2),
              player2: (
                player2Stats.totalRunsConceded /
                Math.max(1, player2Stats.totalWickets)
              ).toFixed(2),
            },
          },
          extras: {
            whiteBalls: {
              player1: player1Stats.totalWhiteBalls,
              player2: player2Stats.totalWhiteBalls,
            },
          },
        },
        form: {
          lastFiveMatches: {
            player1: player1Matches.slice(0, 5).map((match) => {
              const stats = match.playersStats.find((p) =>
                p.playerId.equals(player1Data._id)
              );
              return {
                runs: stats?.runs || 0,
                wickets: stats?.wickets || 0,
                date: match.date,
              };
            }),
            player2: player2Matches.slice(0, 5).map((match) => {
              const stats = match.playersStats.find((p) =>
                p.playerId.equals(player2Data._id)
              );
              return {
                runs: stats?.runs || 0,
                wickets: stats?.wickets || 0,
                date: match.date,
              };
            }),
          },
        },
      };
      break;

    case "football":
      const [Fplayer1Matches, Fplayer2Matches] = await Promise.all([
        FootballMatch.find({
          "playersStats.player": player1Data._id,
          status: "completed",
        }),
        FootballMatch.find({
          "playersStats.player": player2Data._id,
          status: "completed",
        }),
      ]);

       const Fplayer1visaldata = calculateFootballPerformance(
         player1Data._id,
         Fplayer1Matches
       );
       const Fplayer2visaldata = calculateFootballPerformance(
         player2Data._id,
         Fplayer2Matches
       );

      visaldata = {
        labels: Fplayer1visaldata.radarData.labels,
        player1Data: Fplayer1visaldata.radarData.data,
        player2Data: Fplayer2visaldata.radarData.data,
      };
      const player1goals = await calculateTotalGoals(player1Data._id);
      const player2goals = await calculateTotalGoals(player2Data._id);
      comparisonData.comparison = {
        attack: {
          goals: {
            player1: player1goals,
            player2: player2goals,
          },
          assists: {
            player1: await calculateTotalassits(player1Data._id),
            player2: await calculateTotalassits(player2Data._id),
          },
          shotAccuracy: {
            player1: (
              (player1goals / (await calculateTotalshot(player1Data._id))) *
              100
            ).toFixed(1),
            player2: (
              (player2goals / (await calculateTotalshot(player2Data._id))) *
              100
            ).toFixed(1),
          },
        },
        defense: {
          tackles: {
            player1: await calculateTotaltackles(player1Data._id),
            player2: await calculateTotaltackles(player2Data._id),
          },
        },
        discipline: {
          yellowCards: {
            player1: await calculateTotalYellowCard(player1Data._id),
            player2: await calculateTotalYellowCard(player2Data._id),
          },
          redCards: {
            player1: await calculateTotalRedCard(player1Data._id),
            player2: await calculateTotalRedCard(player2Data._id),
        },

      }
      };
      break;

    case "badminton":
       const [Bplayer1Matches, Bplayer2Matches] = await Promise.all([
         BadmintonMatch.find({
           "playersStats.player": player1Data._id,
           status: "completed",
         }),
         BadmintonMatch.find({
           "playersStats.player": player2Data._id,
           status: "completed",
         }),
       ]);

       const Bplayer1visaldata = calculateBadmintonPerformance(
         player1Data._id,
         Bplayer1Matches
       );
       const Bplayer2visaldata = calculateBadmintonPerformance(
         player2Data._id,
         Bplayer2Matches
       );

       visaldata = {
         labels: Bplayer1visaldata.radarData.labels,
         player1Data: Bplayer1visaldata.radarData.data,
         player2Data: Bplayer2visaldata.radarData.data,
       };
      comparisonData.comparison = {
        overall: {
          matchesWon: {
            player1: player1Data.stats.badminton.matchesWon,
            player2: player2Data.stats.badminton.matchesWon,
          },
          winRate: {
            player1: (
              (player1Data.stats.badminton.matchesWon /
                player1Data.matchesPlayed) *
              100
            ).toFixed(1),
            player2: (
              (player2Data.stats.badminton.matchesWon /
                player2Data.matchesPlayed) *
              100
            ).toFixed(1),
          },
        },
        technical: {
          smashes: {
            player1: player1Data.stats.badminton.smashCount,
            player2: player2Data.stats.badminton.smashCount,
          },
          pointsScored: {
            player1: player1Data.stats.badminton.pointsScored,
            player2: player2Data.stats.badminton.pointsScored,
          },
        },
      };
      break;

    default:
      return next(new AppError("Invalid sport type", 400));
  }

  // Add radar chart data
  comparisonData.visualData = visaldata;

  res.status(200).json({
    status: "success",
    data: comparisonData,
  });
});

exports.getAllPlayersSports = catchAsync(async (req, res, next) => {
  const { sports } = req.query;

  // Build dynamic query: only players with a team, and optionally by sport
  const query = {
    team: { $ne: null }, // Only include players who have a team
  };

  if (sports) {
    query.sport = sports; // Filter by sport if provided
  }

  // Fetch players with selected fields
  const players = await Player.find(query).select(
    "_id name photo sport teamName category"
  );

  res.status(200).json({
    status: "Success",
    message: `Fetched all players${sports ? ` for sport ${sports}` : ""}`,
    data: players,
  });
});



// Helper function to calculate performance metrics
const calculatePerformanceMetrics = (player, stats) => {
  switch (player.sport) {
    case "Cricket":
      return [
        ((stats.cricket?.runs || 0) / (player.matchesPlayed * 30)) * 100,
        ((stats.cricket?.wickets || 0) / (player.matchesPlayed * 2)) * 100,
        ((stats.cricket?.catches || 0) / player.matchesPlayed) * 100,
        (player.wins / Math.max(1, player.matchesPlayed)) * 100,
        Math.min(100, ((stats.cricket?.runs || 0) / 1000) * 100),
      ].map((val) => Math.min(100, Math.max(0, val)));

    case "Football":
      return [
        ((stats.football?.goals || 0) / (player.matchesPlayed * 1)) * 100,
        ((stats.football?.tackles || 0) / (player.matchesPlayed * 3)) * 100,
        stats.football?.passAccuracy || 0,
        ((stats.football?.shots || 0) / (player.matchesPlayed * 3)) * 100,
        ((stats.football?.assists || 0) / (player.matchesPlayed * 1)) * 100,
      ].map((val) => Math.min(100, Math.max(0, val)));

    case "Badminton":
      return [
        ((stats.badminton?.aces || 0) / (player.matchesPlayed * 2)) * 100, // Serves
        ((stats.badminton?.smashCount || 0) / (player.matchesPlayed * 5)) * 100, // Smashes
        ((stats.badminton?.pointsScored || 0) / (player.matchesPlayed * 21)) *
          100, // Returns based on points
        ((stats.badminton?.netPlays || 0) / (player.matchesPlayed * 5)) * 100, // Net Play
        (player.wins / Math.max(1, player.matchesPlayed)) * 100, // Movement approximated by win rate
      ].map((val) => Math.min(100, Math.max(0, val)));

    default:
      return [0, 0, 0, 0, 0];
  }
};

// Helper function to calculate activity intensity
const calculateIntensity = (stats) => {
  // Implementation depends on sport
  return 75; // Placeholder value
};
const calculatePlayerPerformance = (playerId, cricketMatches, category) => {
  // Initialize variables for performance metrics
  let totalRuns = 0;
  let totalBallsFaced = 0;
  let totalBoundaries = 0;
  let totalOuts = 0;
  let totalMatchesPlayed = 0;
  let totalWickets = 0;
  let totalRunsConceded = 0;
  let totalBallsBowled = 0;
  let totalWideBalls = 0;

  // Loop through the matches
  cricketMatches.forEach((match) => {
    const playerStats = match.playersStats.find((p) =>
      p.playerId.equals(playerId)
    );
    if (playerStats) {
      totalMatchesPlayed++;

      // Batting stats (only if the category is 'Batter')
      if (category === "Batsman") {
        const runs = playerStats.runs || 0;
        const ballsFaced = playerStats.ballsFaced || 0;
        const boundaries = playerStats.fours + playerStats.sixes || 0;
        const outs = playerStats.isOut ? 1 : 0;

        totalRuns += runs;
        totalBallsFaced += ballsFaced;
        totalBoundaries += boundaries;
        totalOuts += outs;
      }

      // Bowling stats (only if the category is 'Bowler')
      if (category === "Bowler") {
        const wickets = playerStats.wickets || 0;
        const ballsBowled = playerStats.ballsBowled || 0;
        const runsConceded = playerStats.runsConceded || 0;
        const wideBalls = playerStats.wideBalls || 0;

        totalWickets += wickets;
        totalBallsBowled += ballsBowled;
        totalRunsConceded += runsConceded;
        totalWideBalls += wideBalls;
      }
    }
  });

  // Batting Calculations (Normalized to 100 scale)
  const strikeRate =
    totalBallsFaced > 0
      ? Math.min(((totalRuns / totalBallsFaced) * 100).toFixed(2), 100)
      : 0;
  const boundariesRate =
    totalRuns > 0
      ? Math.min(((totalBoundaries / totalRuns) * 100).toFixed(2), 100)
      : 0;
  const outRate =
    totalMatchesPlayed > 0
      ? Math.min(((totalOuts / totalMatchesPlayed) * 100).toFixed(2), 100)
      : 0;
  const runRate =
    totalBallsFaced > 0
      ? Math.min(((totalRuns / totalBallsFaced) * 6).toFixed(2), 100)
      : 0;
  const averageRunsPerMatch =
    totalMatchesPlayed > 0
      ? Math.min((totalRuns / totalMatchesPlayed).toFixed(2), 100)
      : 0;

  // Bowling Calculations (Normalized to 100 scale)
  const wicketRate =
    totalMatchesPlayed > 0
      ? Math.min(((totalWickets / totalMatchesPlayed) * 100).toFixed(2), 100)
      : 0;
  const runConcededRate =
    totalMatchesPlayed > 0
      ? Math.min((totalRunsConceded / totalMatchesPlayed).toFixed(2), 100)
      : 0;
  const economyRate =
    totalBallsBowled > 0
      ? Math.min((totalRunsConceded / (totalBallsBowled / 6)).toFixed(2), 6)
      : 0;
  const wideBallRate =
    totalBallsBowled > 0
      ? Math.min(((totalWideBalls / totalBallsBowled) * 100).toFixed(2), 100)
      : 0;
  const bowlingStrikeRate =
    totalWickets > 0
      ? Math.min((totalBallsBowled / totalWickets).toFixed(2), 100)
      : 0;

  // Return radar data based on the category
  return {
    radarData: {
      labels:
        category === "Batsman"
          ? [
              "strikeRate",
              "boundariesRate",
              "outRate",
              "runRate",
              "averageRunsPerMatch",
            ]
          : [
              "wicketRate",
              "runConcededRate",
              "economyRate",
              "wideBallRate",
              "bowlingStrikeRate",
            ],
      data:
        category === "Batsman"
          ? [
              strikeRate !== 0 ? strikeRate : 0,
              boundariesRate !== 0 ? boundariesRate : 0,
              outRate !== 0 ? outRate : 0,
              runRate !== 0 ? runRate : 0,
              averageRunsPerMatch !== 0 ? averageRunsPerMatch : 0,
            ]
          : [
              wicketRate !== 0 ? wicketRate : 0,
              runConcededRate !== 0 ? runConcededRate : 0,
              economyRate !== 0 ? economyRate : 0,
              wideBallRate !== 0 ? wideBallRate : 0,
              bowlingStrikeRate !== 0 ? bowlingStrikeRate : 0,
            ],
    },
  };
};

const calculateFootballPerformance = (playerId, footballMatches) => {
  // Initialize stats
  let totalGoals = 0;
  let totalAssists = 0;
  let totalShots = 0;
  let totalTackles = 0;
  let totalPenalties = 0;
  let totalYellowCards = 0;
  let totalRedCards = 0;
  let totalSaves = 0;
  let totalMatchesPlayed = 0;

  // Process each match
  footballMatches.forEach((match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );

    console.log(playerStats, playerId, match._id);
    if (playerStats) {
      totalMatchesPlayed++;
      totalGoals += playerStats.goals || 0;
      totalAssists += playerStats.assists || 0;
      totalShots += playerStats.shots || 0;
      totalTackles += playerStats.tackles || 0;
      totalPenalties += playerStats.penalty || 0;
      totalYellowCards += playerStats.yellowcards || 0;
      totalRedCards += playerStats.redcards || 0;
      totalSaves += playerStats.saves || 0;
    }
  });

  console.log(totalYellowCards, totalRedCards);

  // **🔹 Normalization function (keeps values in range 0-100)**
  const normalize = (value, maxValue) => {
    return maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  };

  // **🔹 Define max limits for normalization**
  const MAX_STATS = {
    goals: 50, // Max goals per season
    assists: 30, // Max assists per season
    shots: 200, // Max shots taken
    tackles: 100, // Max tackles
    penalties: 10, // Max penalties taken
    yellowCards: 10, // Max yellow cards
    redCards: 5, // Max red cards
    saves: 150, // Max saves by a goalkeeper
  };

  // **🔹 Fixed Shot Accuracy Calculation**
  const shotAccuracy =
    totalShots > 0 ? Math.min((totalGoals / totalShots) * 100, 100) : 0;

  // **🔹 Radar Chart Data**
  return {
    radarData: {
      labels: [
        "Goal Contribution", // Goals + Assists
        "Shot Accuracy", // Fixed to stay in 0-100
        "Defensive Actions", // Tackles
        // "Discipline", // Fewer cards = better score
        "Penalty Success", // Penalties Scored
        "Save Efficiency", // Saves
      ],
      data: [
        normalize(
          totalGoals + totalAssists,
          MAX_STATS.goals + MAX_STATS.assists
        ), // Goal Contribution
        shotAccuracy, // FIXED Shot Accuracy
        normalize(totalTackles, MAX_STATS.tackles), // Defensive Performance
        // 100 -
        //   normalize(
        //     totalYellowCards + totalRedCards,
        //     MAX_STATS.yellowCards + MAX_STATS.redCards
        //   ), // Discipline (Lower cards = Higher score)
        normalize(totalPenalties, MAX_STATS.penalties), // Penalty Success
        normalize(totalSaves, MAX_STATS.saves), // Save Efficiency
      ],
    },
  };
};
const calculateBadmintonPerformance = (playerId, badmintonMatches) => {
  let totalPointsWon = 0;
  let totalAces = 0;
  let totalSmashes = 0;
  let totalNetPlays = 0;
  let totalPointsLost = 0;
  let totalMatchesPlayed = 0;

  badmintonMatches.forEach((match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );

    if (playerStats) {
      totalMatchesPlayed++;
      totalPointsWon += playerStats.pointsWon || 0;
      totalAces += playerStats.aces || 0;
      totalSmashes += playerStats.smashes || 0;
      totalNetPlays += playerStats.netPlays || 0;
      totalPointsLost += playerStats.pointsLost || 0;
    }
  });

  // Normalize to 100 scale
  const totalPoints = totalPointsWon + totalPointsLost || 1; // Avoid division by zero

  const pointsWonRate = ((totalPointsWon / totalPoints) * 100).toFixed(2);
  const acesRate = ((totalAces / totalPoints) * 100).toFixed(2);
  const smashesRate = ((totalSmashes / totalPoints) * 100).toFixed(2);
  const netPlaysRate = ((totalNetPlays / totalPoints) * 100).toFixed(2);
  const pointsLostRate = ((totalPointsLost / totalPoints) * 100).toFixed(2);

  return {
    radarData: {
      labels: ["Points Won", "Aces", "Smashes", "Net Plays", "Points Lost"],
      data: [
        Math.min(pointsWonRate, 100),
        Math.min(acesRate, 100),
        Math.min(smashesRate, 100),
        Math.min(netPlaysRate, 100),
        Math.min(pointsLostRate, 100),
      ],
    },
  };
};



const calculateTotalGoals = async (playerId) => {
  // Fetch all completed matches where the player has played
  const matches = await FootballMatch.find({
    "playersStats.player": playerId,
    status: "completed",
  });

  // Sum up the player's goals across all matches
  const totalGoals = matches.reduce((sum, match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );
    return sum + (playerStats?.goals || 0);
  }, 0);

  return totalGoals;
};
const calculateTotalassits = async (playerId) => {
  // Fetch all completed matches where the player has played
  const matches = await FootballMatch.find({
    "playersStats.player": playerId,
    status: "completed",
  });

  // Sum up the player's goals across all matches
  const totalGoals = matches.reduce((sum, match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );
    return sum + (playerStats?.assists || 0);
  }, 0);

  return totalGoals;
};

const calculateTotalshot = async (playerId) => {
  // Fetch all completed matches where the player has played
  const matches = await FootballMatch.find({
    "playersStats.player": playerId,
    status: "completed",
  });

  // Sum up the player's goals across all matches
  const totalGoals = matches.reduce((sum, match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );
    return sum + (playerStats?.shots || 0);
  }, 0);

  return totalGoals;
};

const calculateTotaltackles = async (playerId) => {
  // Fetch all completed matches where the player has played
  const matches = await FootballMatch.find({
    "playersStats.player": playerId,
    status: "completed",
  });

  // Sum up the player's goals across all matches
  const totalGoals = matches.reduce((sum, match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );
    return sum + (playerStats?.tackles || 0);
  }, 0);

  return totalGoals;
};
const calculateTotalYellowCard = async (playerId) => {
  // Fetch all completed matches where the player has played
  const matches = await FootballMatch.find({
    "playersStats.player": playerId,
    status: "completed",
  });

  // Sum up the player's goals across all matches
  const totalGoals = matches.reduce((sum, match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );
    return sum + (playerStats?.yellowcards || 0);
  }, 0);

  return totalGoals;
};
const calculateTotalRedCard = async (playerId) => {
  // Fetch all completed matches where the player has played
  const matches = await FootballMatch.find({
    "playersStats.player": playerId,
    status: "completed",
  });

  // Sum up the player's goals across all matches
  const totalGoals = matches.reduce((sum, match) => {
    const playerStats = match.playersStats.find((p) =>
      p.player.equals(playerId)
    );
    return sum + (playerStats?.redcards || 0);
  }, 0);

  return totalGoals;
};

