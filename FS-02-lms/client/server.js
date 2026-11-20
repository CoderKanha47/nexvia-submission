/* eslint-env node */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4001;
const DIST_DIR = path.join(__dirname, 'dist');
const API_TARGET = 'http://localhost:4000';

// Global logging middleware
app.use((req, res, next) => {
  console.log('[Global]', req.method, req.originalUrl, req.url, req.path);
  res.setHeader('X-Frontend-Server', 'true');
  next();
});

// Serve static files
app.use(express.static(DIST_DIR));

// Parse JSON for all routes
app.use(express.json());

// Custom proxy for API requests
app.use('/api', async (req, res, next) => {
  console.log('[Proxy] req.originalUrl:', req.originalUrl);
  console.log('[Proxy] req.url:', req.url);
  console.log('[Proxy] req.path:', req.path);
  try {
    const backendUrl = `${API_TARGET}${req.originalUrl}`;
    console.log('[Proxy] Backend URL:', backendUrl);
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    const data = await response.text();
    res.send(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(502).json({ error: { code: 'BAD_GATEWAY', message: 'Proxy error' } });
  }
});

// SPA fallback - serve index.html for all non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  } else {
    next();
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on http://0.0.0.0:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});