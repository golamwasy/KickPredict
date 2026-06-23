import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        points: true,
        predictions: true,
      },
    });

    const leaderboard = users.map(user => {
      const totalPoints = user.points.reduce((acc, p) => acc + p.totalPoints, 0);
      const correctResults = user.points.filter(p => p.pointsResult > 0).length;
      const exactScores = user.points.filter(p => p.pointsExactScore > 0).length;
      const totalPredictions = user.predictions.length;
      
      return {
        id: user.id,
        username: user.username,
        totalPoints,
        correctResults,
        exactScores,
        totalPredictions,
        accuracy: totalPredictions > 0 ? Math.round((correctResults / totalPredictions) * 100) : 0,
      };
    }).sort((a, b) => {
      // 1. Highest Total Points
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      // 2. Highest Exact Scores predicted
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      // 3. Highest Correct Results predicted
      if (b.correctResults !== a.correctResults) return b.correctResults - a.correctResults;
      // 4. Highest overall Accuracy %
      return b.accuracy - a.accuracy;
    });

    // Add rank
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
