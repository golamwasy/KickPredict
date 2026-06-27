import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// GET /api/settings - Fetch all system settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    // Convert array to a key-value object map
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
    
    res.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings - Update a system setting (Admin only)
router.put('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });

    res.json(updatedSetting);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
