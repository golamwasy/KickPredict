import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import prisma from '../prisma';

const router = Router();

// Get approved tournament questions
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const questions = await prisma.communityQuestion.findMany({
      where: { isTournament: true, status: 'APPROVED' },
      include: { 
        creator: { select: { username: true } },
        _count: { select: { bets: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(questions);
  } catch (err) {
    console.error('Error fetching tournament questions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new tournament question (auto-approved as requested)
router.post('/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Valid question text is required' });
    }

    const newQuestion = await prisma.communityQuestion.create({
      data: {
        isTournament: true,
        creatorId: req.user!.id,
        question: question.trim(),
        status: 'APPROVED', // Auto-approved for tournament questions based on requirements
      },
      include: {
        creator: { select: { username: true } },
        _count: { select: { bets: true } }
      }
    });

    res.status(201).json(newQuestion);
  } catch (err) {
    console.error('Error creating tournament question:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
