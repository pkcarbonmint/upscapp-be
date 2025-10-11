import express, { Express } from 'express';
import cors from 'cors';
import { 
  generateInitialPlan,
  selectBestArchetype,
  transformUIToStudentIntake,
  reviewPlan,
  handleConversation,
  DEFAULT_CONFIG,
  makeLogger,
  type Status,
  type PlanGenerationResponse,
  type PlanReviewRequest,
  type UIWizardData,
  type PlanReviewResult,
  type BotRequest,
  type BotResponse,
  type Logger
} from 'helios-ts';
import path from 'path';
import fs from 'fs';
import { DocumentService } from 'helios-ts';
import { 
  Packer, 
  Document, 
  Paragraph, 
  HeadingLevel, 
  Table, 
  WidthType, 
  TableRow, 
  TableCell, 
  TextRun 
} from 'docx';

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logger implementation
const logger: Logger = makeLogger();
// API Routes

// Root endpoint - serve index.html
app.get('/', async (_req, res) => {
  try {
    const indexPath = path.join(__dirname, '../../public/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Helios-TS Server</title></head>
        <body>
          <h1>Helios-TS Server</h1>
          <p>Server is running successfully!</p>
          <p>API endpoints available:</p>
          <ul>
            <li>GET /status - Server status</li>
            <li>GET /health - Health check</li>
            <li>POST /echo - Echo test</li>
            <li>POST /plan/generate - Generate study plan</li>
            <li>POST /plan/review - Review study plan</li>
            <li>POST /bot/conversation - Telegram bot conversation</li>
          </ul>
        </body>
        </html>
      `);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve root page' });
  }
});

// Status endpoint
app.get('/status', (_req, res) => {
  const status: Status = { message: 'Server is live!' };
  res.json(status);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  const status: Status = { message: 'healthy' };
  res.json(status);
});

// Echo endpoint for testing
app.post('/echo', (req, res) => {
  const { content } = req.body;
  res.json({ content: `You said: ${content}` });
});

// Plan generation endpoint
app.post('/plan/generate', async (req, res) => {
  try {
    const wizardData: UIWizardData = req.body;
    
    // Transform UI wizard data to StudentIntake
    const intake = transformUIToStudentIntake(wizardData);
    
    // Select best archetype based on transformed data
    const selectedArchetype = await selectBestArchetype(intake);
    
    // Generate plan using target year-aware logic
    const userId = 'user123'; // In a real app, this would come from authentication
    const result = await generateInitialPlan(userId, DEFAULT_CONFIG, selectedArchetype, intake, logger);
    
    const response: PlanGenerationResponse = {
      generatedPlan: result.plan,
      executionLogs: logger.getLogs()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate plan', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Plan review endpoint
app.post('/plan/review', async (req, res) => {
  try {
    const { plan, student_intake }: PlanReviewRequest = req.body;
    
    const userId = 'user123'; // In a real app, this would come from authentication
    const reviewResult: PlanReviewResult = await reviewPlan(userId, DEFAULT_CONFIG, plan, student_intake);
    
    res.json(reviewResult);
  } catch (error) {
    console.error('Plan review error:', error);
    res.status(500).json({ 
      error: 'Failed to review plan', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Telegram bot conversation endpoint
app.post('/bot/conversation', async (req, res) => {
  try {
    const botRequest: BotRequest = req.body;
    const botResponse: BotResponse = await handleConversation(botRequest);
    res.json(botResponse);
  } catch (error) {
    console.error('Bot conversation error:', error);
    res.status(500).json({ 
      error: 'Failed to handle bot conversation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Document download endpoint
app.post('/plan/download/docx', async (req, res) => {
  try {
    const { plan, studentIntake, filename } = req.body;
    
    if (!plan || !studentIntake) {
      return res.status(400).json({ 
        error: 'Missing required fields: plan and studentIntake are required' 
      });
    }
    
    // Generate document using DocumentService
    const document = await DocumentService.generateDocument(null, plan, studentIntake);
    
    // Convert document to buffer
    const buffer = await Packer.toBuffer(document);
    
    // Set response headers for file download
    const downloadFilename = filename || `study-plan-${plan.study_plan_id || 'unknown'}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Stream the buffer to response
    res.send(buffer);
    
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ 
      error: 'Failed to generate document', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// DOCX export endpoint
app.post('/plan/export/docx', async (req, res) => {
  try {
    const { studyPlan } = req.body;
    
    if (!studyPlan) {
      return res.status(400).json({ error: 'Study plan data is required' });
    }

    // Build all document content
    const documentChildren = [
      // Title
      new Paragraph({
        text: studyPlan.plan_title || 'Study Plan',
        heading: HeadingLevel.TITLE,
        alignment: 'center',
      }),
      
      // Basic Information
      new Paragraph({
        text: 'Plan Overview',
        heading: HeadingLevel.HEADING_1,
      }),
      
      // Information table
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('User ID:')] }),
              new TableCell({ children: [new Paragraph(studyPlan.user_id || 'N/A')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Target Year:')] }),
              new TableCell({ children: [new Paragraph(studyPlan.created_for_target_year || 'N/A')] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Generation Date:')] }),
              new TableCell({ children: [new Paragraph(new Date().toLocaleDateString())] }),
            ],
          }),
        ],
      }),
      
      // Cycles section
      new Paragraph({
        text: 'Study Plan by Cycles',
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    // Add cycles and blocks
    if (studyPlan.cycles && Array.isArray(studyPlan.cycles)) {
      for (const cycle of studyPlan.cycles) {
        // Cycle heading
        documentChildren.push(
          new Paragraph({
            text: `${cycle.cycleName || 'Unnamed Cycle'} (${cycle.cycleType || 'StudyCycle'})`,
            heading: HeadingLevel.HEADING_2,
          })
        );

        // Add blocks for this cycle
        if (cycle.cycleBlocks && Array.isArray(cycle.cycleBlocks)) {
          for (const block of cycle.cycleBlocks) {
            documentChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: 'Block: ', bold: true }),
                  new TextRun({ text: block.block_title || 'Untitled Block' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Duration: ', bold: true }),
                  new TextRun({ text: `${block.duration_weeks || 0} weeks` }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Subjects: ', bold: true }),
                  new TextRun({ text: Array.isArray(block.subjects) ? block.subjects.join(', ') : 'No subjects' }),
                ],
              }),
              new Paragraph({ text: '' }) // Empty line for spacing
            );
          }
        }
      }
    }

    // Create DOCX document with all content
    const doc = new Document({
      sections: [{
        properties: {},
        children: documentChildren,
      }],
    });

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="study-plan-${studyPlan.study_plan_id || 'export'}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.send(buffer);
    
  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({ 
      error: 'Failed to generate DOCX document', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Error handling middleware
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: error.message 
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Helios-TS server is ready on port ${PORT}`);
  console.log(`📁 Serving static files from: public`);
  console.log(`🔗 API endpoints:`);
  console.log(`   GET  /status - Server status`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /echo - Echo test`);
  console.log(`   POST /plan/generate - Generate study plan`);
  console.log(`   POST /plan/review - Review study plan`);
  console.log(`   POST /plan/export/docx - Export study plan as DOCX`);
  console.log(`   POST /bot/conversation - Telegram bot conversation`);
});

export { app };
export default app;
