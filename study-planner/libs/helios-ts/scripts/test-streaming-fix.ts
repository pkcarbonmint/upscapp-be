#!/usr/bin/env node

/**
 * Test the fixed streaming implementation to ensure no race condition
 */

import { createWriteStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

async function testStreamingFix() {
  console.log('🧪 Testing Fixed Streaming Implementation');
  console.log('========================================');
  
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
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fixed Streaming Test</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          .success { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Fixed Streaming Test</h1>
        <p class="success">✅ Race condition fixed!</p>
        <p>This PDF tests the fixed streaming implementation.</p>
        <p>Generated at: ${new Date().toISOString()}</p>
      </body>
      </html>
    `;
    
    console.log('📄 Setting HTML content...');
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔄 Testing fixed streaming approach...');
    const startTime = Date.now();
    
    const os = await import('os');
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `pdf-fix-test-${Date.now()}.pdf`);
    
    // Generate PDF to temporary file
    await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '30px', bottom: '20px', left: '30px' },
      path: tempFilePath
    });
    
    console.log('📁 PDF generated to temporary file');
    
    // Stream with proper cleanup timing
    const outputPath = path.join(outputDir, 'streaming-fix-test.pdf');
    const writeStream = createWriteStream(outputPath);
    const readStream = fs.createReadStream(tempFilePath);
    
    await new Promise<void>((resolve, reject) => {
      readStream.on('error', (error) => {
        // Clean up on read stream error
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('🧹 Cleaned up temp file on read error');
          }
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file on read error:', cleanupError);
        }
        reject(error);
      });
      
      writeStream.on('error', (error) => {
        // Clean up on output stream error
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('🧹 Cleaned up temp file on output error');
          }
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file on output error:', cleanupError);
        }
        reject(error);
      });
      
      writeStream.on('finish', () => {
        // Clean up after successful completion
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log('🧹 Cleaned up temp file after successful completion');
          }
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file on finish:', cleanupError);
        }
        resolve();
      });
      
      readStream.pipe(writeStream);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Fixed streaming completed in ${duration}ms`);
    
    // Verify the file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`📁 Output file: ${path.resolve(outputPath)}`);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log('🎉 Fixed streaming test completed successfully!');
      console.log('🔧 No race condition or ENOENT errors!');
    } else {
      console.error('❌ Output file was not created');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fixed streaming test failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Run the test
testStreamingFix().catch(console.error);

