/**
 * One-time backfill script: creates Wallet + SIGNUP_BONUS Transaction
 * for every existing User that doesn't yet have a Wallet.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfillWallets.ts
 *
 * Safe to re-run — createWalletForUser() is idempotent and will skip
 * any user who already has a wallet.
 */
import prisma from '../prisma';
import { createWalletForUser } from '../services/wallet';

const run = async () => {
  console.log('[Backfill] Starting wallet backfill for existing users...');

  // Find all users who do NOT yet have a wallet
  const usersWithoutWallet = await prisma.user.findMany({
    where: { wallet: null },
    select: { id: true, username: true },
  });

  console.log(`[Backfill] Found ${usersWithoutWallet.length} user(s) without a wallet.`);

  let success = 0;
  let failed = 0;

  for (const user of usersWithoutWallet) {
    try {
      await createWalletForUser(user.id);
      console.log(`[Backfill] ✅ Created wallet for user: ${user.username} (${user.id})`);
      success++;
    } catch (err) {
      console.error(`[Backfill] ❌ Failed for user: ${user.username} (${user.id})`, err);
      failed++;
    }
  }

  console.log(`[Backfill] Done. Success: ${success}, Failed: ${failed}`);
  await prisma.$disconnect();
};

run().catch((err) => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
