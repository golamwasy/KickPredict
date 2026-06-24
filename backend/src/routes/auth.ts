import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import prisma from '../prisma';
import { sendVerificationEmail } from '../services/email';
import { createWalletForUser } from '../services/wallet';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup
router.post('/signup', authLimiter, async (req: Request, res: Response) => {
  try {
    const { fullName, email, username, password } = req.body;

    // Server-side validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 50) {
      return res.status(400).json({ error: 'Full name must be between 2 and 50 characters' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (!username || typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 30 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–30 characters and alphanumeric (letters, numbers, underscores)' });
    }
    if (!password || typeof password !== 'string' || password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const cleanFullName = fullName.trim();

    // Validate existence in User table
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

    const existingUsername = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existingUsername) return res.status(400).json({ error: 'Username already in use' });

    const existingFullName = await prisma.user.findUnique({ where: { fullName: cleanFullName } });
    if (existingFullName) return res.status(400).json({ error: 'Full name already in use' });

    // Validate existence in PendingRegistration table for a different email to prevent DB unique index crash
    const pendingWithUsername = await prisma.pendingRegistration.findFirst({
      where: {
        username: cleanUsername,
        email: { not: normalizedEmail }
      }
    });
    if (pendingWithUsername) {
      return res.status(400).json({ error: 'Username is already taken by a pending registration' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Secure verification code generation using cryptographically secure PRNG
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Upsert PendingRegistration (if they try to signup again before verifying)
    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      update: {
        fullName: cleanFullName,
        username: cleanUsername,
        passwordHash,
        code,
        expiresAt,
      },
      create: {
        fullName: cleanFullName,
        email: normalizedEmail,
        username: cleanUsername,
        passwordHash,
        code,
        expiresAt,
      },
    });

    // Send verification email in the background to prevent slow SMTP/network timeouts from blocking the signup response
    sendVerificationEmail(normalizedEmail, code).catch((err) => {
      console.error('[Email Error] Background email send failed:', err);
    });

    res.status(201).json({ message: 'Registration initiated. Please check your email for the verification code.' });
  } catch (error) {
    console.error('[Signup Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Email
router.post('/verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    const pending = await prisma.pendingRegistration.findUnique({ where: { email: normalizedEmail } });
    if (!pending) return res.status(404).json({ error: 'No pending registration found for this email' });

    const masterCode = process.env.MASTER_VERIFICATION_CODE;
    const isMasterCode = masterCode && code === masterCode;

    if (pending.code !== code && !isMasterCode) return res.status(400).json({ error: 'Invalid code' });
    if (pending.expiresAt < new Date() && !isMasterCode) return res.status(400).json({ error: 'Code expired' });

    // Create the permanent User with collision handling
    try {
      const user = await prisma.user.create({
        data: {
          fullName: pending.fullName,
          email: pending.email,
          username: pending.username,
          passwordHash: pending.passwordHash,
        },
      });

      // Create wallet with 10,000 KickCoins signup bonus
      await createWalletForUser(user.id);
    } catch (e: any) {
      if (e.code === 'P2002') {
        return res.status(400).json({ error: 'Username or email has already been registered and verified by someone else' });
      }
      throw e;
    }

    // Clean up pending registration
    await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } });

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('[Verification Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body; // 'email' is the input identifier (email or username)
    const identifier = (email || '').trim();

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Config Error] JWT_SECRET is not configured in environment variables');
      return res.status(500).json({ error: 'Internal server configuration error' });
    }

    // Lookup user by either email (case-insensitive) or username (exact)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      }
    });

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ error: 'Your account has been disabled by an administrator' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User
import { authenticate, AuthRequest } from '../middlewares/auth';
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, fullName: true, username: true, email: true, role: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
