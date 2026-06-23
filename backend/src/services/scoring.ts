import prisma from '../prisma';
import { MatchResult } from '@prisma/client';

export const calculatePointsForMatch = async (matchId: string) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { predictions: true },
  });

  if (!match || match.status !== 'FINISHED' || match.team1Goals === null || match.team2Goals === null) {
    throw new Error('Match is not finished or goals are missing.');
  }

  let actualResult: MatchResult;
  if (match.team1Goals > match.team2Goals) actualResult = 'TEAM1';
  else if (match.team1Goals < match.team2Goals) actualResult = 'TEAM2';
  else actualResult = 'DRAW';

  const pointUpdates = match.predictions.map(async (prediction) => {
    let pointsResult = 0;
    let pointsExactScore = 0;
    let pointsTeam1Goals = 0;
    let pointsTeam2Goals = 0;

    // Correct result (3 points)
    if (prediction.result === actualResult) {
      pointsResult = 3;
    }


    if (prediction.team1Goals !== null && prediction.team2Goals !== null) {
      if (prediction.team1Goals === match.team1Goals && prediction.team2Goals === match.team2Goals) {
        pointsExactScore = 5;
      }
      if (prediction.team1Goals === match.team1Goals) {
        pointsTeam1Goals = 1;
      }
      if (prediction.team2Goals === match.team2Goals) {
        pointsTeam2Goals = 1;
      }
    }
    
    const totalPoints = pointsResult + pointsExactScore + pointsTeam1Goals + pointsTeam2Goals;

    await prisma.point.upsert({
      where: { predictionId: prediction.id },
      update: {
        pointsResult,
        pointsExactScore,
        pointsTeam1Goals,
        pointsTeam2Goals,
        totalPoints,
      },
      create: {
        userId: prediction.userId,
        matchId: match.id,
        predictionId: prediction.id,
        pointsResult,
        pointsExactScore,
        pointsTeam1Goals,
        pointsTeam2Goals,
        totalPoints,
      },
    });
  });

  await Promise.all(pointUpdates);
  console.log(`[Scoring] Points calculated for match ${matchId}`);
};
