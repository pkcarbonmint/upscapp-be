#!/usr/bin/env node

/**
 * Simple server entry point for Helios TypeScript
 */

import express, { Express } from 'express';
import cors from 'cors';

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Simple endpoints
app.get('/status', (_req, res) => {
  res.json({ message: 'Server is live!' });
});

app.get('/health', (_req, res) => {
  res.json({ message: 'healthy' });
});

app.post('/echo', (req, res) => {
  const { content } = req.body;
  res.json({ content: `You said: ${content}` });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Helios-TS server is ready on port ${PORT}`);
  console.log(`🔗 API endpoints:`);
  console.log(`   GET  /status - Server status`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /echo - Echo test`);
});

export default app;
