import cron from 'node-cron';
import prisma from '../prisma';
import { syncESPNData } from './espnSync';

export const startCronJobs = () => {
  // Run ESPN Sync every minute
  cron.schedule('* * * * *', async () => {
    try {
      await syncESPNData();
      
      // Fallback: forcefully lock matches if the API is delayed
      const now = new Date();
      await prisma.match.updateMany({
        where: {
          status: 'OPEN',
          kickoffTime: {
            lte: now,
          },
        },
        data: {
          status: 'LOCKED',
        },
      });

    } catch (error) {
      console.error('[Cron Error] Failed during sync job:', error);
    }
  });

  console.log('[Cron] Match status and ESPN sync cron jobs started');
};
