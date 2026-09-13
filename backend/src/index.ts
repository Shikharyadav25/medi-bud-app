import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { aiRouter } from './routes/aiRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';
import { careRouter } from './routes/careRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors({ origin: env.ALLOWED_ORIGINS }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'MEDI BUD Backend Service',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
  });
});

// Mount Routes
app.use('/api/ai', aiRouter);
app.use('/api/reports', reportRouter);
app.use('/api/care', careRouter);

app.use(errorHandler);

const port = parseInt(env.PORT, 10) || 5001;
app.listen(port, () => {
  console.log(`[MEDI BUD] Backend server listening on port ${port}`);
  console.log(`[MEDI BUD] Gemini API: ${env.GEMINI_API_KEY ? 'Configured (Live Mode)' : 'Unset (Zero-Config Intelligent Fallback Mode)'}`);
});
