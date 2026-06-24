import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import prisma from '../prisma';
import { BetType } from '@prisma/client';
import { getMultiplier, validatePredictedData } from '../services/multiplier';
import { debitWallet, getWalletData } from '../services/wallet';

const router = Router();

// ─── Wallet ───────────────────────────────────────────────────────────────────

// GET /api/wallet/me — balance + transaction history
router.get('/wallet/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const walletData = await getWalletData(req.user!.id);
    res.json(walletData);
  } catch (err: any) {
    if (err.message === 'Wallet not found') return res.status(404).json({ error: 'Wallet not found' });
    console.error('[Wallet Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Bets ─────────────────────────────────────────────────────────────────────

// POST /api/bets — place a bet
router.post('/bets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { matchId, betType, predictedData, stake } = req.body;

    // 1. Basic input validation
    if (!matchId || !betType || !predictedData || stake === undefined) {
      return res.status(400).json({ error: 'matchId, betType, predictedData, and stake are required' });
    }
    if (!Object.values(BetType).includes(betType)) {
      return res.status(400).json({ error: `Invalid betType. Must be one of: ${Object.values(BetType).join(', ')}` });
    }
    const stakeNum = Number(stake);
    if (!Number.isInteger(stakeNum) || stakeNum <= 0) {
      return res.status(400).json({ error: 'stake must be a positive integer' });
    }

    // 2. Validate predictedData shape for the given betType
    const validationError = validatePredictedData(betType as BetType, predictedData);
    if (validationError) return res.status(400).json({ error: validationError });

    // 3. Validate match is OPEN and before kickoff
    const match = await prisma.match.findUnique({ 
      where: { id: matchId },
      include: { team1: true, team2: true }
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'OPEN') {
      return res.status(400).json({ error: `Match is ${match.status}. Bets can only be placed on OPEN matches.` });
    }
    if (new Date() > new Date(match.kickoffTime)) {
      return res.status(400).json({ error: 'Match has already kicked off. Bets are closed.' });
    }

    // 4. Check wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(400).json({ error: 'Wallet not found. Please contact support.' });
    if (wallet.balance < stakeNum) {
      return res.status(400).json({ error: `Insufficient balance. You have ${wallet.balance} KickCoins but tried to stake ${stakeNum}.` });
    }

    // 5. Check for duplicate bet (one bet per type per match per user)
    const existingBet = await prisma.bet.findUnique({
      where: { userId_matchId_betType: { userId, matchId, betType: betType as BetType } },
    });
    if (existingBet) {
      return res.status(409).json({ error: `You already have a ${betType} bet on this match.` });
    }

    // 6. Compute and lock multiplier
    const multiplier = getMultiplier(betType as BetType, { 
      predictedData,
      team1Code: match.team1.code,
      team2Code: match.team2.code
    });
    const potentialPayout = Math.round(stakeNum * multiplier);

    // 7. Create bet and debit wallet atomically (rolls back bet if wallet debit fails)
    let bet, newBalance;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const createdBet = await tx.bet.create({
          data: {
            userId,
            matchId,
            betType: betType as BetType,
            stake: stakeNum,
            multiplier,
            potentialPayout,
            predictedData,
          },
        });
        const updatedBalance = await debitWallet(userId, stakeNum, createdBet.id, tx);
        return { bet: createdBet, newBalance: updatedBalance };
      });
      bet = result.bet;
      newBalance = result.newBalance;
    } catch (e: any) {
      if (e.message === 'Insufficient KickCoins balance') {
        return res.status(400).json({ error: e.message });
      }
      throw e;
    }

    res.status(201).json({
      bet,
      newBalance,
      multiplier,
      potentialPayout,
    });
  } catch (err: any) {
    console.error('[Place Bet Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bets/me — authenticated user's full bet history
router.get('/bets/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const bets = await prisma.bet.findMany({
      where: { userId: req.user!.id },
      include: {
        match: { include: { team1: true, team2: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bets);
  } catch (err) {
    console.error('[Bets History Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bets/match/:matchId — user's bets on a specific match
router.get('/bets/match/:matchId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const bets = await prisma.bet.findMany({
      where: { userId: req.user!.id, matchId: req.params.matchId as string },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bets);
  } catch (err) {
    console.error('[Match Bets Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
