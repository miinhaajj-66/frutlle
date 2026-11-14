import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import adminNotificationRoutes from './routes/adminNotificationRoutes.js';
import { razorpayWebhook } from './controllers/orderController.js';
import { getRazorpayDiagnostics } from './config/razorpay.js';

// Startup validation for required configuration
const requiredEnv = ['SUPABASE_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
  missingEnv.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
}

if (missingEnv.length > 0) {
  console.error(`[FATAL CONFIG] Missing required environment variable(s): ${missingEnv.join(', ')}`);
  console.error('[FATAL CONFIG] Ensure your .env file is populated with valid configuration.');
}

// Non-blocking diagnostic check for downstream database host
if (process.env.SUPABASE_URL) {
  try {
    const parsedUrl = new URL(process.env.SUPABASE_URL);
    import('dns').then(({ default: dns }) => {
      dns.lookup(parsedUrl.hostname, (err) => {
        if (err && err.code === 'ENOTFOUND') {
          console.warn(`[DATABASE NOTICE] Supabase host "${parsedUrl.hostname}" could not be resolved (ENOTFOUND). If using Supabase Free Tier, the project may be paused. Resume the project in the Supabase Dashboard (https://supabase.com/dashboard).`);
        } else if (!err) {
          console.log(`[DATABASE] Supabase host "${parsedUrl.hostname}" resolved successfully.`);
        }
      });
    }).catch(() => {});
  } catch {}
}

// Razorpay configuration check (safe diagnostic: never log secret or key values)
const razorpayDiag = getRazorpayDiagnostics();
if (razorpayDiag.isConfigured) {
  const isTestMode = (process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_');
  console.log(`[PAYMENT] Razorpay initialized (Mode: ${isTestMode ? 'TEST' : 'LIVE'})`);
} else {
  console.warn(`[PAYMENT] Razorpay credentials not configured: RAZORPAY_KEY_ID (present: ${razorpayDiag.keyIdPresent}, non-empty: ${razorpayDiag.keyIdNonEmpty}), RAZORPAY_KEY_SECRET (present: ${razorpayDiag.keySecretPresent}, non-empty: ${razorpayDiag.keySecretNonEmpty})`);
}

const app = express();

// Trust proxy headers from Vercel / Render / Cloudflare
app.set('trust proxy', 1);

// Prevent edge caches / CDNs from caching dynamic authenticated API endpoints or cookies
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const allowedOrigins = [
  'https://frutlle.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, '') : null
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');
    const isAllowed = allowedOrigins.includes(origin) ||
                      allowedOrigins.includes(normalizedOrigin) ||
                      /^https:\/\/frutlle(-[a-z0-9]+)*\.vercel\.app$/.test(normalizedOrigin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

// Preserve rawBody buffer for Razorpay webhook signature verification
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);

// Additional webhook route alias for Razorpay dashboard configuration convenience
app.post('/api/webhook/razorpay', razorpayWebhook);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[SERVER] Health check available at: http://127.0.0.1:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${PORT} is already in use by another running process.`);
    console.error(`[FATAL] Please stop any process using port ${PORT} before starting.`);
  } else {
    console.error(`[FATAL] Server failed to start:`, err);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
