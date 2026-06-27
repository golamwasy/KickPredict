import { PrismaClient } from '@prisma/client';
import { settleBetsForMatch } from '../src/services/settlement';

declare const process: any;

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log("=== DRY RUN MODE: No changes will be made to the database ===");
  }

  console.log("Looking for the EGY vs IRN match...");
  const match = await prisma.match.findFirst({
    where: {
      team1: { code: 'EGY' },
      team2: { code: 'IRN' },
      status: 'FINISHED'
    }
  });

  if (!match) {
    console.log("Match not found!");
    return;
  }

  console.log("Found match:", match.id);

  // Find falsely lost UNDER 2.5 bets
  const badBets = await prisma.bet.findMany({
    where: {
      matchId: match.id,
      betType: 'OVER_UNDER_GOALS',
      status: 'LOST',
    }
  });

  let fixedCount = 0;

  for (const bet of badBets) {
    const data = bet.predictedData as any;
    if (data.side === 'UNDER' && data.line === 2.5) {
      console.log(`[Action Required] Bet ${bet.id} for user ${bet.userId} is falsely marked as LOST. Stake: ${bet.stake} KC -> Potential: ${bet.potentialPayout} KC.`);
      
      if (!isDryRun) {
        // Delete the 0 KC 'LOST' transaction
        await prisma.transaction.deleteMany({
          where: { betId: bet.id, type: 'BET_LOST' }
        });

        // Revert to PENDING
        await prisma.bet.update({
          where: { id: bet.id },
          data: { status: 'PENDING', settledAt: null }
        });
      }
      
      fixedCount++;
    }
  }

  if (fixedCount > 0) {
    if (isDryRun) {
      console.log(`\n[DRY RUN] Would revert ${fixedCount} bets to PENDING and trigger official settlement for Match ${match.id}.`);
      console.log(`[DRY RUN] If executed, these users would receive their payouts and have their Kick Scores updated.`);
    } else {
      console.log(`Reverted ${fixedCount} bets to PENDING. Triggering official settlement...`);
      // This will correctly mark them as WON, pay the users out, and update their Kick Scores!
      await settleBetsForMatch(match.id);
      console.log("Settlement complete. The users have been paid out!");
    }
  } else {
    console.log("No falsely lost Under 2.5 bets found for this match.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
