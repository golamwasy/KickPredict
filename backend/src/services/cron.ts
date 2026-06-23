import cron from 'node-cron';
import prisma from '../prisma';
import { syncESPNData } from './espnSync';

export const startCronJobs = () => {
  // Run ESPN Sync and fallbacks every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    try {
      await syncESPNData();
      
      const now = new Date();

      // Fallback: forcefully lock matches if the API is delayed (check both OPEN and UPCOMING)
      const lockResult = await prisma.match.updateMany({
        where: {
          status: { in: ['OPEN', 'UPCOMING'] },
          kickoffTime: {
            lte: now,
          },
        },
        data: {
          status: 'LOCKED',
        },
      });
      if (lockResult.count > 0) {
        console.log(`[Cron Fallback] Force-locked ${lockResult.count} matches that passed kickoff time.`);
      }

      // Cleanup: delete expired pending registrations to prevent DB leak
      const cleanupResult = await prisma.pendingRegistration.deleteMany({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      });
      if (cleanupResult.count > 0) {
        console.log(`[Cron Cleanup] Cleared ${cleanupResult.count} expired pending registrations.`);
      }

    } catch (error) {
      console.error('[Cron Error] Failed during sync job:', error);
    }
  });

  console.log('[Cron] Match status, cleanup, and ESPN sync cron jobs started');
};
