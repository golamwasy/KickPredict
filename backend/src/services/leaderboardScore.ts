import prisma from '../prisma';

export const MAX_ROI = 1.5;
export const MIN_ROI = -1.0;
export const CONFIDENCE_BASE = 15;
export const VOLUME_DIVISOR = 1000;
export const ROI_WEIGHT = 0.5;
export const WIN_RATE_WEIGHT = 0.5;
export const SCORE_BASE = 100;

export interface LeaderboardStats {
  betsPlaced: number;
  wins: number;
  totalStaked: number;
  totalWon: number;
}

/**
 * Pure function to calculate leaderboard score based on user stats.
 */
export const calculateLeaderboardScore = ({
  betsPlaced,
  wins,
  totalStaked,
  totalWon,
}: LeaderboardStats): number => {
  if (betsPlaced === 0 || totalStaked === 0) {
    return 0; // Unplayed players get 0
  }

  // ROI
  const roi = (totalWon - totalStaked) / totalStaked;
  const cappedRoi = Math.max(MIN_ROI, Math.min(roi, MAX_ROI));

  // Win Rate
  const winRate = wins / betsPlaced;
  const centeredWinRate = (winRate - 0.5) * 2;

  // Blend
  const blended = ROI_WEIGHT * cappedRoi + WIN_RATE_WEIGHT * centeredWinRate;

  // Multipliers
  const confidence = Math.sqrt(betsPlaced) / (Math.sqrt(betsPlaced) + Math.sqrt(CONFIDENCE_BASE));
  const volumeFactor = Math.log(1 + totalStaked / VOLUME_DIVISOR);

  const rawScore = SCORE_BASE + blended * confidence * volumeFactor * 100;

  return Math.max(0, rawScore);
};

/**
 * Recalculates and updates the leaderboardScore for a given user.
 */
export const updateUserLeaderboardScore = async (userId: string): Promise<void> => {
  try {
    const totalStats = await prisma.bet.aggregate({
      where: {
        userId,
        status: { in: ['WON', 'LOST'] },
      },
      _count: {
        id: true,
      },
      _sum: {
        stake: true,
      },
    });

    const wonStats = await prisma.bet.aggregate({
      where: {
        userId,
        status: 'WON',
      },
      _count: {
        id: true,
      },
      _sum: {
        potentialPayout: true,
      },
    });

    const betsPlaced = totalStats._count.id;
    const wins = wonStats._count.id;
    const totalStaked = totalStats._sum.stake || 0;
    const totalWon = wonStats._sum.potentialPayout || 0;

    const newScore = calculateLeaderboardScore({ betsPlaced, wins, totalStaked, totalWon });

    await prisma.user.update({
      where: { id: userId },
      data: { leaderboardScore: newScore },
    });
  } catch (error) {
    console.error(`[Leaderboard Error] Failed to update score for user ${userId}:`, error);
  }
};
