#!/usr/bin/env node

/**
 * Direct test of PDF streaming functionality
 * This test bypasses the complex type requirements and focuses on the core streaming functionality
 */

import { createWriteStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

async function testDirectPDFStreaming() {
  console.log('🧪 Testing Direct PDF Streaming');
  console.log('===============================');
  
  let browser = null;
  
  try {
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'generated-docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('🚀 Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    
    // Create simple HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Streaming Test PDF</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
          }
          h1 { color: #333; border-bottom: 2px solid #333; }
          .test-section { margin: 20px 0; padding: 15px; background: #f5f5f5; }
          .success { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>PDF Streaming Test</h1>
        <div class="test-section">
          <h2>Test Results</h2>
          <p class="success">✅ Streaming implementation working!</p>
          <p>This PDF was generated using the streaming method to avoid TargetCloseError.</p>
          <p>Generated at: ${new Date().toISOString()}</p>
        </div>
        <div class="test-section">
          <h2>Technical Details</h2>
          <ul>
            <li>Uses temporary file approach</li>
            <li>Avoids loading entire PDF into memory</li>
            <li>Proper browser cleanup</li>
            <li>Streams directly to output</li>
          </ul>
        </div>
      </body>
      </html>
    `;
    
    console.log('📄 Setting HTML content...');
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the streaming approach using temporary file
    console.log('🔄 Testing streaming PDF generation...');
    const startTime = Date.now();
    
    const os = await import('os');
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `pdf-streaming-test-${Date.now()}.pdf`);
    
    try {
      // Generate PDF directly to temporary file (this avoids memory issues)
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '30px', bottom: '20px', left: '30px' },
        path: tempFilePath // This writes directly to file, avoiding memory
      });
      
      console.log('📁 PDF generated to temporary file');
      
      // Now stream the temporary file to our output
      const outputPath = path.join(outputDir, 'streaming-test.pdf');
      const writeStream = createWriteStream(outputPath);
      const readStream = fs.createReadStream(tempFilePath);
      
      await new Promise<void>((resolve, reject) => {
        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        
        readStream.pipe(writeStream);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Streaming completed in ${duration}ms`);
      
      // Verify the file was created
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`📁 Output file: ${path.resolve(outputPath)}`);
        console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log('🎉 Streaming test completed successfully!');
        console.log('🔧 No TargetCloseError occurred!');
      } else {
        console.error('❌ Output file was not created');
        process.exit(1);
      }
      
    } finally {
      // Clean up temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log('🧹 Temporary file cleaned up');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
      }
    }
    
  } catch (error) {
    console.error('❌ Streaming test failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Run the test
testDirectPDFStreaming().catch(console.error);

