import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { sendVerificationEmail } from '../services/email';

const router = Router();

// Signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { fullName, email, username, password } = req.body;

    // Validate existence
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) return res.status(400).json({ error: 'Username already in use' });

    const existingFullName = await prisma.user.findUnique({ where: { fullName } });
    if (existingFullName) return res.status(400).json({ error: 'Full name already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Upsert PendingRegistration (if they try to signup again before verifying)
    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        fullName,
        username,
        passwordHash,
        code,
        expiresAt,
      },
      create: {
        fullName,
        email,
        username,
        passwordHash,
        code,
        expiresAt,
      },
    });

    // Send verification email in the background to prevent slow SMTP/network timeouts from blocking the signup response
    sendVerificationEmail(email, code).catch((err) => {
      console.error('[Email Error] Background email send failed:', err);
    });

    res.status(201).json({ message: 'Registration initiated. Please check your email for the verification code.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Email
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) return res.status(404).json({ error: 'No pending registration found for this email' });

    const masterCode = process.env.MASTER_VERIFICATION_CODE;
    const isMasterCode = masterCode && code === masterCode;

    if (pending.code !== code && !isMasterCode) return res.status(400).json({ error: 'Invalid code' });
    if (pending.expiresAt < new Date() && !isMasterCode) return res.status(400).json({ error: 'Code expired' });

    // Create the permanent User
    await prisma.user.create({
      data: {
        fullName: pending.fullName,
        email: pending.email,
        username: pending.username,
        passwordHash: pending.passwordHash,
      },
    });

    // Clean up pending registration
    await prisma.pendingRegistration.delete({ where: { email } });

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (!user.isActive) return res.status(403).json({ error: 'Your account has been disabled by an administrator' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
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
