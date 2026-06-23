import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const leaderboard: any[] = await prisma.$queryRaw`
      SELECT
        u.id,
        u.username,
        COALESCE(p_summary."totalPoints", 0)::int as "totalPoints",
        COALESCE(p_summary."correctResults", 0)::int as "correctResults",
        COALESCE(p_summary."exactScores", 0)::int as "exactScores",
        COALESCE(pred_summary."totalPredictions", 0)::int as "totalPredictions",
        CASE
          WHEN COALESCE(pred_summary."resolvedPredictions", 0) > 0
          THEN ROUND((COALESCE(p_summary."correctResults", 0)::float / COALESCE(pred_summary."resolvedPredictions", 0)::float) * 100)::int
          ELSE 0
        END as "accuracy"
      FROM "User" u
      LEFT JOIN (
        SELECT
          "userId",
          SUM("totalPoints") as "totalPoints",
          SUM(CASE WHEN "pointsResult" > 0 THEN 1 ELSE 0 END) as "correctResults",
          SUM(CASE WHEN "pointsExactScore" > 0 THEN 1 ELSE 0 END) as "exactScores"
        FROM "Point"
        GROUP BY "userId"
      ) p_summary ON u.id = p_summary."userId"
      LEFT JOIN (
        SELECT
          pred."userId",
          COUNT(pred.id) as "totalPredictions",
          COUNT(CASE WHEN m.status = 'FINISHED' AND pred.skipped = false THEN 1 END) as "resolvedPredictions"
        FROM "Prediction" pred
        LEFT JOIN "Match" m ON pred."matchId" = m.id
        GROUP BY pred."userId"
      ) pred_summary ON u.id = pred_summary."userId"
      ORDER BY "totalPoints" DESC, "exactScores" DESC, "correctResults" DESC, "accuracy" DESC;
    `;

    // Add rank
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    console.error('[Leaderboard Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
