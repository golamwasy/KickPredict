import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import prisma from '../prisma';
import { MatchResult } from '@prisma/client';

const router = Router();

// Submit or edit a prediction
router.post('/:matchId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = req.params.matchId as string;
    const { team1Goals, team2Goals, result } = req.body;
    const userId = req.user!.id;

    if (!['TEAM1', 'DRAW', 'TEAM2'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result. Must be TEAM1, DRAW, or TEAM2' });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    if (match.status !== 'OPEN') {
      return res.status(400).json({ error: `Match is ${match.status}. Predictions are locked.` });
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
      update: {
        team1Goals,
        team2Goals,
        result: result as MatchResult,
      },
      create: {
        userId,
        matchId,
        team1Goals,
        team2Goals,
        result: result as MatchResult,
      },
    });

    res.json(prediction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's predictions
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const predictions = await prisma.prediction.findMany({
      where: { userId: req.user!.id },
      include: {
        match: {
          include: { team1: true, team2: true }
        },
        points: true,
      },
    });
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
