import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import prisma from '../prisma';
import { MatchResult } from '@prisma/client';

const router = Router();

// Opt out of predicting a match ("Khelbo na")
router.post('/:matchId/skip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = req.params.matchId as string;
    const userId = req.user!.id;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'OPEN') {
      return res.status(400).json({ error: `Match is ${match.status}. Cannot opt out now.` });
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: { skipped: true, team1Goals: null, team2Goals: null, result: null },
      create: { userId, matchId, skipped: true, team1Goals: null, team2Goals: null, result: null },
    });

    res.json(prediction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit or edit a prediction
router.post('/:matchId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = req.params.matchId as string;
    const { team1Goals, team2Goals, result } = req.body;
    const userId = req.user!.id;

    // Block if user has already opted out
    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
    });
    if (existing?.skipped) {
      return res.status(403).json({ error: 'You have opted out of this match. No further predictions allowed.' });
    }

    if (!['TEAM1', 'DRAW', 'TEAM2'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result. Must be TEAM1, DRAW, or TEAM2' });
    }

    const t1 = team1Goals !== null && team1Goals !== undefined ? Number(team1Goals) : null;
    const t2 = team2Goals !== null && team2Goals !== undefined ? Number(team2Goals) : null;

    const t1Provided = t1 !== null && !isNaN(t1);
    const t2Provided = t2 !== null && !isNaN(t2);
    if (t1Provided !== t2Provided) {
      return res.status(400).json({ error: 'Both goal fields must be filled together, or both left empty.' });
    }

    if (t1Provided && t2Provided) {
      let expectedResult: string;
      if (t1! > t2!) expectedResult = 'TEAM1';
      else if (t1! < t2!) expectedResult = 'TEAM2';
      else expectedResult = 'DRAW';

      if (result !== expectedResult) {
        return res.status(400).json({
          error: `Prediction conflict: Predicted score of ${t1} – ${t2} mathematically implies a ${expectedResult === 'DRAW' ? 'Draw' : expectedResult === 'TEAM1' ? 'Team 1 Win' : 'Team 2 Win'}, but you selected result as ${result === 'DRAW' ? 'Draw' : result === 'TEAM1' ? 'Team 1 Win' : 'Team 2 Win'}.`
        });
      }
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'OPEN') {
      return res.status(400).json({ error: `Match is ${match.status}. Predictions are locked.` });
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      update: { team1Goals: t1, team2Goals: t2, result: result as MatchResult, skipped: false },
      create: { userId, matchId, team1Goals: t1, team2Goals: t2, result: result as MatchResult },
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
        match: { include: { team1: true, team2: true } },
        points: true,
      },
    });
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
