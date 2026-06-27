import prisma from '../prisma';

export const MAX_ROI = 1.5;
export const MIN_ROI = -1.0;
export const CONFIDENCE_BASE = 15;
export const VOLUME_DIVISOR = 1000;

export interface LeaderboardStats {
  betsPlaced: number;
  totalStaked: number;
  totalWon: number;
}

/**
 * Pure function to calculate leaderboard score based on user stats.
 */
export const calculateLeaderboardScore = ({ betsPlaced, totalStaked, totalWon }: LeaderboardStats): number => {
  if (betsPlaced === 0 || totalStaked === 0) {
    return 100; // Base score for everyone
  }

  // Calculate true Profit Margin (ROI)
  const roi = (totalWon - totalStaked) / totalStaked;
  const cappedRoi = Math.max(MIN_ROI, Math.min(roi, MAX_ROI));
  
  const confidence = Math.sqrt(betsPlaced) / (Math.sqrt(betsPlaced) + Math.sqrt(CONFIDENCE_BASE));
  const volumeFactor = Math.log(1 + totalStaked / VOLUME_DIVISOR); // ln(1 + ...)
  
  // Base 100. Winners add to it, losers subtract from it.
  const rawScore = 100 + (cappedRoi * confidence * volumeFactor * 100);
  
  // Floor at 0 so nobody ever has a negative score
  return Math.max(0, rawScore);
};

/**
 * Recalculates and updates the leaderboardScore for a given user.
 */
export const updateUserLeaderboardScore = async (userId: string): Promise<void> => {
  try {
    // 1. Get total bets and staked amount for SETTLED bets
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

    // 2. Get total amount won (only for WON bets)
    const wonStats = await prisma.bet.aggregate({
      where: {
        userId,
        status: 'WON',
      },
      _sum: {
        potentialPayout: true,
      },
    });

    const betsPlaced = totalStats._count.id;
    const totalStaked = totalStats._sum.stake || 0;
    const totalWon = wonStats._sum.potentialPayout || 0;

    const newScore = calculateLeaderboardScore({ betsPlaced, totalStaked, totalWon });

    await prisma.user.update({
      where: { id: userId },
      data: { leaderboardScore: newScore },
    });

    // Optional: console.log for debugging/tracing
    // console.log(`[Leaderboard] Updated user ${userId} score to ${newScore.toFixed(2)} (Bets: ${betsPlaced}, Staked: ${totalStaked}, Won: ${totalWon})`);
  } catch (error) {
    console.error(`[Leaderboard Error] Failed to update score for user ${userId}:`, error);
  }
};
