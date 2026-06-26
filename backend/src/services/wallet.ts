import prisma from '../prisma';
import { TransactionType, Prisma } from '@prisma/client';

const SIGNUP_BONUS_AMOUNT = 10000;

/**
 * Creates a wallet + SIGNUP_BONUS transaction for a user.
 * Idempotent: safe to call if wallet already exists (returns existing wallet).
 */
export const createWalletForUser = async (userId: string): Promise<void> => {
  // Check if wallet already exists (idempotency guard)
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: { userId, balance: SIGNUP_BONUS_AMOUNT },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.SIGNUP_BONUS,
        amount: SIGNUP_BONUS_AMOUNT,
        balanceAfter: SIGNUP_BONUS_AMOUNT,
        note: 'Welcome bonus — 10,000 KickCoins',
      },
    });
  });
};

/**
 * Deducts stake from wallet and records BET_PLACED transaction.
 * Returns the updated balance. Throws if insufficient funds.
 */
export const debitWallet = async (
  userId: string,
  stake: number,
  betId: string,
  txClient?: Prisma.TransactionClient,
  note?: string
): Promise<number> => {
  const execute = async (tx: Prisma.TransactionClient) => {
    // Lock the wallet row to prevent concurrent race conditions
    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;

    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.balance < stake) throw new Error('Insufficient KickCoins balance');

    const newBalance = wallet.balance - stake;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.BET_PLACED,
        amount: -stake,
        balanceAfter: newBalance,
        betId,
        note: note || null,
      },
    });

    return newBalance;
  };

  return txClient ? execute(txClient) : prisma.$transaction(execute);
};

/**
 * Credits wallet and records a transaction. Used for BET_WON and BET_REFUNDED.
 */
export const creditWallet = async (
  userId: string,
  amount: number,
  type: TransactionType,
  betId?: string,
  note?: string,
  txClient?: Prisma.TransactionClient
): Promise<number> => {
  const execute = async (tx: Prisma.TransactionClient) => {
    // Lock the wallet row to prevent concurrent race conditions
    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;

    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    const newBalance = wallet.balance + amount;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount,
        balanceAfter: newBalance,
        betId: betId ?? null,
        note: note ?? null,
      },
    });

    return await checkAndAutoRepayLoan(userId, tx);
  };

  return txClient ? execute(txClient) : prisma.$transaction(execute);
};

/**
 * Checks if a user's balance meets the criteria to auto-repay their loan.
 * If so, deducts the loan amount from their balance.
 * Returns the final adjusted balance.
 */
export const checkAndAutoRepayLoan = async (userId: string, tx: Prisma.TransactionClient): Promise<number> => {
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) return 0;
  
  if (wallet.loan <= 0) return wallet.balance;

  const actualBalance = wallet.balance - wallet.loan;
  
  // Condition: (total balance - loan) >= loan/2
  if (actualBalance >= wallet.loan / 2) {
    const loanAmount = wallet.loan;
    const newBalance = wallet.balance - loanAmount;

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        loan: 0,
      },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.LOAN_REPAYMENT,
        amount: -loanAmount,
        balanceAfter: newBalance,
        note: 'Auto loan repayment',
      },
    });

    return newBalance;
  }

  return wallet.balance;
};

/**
 * Checks if a user qualifies for an automatic loan grant (no pending bets, balance <= 1000).
 * If qualified, grants a 10000 loan.
 */
export const checkAndAutoGrantLoan = async (userId: string): Promise<void> => {
  const pendingBetsCount = await prisma.bet.count({
    where: { userId, status: 'PENDING' },
  });

  if (pendingBetsCount > 0) return;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || wallet.balance > 1000) return;

  await prisma.$transaction(async (tx) => {
    // Re-check inside transaction with a lock to be safe
    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
    const w = await tx.wallet.findUnique({ where: { userId } });
    
    if (w && w.balance <= 1000) {
      const newBalance = w.balance + 10000;
      const newLoan = w.loan + 10000;

      await tx.wallet.update({
        where: { id: w.id },
        data: {
          balance: newBalance,
          loan: newLoan,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: w.id,
          type: TransactionType.LOAN_GRANTED,
          amount: 10000,
          balanceAfter: newBalance,
          note: 'Auto 10000 loan granted',
        },
      });
    }
  });
};

/**
 * Returns wallet balance and recent transactions for a user.
 */
export const getWalletData = async (userId: string) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          bet: {
            include: {
              match: { include: { team1: true, team2: true } },
            },
          },
        },
      },
    },
  });

  if (!wallet) throw new Error('Wallet not found');
  return wallet;
};
