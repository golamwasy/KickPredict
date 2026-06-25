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

    return newBalance;
  };

  return txClient ? execute(txClient) : prisma.$transaction(execute);
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
