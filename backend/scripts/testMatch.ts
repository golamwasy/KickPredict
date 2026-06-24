import { PrismaClient } from '@prisma/client';
import { settleBetsForMatch } from '../src/services/settlement';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (action === 'create') {
    let team1 = await prisma.team.findUnique({ where: { code: 'TTA' } });
    if (!team1) {
      team1 = await prisma.team.create({ data: { name: 'Test Team A', code: 'TTA', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/1024px-Flag_of_France.svg.png' } });
    }
    let team2 = await prisma.team.findUnique({ where: { code: 'TTB' } });
    if (!team2) {
      team2 = await prisma.team.create({ data: { name: 'Test Team B', code: 'TTB', flagUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Flag_of_Brazil.svg/1024px-Flag_of_Brazil.svg.png' } });
    }

    const match = await prisma.match.create({
      data: {
        apiFixtureId: null, // Safe: espnSync will ignore this match
        team1Id: team1.id,
        team2Id: team2.id,
        kickoffTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        status: 'OPEN',
      }
    });
    console.log(`\n==============================================`);
    console.log(`✅ Test Match Created Successfully!`);
    console.log(`Match ID: ${match.id}`);
    console.log(`==============================================\n`);
    console.log(`1️⃣  Go to your browser and open:`);
    console.log(`   http://localhost:3000/matches/${match.id}\n`);
    console.log(`2️⃣  Place some test bets on this match.\n`);
    console.log(`3️⃣  When you're ready to simulate the end of the match and settle the bets, run this command in the backend folder:\n`);
    console.log(`   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/testMatch.ts finish ${match.id} [team1Goals] [team2Goals]\n`);
    console.log(`   (Example: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/testMatch.ts finish ${match.id} 2 1)\n`);
  } else if (action === 'finish') {
    const matchId = args[1];
    const team1Goals = parseInt(args[2]);
    const team2Goals = parseInt(args[3]);

    if (!matchId || isNaN(team1Goals) || isNaN(team2Goals)) {
      console.error('Usage: npx ts-node --compiler-options \'{"module":"CommonJS"}\' scripts/testMatch.ts finish <matchId> <team1Goals> <team2Goals>');
      process.exit(1);
    }

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'FINISHED',
        team1Goals,
        team2Goals
      }
    });
    console.log(`\n⚽ Match ${match.id} finished with score ${team1Goals}-${team2Goals}.`);
    console.log(`Settling bets...`);
    
    await settleBetsForMatch(match.id);
    console.log(`\n✅ Bets settled successfully! Check your Wallet transaction history on the frontend.\n`);
  } else {
    console.log('Usage:');
    console.log('  Create match: npx ts-node --compiler-options \'{"module":"CommonJS"}\' scripts/testMatch.ts create');
    console.log('  Finish match: npx ts-node --compiler-options \'{"module":"CommonJS"}\' scripts/testMatch.ts finish <matchId> <homeScore> <awayScore>');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
