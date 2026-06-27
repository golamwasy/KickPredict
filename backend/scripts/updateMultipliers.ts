import { PrismaClient } from '@prisma/client';
import { getMultiplier } from '../src/services/multiplier';

const prisma = new PrismaClient();
// @ts-ignore
const isApply = process.argv.includes('--apply');

async function main() {
  const bets = await prisma.bet.findMany({
    where: {
      status: 'PENDING',
      betType: {
        not: 'COMMUNITY_QUESTION'
      }
    },
    include: {
      match: {
        include: {
          team1: true,
          team2: true
        }
      }
    }
  });

  console.log(`Found ${bets.length} pending bets to update.`);

  for (const bet of bets) {
    try {
      const newMultiplier = getMultiplier(bet.betType, {
        predictedData: bet.predictedData as Record<string, any>,
        team1Code: bet.match.team1.code,
        team2Code: bet.match.team2.code
      });

      const newPayout = Math.floor(bet.stake * newMultiplier);

      if (bet.multiplier !== newMultiplier || bet.potentialPayout !== newPayout) {
        if (isApply) {
          await prisma.bet.update({
            where: { id: bet.id },
            data: {
              multiplier: newMultiplier,
              potentialPayout: newPayout
            }
          });
          console.log(`[APPLIED] Updated bet ${bet.id}: Multiplier ${bet.multiplier} -> ${newMultiplier}, Payout ${bet.potentialPayout} -> ${newPayout}`);
        } else {
          console.log(`[DRY RUN] Would update bet ${bet.id}: Multiplier ${bet.multiplier} -> ${newMultiplier}, Payout ${bet.potentialPayout} -> ${newPayout}`);
        }
      } else {
        console.log(`[UP TO DATE] Bet ${bet.id} already has the correct multiplier (${bet.multiplier}) and payout (${bet.potentialPayout}).`);
      }
    } catch (e) {
      console.error(`Error updating bet ${bet.id}:`, e);
    }
  }
  
  console.log('Finished updating bets.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
