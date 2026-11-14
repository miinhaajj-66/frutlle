import express from 'express';
import dns from 'dns';
import supabase from '../config/supabase.js';

const router = express.Router();

const withTimeout = (promise, ms = 4000) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

// @desc    Health check & downstream dependency status
// @route   GET /api/health
// @access  Public
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatency = null;
  let dbError = null;

  try {
    const { error } = await withTimeout(
      supabase.from('products').select('id', { head: true, count: 'exact' }),
      4000
    );
    dbLatency = `${Date.now() - startTime}ms`;
    if (error) {
      dbStatus = 'degraded';
      dbError = error.message;
    }
  } catch (err) {
    dbLatency = `${Date.now() - startTime}ms`;
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

// @desc    Dedicated Authentication Service Health Check
// @route   GET /api/health/auth
// @access  Public
router.get('/auth', async (req, res) => {
  const startTime = Date.now();
  let authStatus = 'healthy';
  let latency = null;
  let diagnostic = null;
  let dnsResolved = false;

  const supabaseUrl = process.env.SUPABASE_URL || '';
  let host = '';
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    host = 'unknown';
  }

  // Check DNS resolution
  if (host && host !== 'unknown') {
    try {
      await new Promise((resolve, reject) => {
        dns.lookup(host, (err, address) => {
          if (err) return reject(err);
          dnsResolved = true;
          resolve(address);
        });
      });
    } catch (dnsErr) {
      dnsResolved = false;
    }
  }

  try {
    const { error } = await withTimeout(
      supabase.from('users').select('id', { head: true, count: 'exact' }),
      4000
    );
    latency = `${Date.now() - startTime}ms`;
    if (error) {
      authStatus = 'degraded';
      diagnostic = error.message;
    }
  } catch (err) {
    latency = `${Date.now() - startTime}ms`;
    authStatus = 'unreachable';
    diagnostic = err.message;
  }

  const statusCode = authStatus === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    status: authStatus,
    timestamp: new Date().toISOString(),
    authService: {
      provider: 'supabase',
      databaseReachable: authStatus === 'healthy',
      dnsResolvable: dnsResolved,
      latency,
      host: host ? `${host.slice(0, 4)}***${host.slice(-12)}` : 'unconfigured',
      ...(authStatus !== 'healthy' ? {
        hint: dnsResolved 
          ? 'Database service returned an error. Check Supabase table permissions and RLS.' 
          : 'Host DNS resolution failed. If using Supabase Free Tier, the project may be paused. Resume the project in the Supabase Dashboard.'
      } : {})
    }
  });
});

export default router;
