#!/usr/bin/env node

/**
 * Simple server entry point for Helios TypeScript
 */

import express, { Express } from 'express';
import cors from 'cors';
import { ConfigService } from 'helios-ts';

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

// Subject API endpoints
app.get('/api/subjects', async (_req, res) => {
  try {
    const subjects = await ConfigService.loadAllSubjects();
    res.json(subjects);
  } catch (error) {
    console.error('Failed to load subjects:', error);
    res.status(500).json({ error: 'Failed to load subjects' });
  }
});

app.get('/api/subjects/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    if (category !== 'Macro' && category !== 'Micro') {
      return res.status(400).json({ error: 'Invalid category. Must be Macro or Micro' });
    }
    const subjects = await ConfigService.getSubjectsByCategory(category);
    res.json(subjects);
  } catch (error) {
    console.error('Failed to load subjects by category:', error);
    res.status(500).json({ error: 'Failed to load subjects by category' });
  }
});

app.get('/api/subjects/exam-focus/:examFocus', async (req, res) => {
  try {
    const { examFocus } = req.params;
    if (!['PrelimsOnly', 'MainsOnly', 'BothExams'].includes(examFocus)) {
      return res.status(400).json({ error: 'Invalid exam focus' });
    }
    const subjects = await ConfigService.getSubjectsByExamFocus(examFocus as any);
    res.json(subjects);
  } catch (error) {
    console.error('Failed to load subjects by exam focus:', error);
    res.status(500).json({ error: 'Failed to load subjects by exam focus' });
  }
});

app.get('/api/subjects/:subjectCode', async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const subject = await ConfigService.getSubjectByCode(subjectCode);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(subject);
  } catch (error) {
    console.error('Failed to load subject:', error);
    res.status(500).json({ error: 'Failed to load subject' });
  }
});

app.get('/api/health/data-source', async (_req, res) => {
  try {
    const health = await ConfigService.getHealthStatus();
    res.json(health);
  } catch (error) {
    console.error('Failed to get health status:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Helios-TS server is ready on port ${PORT}`);
  console.log(`🔗 API endpoints:`);
  console.log(`   GET  /status - Server status`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /echo - Echo test`);
  console.log(`   GET  /api/subjects - Load all subjects`);
  console.log(`   GET  /api/subjects/category/:category - Load subjects by category`);
  console.log(`   GET  /api/subjects/exam-focus/:examFocus - Load subjects by exam focus`);
  console.log(`   GET  /api/subjects/:subjectCode - Load specific subject`);
  console.log(`   GET  /api/health/data-source - Check data source health`);
});

export default app;
