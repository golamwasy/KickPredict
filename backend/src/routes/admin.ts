import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth';
import prisma from '../prisma';
import { settleBetsForMatch } from '../services/settlement';
import { sendAccountActivatedEmail } from '../services/email';
import { creditWallet } from '../services/wallet';

const router = Router();

// Secure all admin routes
router.use(authenticate, requireAdmin);

// Get dashboard summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalBets = await prisma.bet.count();
    const pendingBets = await prisma.bet.count({ where: { status: 'PENDING' } });
    const recentSyncLogs = await prisma.apiSyncLog.findMany({
      where: { status: 'ERROR' },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      totalUsers,
      totalBets,
      pendingBets,
      recentSyncLogs
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        isActive: true,
        role: true,
        createdAt: true,
        wallet: { select: { balance: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle user status
router.put('/users/:id/toggle-status', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Prevent admin from disabling themselves
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot modify your own status' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    });

    // Send email if account was manually activated
    if (!user.isActive && updatedUser.isActive) {
      // Background process, no need to await
      sendAccountActivatedEmail(updatedUser.email).catch(err => {
        console.error('[Admin] Failed to send activation email:', err);
      });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user balance
router.put('/users/:id/balance', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { balance } = req.body;
    
    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ error: 'Invalid balance amount' });
    }

    const wallet = await prisma.wallet.update({
      where: { userId: id },
      data: { balance }
    });

    res.json(wallet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Manually trigger bet settlement for all finished matches
router.post('/settle-bets', async (req: AuthRequest, res: Response) => {
  try {
    const finishedMatches = await prisma.match.findMany({
      where: { status: 'FINISHED' }
    });

    const results: { matchId: string; status: string }[] = [];

    for (const match of finishedMatches) {
      try {
        await settleBetsForMatch(match.id);
        results.push({ matchId: match.id, status: 'settled' });
      } catch (err: any) {
        results.push({ matchId: match.id, status: `error: ${err.message}` });
      }
    }

    res.json({ message: `Settlement attempted for ${finishedMatches.length} matches`, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to settle bets' });
  }
});

// Get a specific user's bet history
router.get('/users/:id/bets', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const bets = await prisma.bet.findMany({
      where: { userId: id },
      include: {
        match: { include: { team1: true, team2: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bets);
  } catch (error) {
    console.error('[Admin User Bets Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific user's transaction history
router.get('/users/:id/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const wallet = await prisma.wallet.findUnique({
      where: { userId: id },
    });
    
    if (!wallet) return res.json([]);

    const transactions = await prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    console.error('[Admin User Transactions Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant a loan to a user
router.post('/users/:id/loan', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { loanAmount } = req.body;
    
    if (typeof loanAmount !== 'number' || loanAmount <= 0) {
      return res.status(400).json({ error: 'Invalid loan amount' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    // Update wallet: increment balance and loan
    const updatedWallet = await prisma.wallet.update({
      where: { userId: id },
      data: {
        balance: wallet.balance + loanAmount,
        loan: wallet.loan + loanAmount
      }
    });

    // Optionally log a transaction
    await prisma.transaction.create({
      data: {
        walletId: updatedWallet.id,
        type: 'ADMIN_ADJUST',
        amount: loanAmount,
        balanceAfter: updatedWallet.balance,
        note: `Loan granted by admin: ${loanAmount} KC`
      }
    });

    res.json(updatedWallet);
  } catch (error) {
    console.error('[Admin Loan Error]', error);
    res.status(500).json({ error: 'Failed to grant loan' });
  }
});

export default router;

// ─── Community Questions Admin Routes ────────────────────────────────────────

// List all community questions
router.get('/community-questions', async (req: AuthRequest, res: Response) => {
  try {
    const questions = await prisma.communityQuestion.findMany({
      include: {
        match: { select: { team1: true, team2: true, kickoffTime: true } },
        creator: { select: { username: true } },
        _count: { select: { bets: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(questions);
  } catch (error) {
    console.error('[Admin CQ Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update community question status (for future review system)
router.put('/community-questions/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const question = await prisma.communityQuestion.update({
      where: { id },
      data: { status }
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bets for a specific community question
router.get('/community-questions/:id/bets', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const bets = await prisma.bet.findMany({
      where: { communityQuestionId: id },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark a specific bet for a community question as WON/LOST
router.put('/community-questions/:id/bets/:betId/status', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const betId = req.params.betId as string;
    const { status } = req.body; // 'WON' | 'LOST'
    
    if (!['WON', 'LOST'].includes(status)) {
      return res.status(400).json({ error: 'Status must be WON or LOST' });
    }

    const bet = await prisma.bet.findUnique({ where: { id: betId } });
    if (!bet || bet.communityQuestionId !== id) {
      return res.status(404).json({ error: 'Bet not found or mismatch' });
    }
    if (bet.status !== 'PENDING') {
      return res.status(400).json({ error: 'Bet is already settled' });
    }

    let updatedBet;
    await prisma.$transaction(async (tx) => {
      updatedBet = await tx.bet.update({
        where: { id: betId },
        data: { status, settledAt: new Date() }
      });

      if (status === 'WON') {
        await creditWallet(bet.userId, bet.potentialPayout, 'BET_WON', bet.id, undefined, tx);
      }
    });

    res.json(updatedBet);
  } catch (error) {
    console.error('[Admin Settle Bet Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve a community question (mark as resolved)
router.put('/community-questions/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { correctAnswer } = req.body; // optional note
    
    const question = await prisma.communityQuestion.update({
      where: { id },
      data: { isResolved: true, correctAnswer }
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
