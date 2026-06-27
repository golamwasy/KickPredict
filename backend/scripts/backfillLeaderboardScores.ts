import prisma from '../src/prisma';
import { updateUserLeaderboardScore } from '../src/services/leaderboardScore';

async function main() {
  console.log('Fetching all active users...');
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: 'USER',
    },
    select: { id: true, username: true }
  });

  console.log(`Found ${users.length} active users. Backfilling scores...`);

  for (const user of users) {
    await updateUserLeaderboardScore(user.id);
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { leaderboardScore: true }});
    console.log(`Updated user ${user.username} -> Score: ${updatedUser?.leaderboardScore?.toFixed(4)}`);
  }

  console.log('Backfill complete!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
