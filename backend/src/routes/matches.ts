import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { syncESPNData } from '../services/espnSync';

const router = Router();

// Get all matches
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check if we should sync active/ongoing matches on demand
    const now = new Date();
    const needsSyncMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { status: { in: ['LIVE', 'LOCKED'] } },
          { status: 'OPEN', kickoffTime: { lte: now } }
        ]
      }
    });

    if (needsSyncMatch) {
      const lastSync = await prisma.apiSyncLog.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' }
      });

      const oneMinuteAgo = new Date(Date.now() - 60000); // 1 minute threshold
      if (!lastSync || lastSync.createdAt < oneMinuteAgo) {
        console.log('[Sync] Triggering on-demand ESPN sync for active/locked matches');
        await syncESPNData();
      }
    }

    const matches = await prisma.match.findMany({
      include: {
        team1: true,
        team2: true,
      },
      orderBy: {
        kickoffTime: 'asc',
      },
    });
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single match by ID with aggregated predictions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        team1: true,
        team2: true,
      },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Aggregate predictions anonymously
    const totalPredictions = await prisma.prediction.count({ where: { matchId: id } });
    const team1Wins = await prisma.prediction.count({ where: { matchId: id, result: 'TEAM1' } });
    const draws = await prisma.prediction.count({ where: { matchId: id, result: 'DRAW' } });
    const team2Wins = await prisma.prediction.count({ where: { matchId: id, result: 'TEAM2' } });

    res.json({
      ...match,
      stats: {
        totalPredictions,
        team1WinPercentage: totalPredictions ? Math.round((team1Wins / totalPredictions) * 100) : 0,
        drawPercentage: totalPredictions ? Math.round((draws / totalPredictions) * 100) : 0,
        team2WinPercentage: totalPredictions ? Math.round((team2Wins / totalPredictions) * 100) : 0,
      }
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
