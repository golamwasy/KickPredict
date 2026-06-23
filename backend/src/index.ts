import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import predictionRoutes from './routes/predictions';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import { startCronJobs } from './services/cron';
import { syncESPNData } from './services/espnSync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  startCronJobs();

  // Run initial sync on startup to populate matches immediately
  try {
    console.log('[Startup] Running initial ESPN sync...');
    await syncESPNData();
    console.log('[Startup] Initial ESPN sync completed successfully');
  } catch (error) {
    console.error('[Startup] Initial ESPN sync failed:', error);
  }
});
