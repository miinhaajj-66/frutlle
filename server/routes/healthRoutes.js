import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// @desc    Health check & downstream dependency status
// @route   GET /api/health
// @access  Public
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatency = null;
  let dbError = null;

  try {
    const { error } = await supabase.from('products').select('id', { head: true, count: 'exact' });
    dbLatency = `${Date.now() - startTime}ms`;
    if (error) {
      dbStatus = 'degraded';
      dbError = error.message;
    }
  } catch (err) {
    dbStatus = 'unreachable';
    dbError = err.message;
  }

  const overallStatus = dbStatus === 'healthy' ? 'ok' : 'degraded';
  const statusCode = dbStatus === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    services: {
      api: 'healthy',
      database: {
        status: dbStatus,
        provider: 'supabase',
        latency: dbLatency,
        ...(dbError ? { error: dbError } : {})
      }
    }
  });
});

export default router;
