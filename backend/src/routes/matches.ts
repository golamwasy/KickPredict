import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { syncESPNData } from '../services/espnSync';
import { getMultiplier } from '../services/multiplier';
import { BetType } from '@prisma/client';

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
        console.log('[Sync] Triggering on-demand ESPN sync for active/locked matches (async)');
        // Run sync asynchronously in the background so it doesn't block the HTTP response
        syncESPNData().catch((err) => {
          console.error('[Matches Route] Background ESPN sync failed:', err);
        });
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

    // Aggregate MATCH_WINNER bets for the community stats bar chart
    const totalBets = await prisma.bet.count({
      where: { matchId: id, betType: 'MATCH_WINNER' },
    });
    const homeWinBets = await prisma.bet.count({
      where: { matchId: id, betType: 'MATCH_WINNER', predictedData: { path: ['outcome'], equals: 'HOME' } },
    });
    const drawBets = await prisma.bet.count({
      where: { matchId: id, betType: 'MATCH_WINNER', predictedData: { path: ['outcome'], equals: 'DRAW' } },
    });
    const awayWinBets = await prisma.bet.count({
      where: { matchId: id, betType: 'MATCH_WINNER', predictedData: { path: ['outcome'], equals: 'AWAY' } },
    });

    res.json({
      ...match,
      stats: {
        totalPredictions: totalBets,
        team1WinPercentage: totalBets ? Math.round((homeWinBets / totalBets) * 100) : 0,
        drawPercentage: totalBets ? Math.round((drawBets / totalBets) * 100) : 0,
        team2WinPercentage: totalBets ? Math.round((awayWinBets / totalBets) * 100) : 0,
      }
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get odds for a specific match
router.post('/:id/odds', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { betType, predictedData } = req.body;

    const match = await prisma.match.findUnique({
      where: { id },
      include: { team1: true, team2: true },
    });

    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!betType || !predictedData) return res.status(400).json({ error: 'betType and predictedData required' });

    const multiplier = getMultiplier(betType as BetType, {
      predictedData,
      team1Code: match.team1.code,
      team2Code: match.team2.code
    });

    res.json({ multiplier });
  } catch (error) {
    console.error('Error fetching odds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
