import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

// In-memory cache for leaderboard to prevent DB DoS
let leaderboardCache: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

router.get('/', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (leaderboardCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      return res.json(leaderboardCache);
    }

    // Leaderboard: rank by KickCoin wallet balance (highest first)
    const leaderboard: any[] = await prisma.$queryRaw`
      SELECT
        u.id,
        u.username,
        COALESCE(w.balance, 0)::int                                        AS "kickCoins",
        COALESCE(w.loan, 0)::int                                           AS "loan",
        COALESCE(bet_summary."totalBets", 0)::int                          AS "totalBets",
        COALESCE(bet_summary."settledBets", 0)::int                        AS "settledBets",
        COALESCE(bet_summary."wonBets", 0)::int                            AS "wonBets",
        COALESCE(bet_summary."lostBets", 0)::int                           AS "lostBets",
        CASE
          WHEN COALESCE(bet_summary."settledBets", 0) > 0
          THEN ROUND(
            (COALESCE(bet_summary."wonBets", 0)::float /
             COALESCE(bet_summary."settledBets", 0)::float) * 100
          )::int
          ELSE 0
        END AS "accuracy"
      FROM "User" u
      LEFT JOIN "Wallet" w ON w."userId" = u.id
      LEFT JOIN (
        SELECT
          b."userId",
          COUNT(*)::int                                             AS "totalBets",
          SUM(CASE WHEN b.status = 'WON'  THEN 1 ELSE 0 END)::int AS "wonBets",
          SUM(CASE WHEN b.status = 'LOST' THEN 1 ELSE 0 END)::int AS "lostBets",
          SUM(CASE WHEN b.status IN ('WON','LOST') THEN 1 ELSE 0 END)::int AS "settledBets"
        FROM "Bet" b
        WHERE b.status != 'VOID'
        GROUP BY b."userId"
      ) bet_summary ON u.id = bet_summary."userId"
      WHERE u.role::text != 'ADMIN' 
        AND u."isActive" = true
        AND COALESCE(bet_summary."totalBets", 0) > 0
      ORDER BY (COALESCE(w.balance, 0) - COALESCE(w.loan, 0)) DESC, "wonBets" DESC, "accuracy" DESC;
    `;

    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    leaderboardCache = rankedLeaderboard;
    lastCacheTime = Date.now();

    res.json(rankedLeaderboard);
  } catch (error) {
    console.error('[Leaderboard Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
