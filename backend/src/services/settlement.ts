import prisma from '../prisma';
import { BetType, BetStatus, TransactionType } from '@prisma/client';
import { creditWallet } from './wallet';

interface SettlementResult {
  status: BetStatus;
  payout: number; // 0 for LOST
}

// ─── Per-type settlement functions ────────────────────────────────────────────

const settleMatchWinner = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number
): 'WON' | 'LOST' => {
  const actual = team1Goals > team2Goals ? 'HOME' : team1Goals < team2Goals ? 'AWAY' : 'DRAW';
  return predictedData.outcome === actual ? 'WON' : 'LOST';
};

const settleDoubleChance = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number
): 'WON' | 'LOST' => {
  const actual = team1Goals > team2Goals ? 'HOME' : team1Goals < team2Goals ? 'AWAY' : 'DRAW';
  return (predictedData.outcomes as string[]).includes(actual) ? 'WON' : 'LOST';
};

const settleExactScore = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number
): 'WON' | 'LOST' => {
  return predictedData.homeScore === team1Goals && predictedData.awayScore === team2Goals
    ? 'WON'
    : 'LOST';
};

const settleOverUnder = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number
): 'WON' | 'LOST' | 'VOID' => {
  const total = team1Goals + team2Goals;
  if (total === predictedData.line) return 'VOID'; // Push condition for exact integer lines
  if (predictedData.side === 'OVER') return total > predictedData.line ? 'WON' : 'LOST';
  return total < predictedData.line ? 'WON' : 'LOST';
};

const settleBothTeamsToScore = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number
): 'WON' | 'LOST' => {
  const bothScored = team1Goals > 0 && team2Goals > 0;
  return predictedData.answer === bothScored ? 'WON' : 'LOST';
};

const settleCorrectMargin = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number
): 'WON' | 'LOST' => {
  const actualMarginSide =
    team1Goals > team2Goals ? 'HOME' : team1Goals < team2Goals ? 'AWAY' : 'DRAW';
  const actualMargin = Math.abs(team1Goals - team2Goals);
  return predictedData.marginSide === actualMarginSide && predictedData.margin === actualMargin
    ? 'WON'
    : 'LOST';
};

const settleFirstToScore = (
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number,
  firstTeamToScoreId: string | null,
  team1Id: string,
  team2Id: string
): 'WON' | 'LOST' | 'VOID' => {
  const noGoals = team1Goals === 0 && team2Goals === 0;
  if (noGoals) {
    return predictedData.team === 'NONE' ? 'WON' : 'LOST';
  }
  
  if (!firstTeamToScoreId) return 'VOID'; 

  const actualFirstScorer = firstTeamToScoreId === team1Id ? 'HOME' : firstTeamToScoreId === team2Id ? 'AWAY' : 'NONE';
  return predictedData.team === actualFirstScorer ? 'WON' : 'LOST';
};

// ─── Dispatch + wallet settlement ─────────────────────────────────────────────

const settleSingleBet = (
  betType: BetType,
  predictedData: Record<string, any>,
  team1Goals: number,
  team2Goals: number,
  firstTeamToScoreId: string | null,
  team1Id: string,
  team2Id: string
): 'WON' | 'LOST' | 'VOID' => {
  switch (betType) {
    case BetType.MATCH_WINNER:
      return settleMatchWinner(predictedData, team1Goals, team2Goals);
    case BetType.DOUBLE_CHANCE:
      return settleDoubleChance(predictedData, team1Goals, team2Goals);
    case BetType.EXACT_SCORE:
      return settleExactScore(predictedData, team1Goals, team2Goals);
    case BetType.OVER_UNDER_GOALS:
      return settleOverUnder(predictedData, team1Goals, team2Goals);
    case BetType.BOTH_TEAMS_TO_SCORE:
      return settleBothTeamsToScore(predictedData, team1Goals, team2Goals);
    case BetType.CORRECT_MARGIN:
      return settleCorrectMargin(predictedData, team1Goals, team2Goals);
    case BetType.FIRST_TO_SCORE:
      return settleFirstToScore(predictedData, team1Goals, team2Goals, firstTeamToScoreId, team1Id, team2Id);
    default:
      return 'VOID';
  }
};

/**
 * Settles all PENDING bets for a finished match.
 * Each bet is wrapped in its own transaction so a failure on one bet
 * does not roll back the entire batch.
 */
export const settleBetsForMatch = async (matchId: string): Promise<void> => {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }
  if (match.status !== 'FINISHED' && match.status !== 'CANCELLED') {
    throw new Error(`Match ${matchId} is not in a settleable state (${match.status})`);
  }
  if (match.status === 'FINISHED' && (match.team1Goals === null || match.team2Goals === null)) {
    throw new Error(`Match ${matchId} is FINISHED but missing score data`);
  }

  const pendingBets = await prisma.bet.findMany({
    where: { matchId, status: BetStatus.PENDING },
  });

  if (pendingBets.length === 0) {
    console.log(`[Settlement] No pending bets for match ${matchId}`);
    return;
  }

  console.log(`[Settlement] Settling ${pendingBets.length} bets for match ${matchId}`);

  for (const bet of pendingBets) {
    try {
      let outcome: 'WON' | 'LOST' | 'VOID';
      
      if (match.status === 'CANCELLED') {
        outcome = 'VOID';
      } else {
        outcome = settleSingleBet(
          bet.betType,
          bet.predictedData as Record<string, any>,
          match.team1Goals!,
          match.team2Goals!,
          match.firstTeamToScoreId,
          match.team1Id,
          match.team2Id
        );
      }

      await prisma.$transaction(async (tx) => {
        if (outcome === 'WON') {
          await creditWallet(
            bet.userId,
            bet.potentialPayout,
            TransactionType.BET_WON,
            bet.id,
            `Won: ${bet.betType} on match ${matchId}`,
            tx
          );
          await tx.bet.update({
            where: { id: bet.id },
            data: { status: BetStatus.WON, settledAt: new Date() },
          });
        } else if (outcome === 'LOST') {
          // Stake was already deducted at placement — nothing to charge
          await tx.bet.update({
            where: { id: bet.id },
            data: { status: BetStatus.LOST, settledAt: new Date() },
          });
          // Record BET_LOST transaction with 0 amount for auditability
          const wallet = await tx.wallet.findUnique({ where: { userId: bet.userId } });
          if (wallet) {
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: TransactionType.BET_LOST,
                amount: 0,
                balanceAfter: wallet.balance,
                betId: bet.id,
              },
            });
          }
        } else {
          // VOID — refund stake
          await creditWallet(
            bet.userId,
            bet.stake,
            TransactionType.BET_REFUNDED,
            bet.id,
            `Refund: ${bet.betType} on match ${matchId} (no data)`,
            tx
          );
          await tx.bet.update({
            where: { id: bet.id },
            data: { status: BetStatus.VOID, settledAt: new Date() },
          });
        }
      });

      console.log(`[Settlement] Bet ${bet.id} (${bet.betType}) → ${outcome}`);
    } catch (err) {
      console.error(`[Settlement Error] Failed to settle bet ${bet.id}:`, err);
      // Continue with next bet — one failure should not block the batch
    }
  }

  console.log(`[Settlement] Completed settlement for match ${matchId}`);
};
