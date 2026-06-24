import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middlewares/auth';
import prisma from '../prisma';

const router = Router();

// Secure all admin routes
router.use(authenticate, requireAdmin);

// Get dashboard summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalPredictions = await prisma.prediction.count({ where: { skipped: false } });
    const recentSyncLogs = await prisma.apiSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      totalUsers,
      totalPredictions,
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
        createdAt: true
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

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger point recalculation
import { calculatePointsForMatch } from '../services/scoring';
router.post('/recalculate-points', async (req: AuthRequest, res: Response) => {
  try {
    const finishedMatches = await prisma.match.findMany({
      where: { status: 'FINISHED' }
    });

    for (const match of finishedMatches) {
      await calculatePointsForMatch(match.id);
    }

    res.json({ message: `Recalculated points for ${finishedMatches.length} matches` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to recalculate points' });
  }
});

export default router;
