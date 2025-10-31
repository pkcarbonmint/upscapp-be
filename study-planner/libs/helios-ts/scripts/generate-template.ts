#!/usr/bin/env node

/**
 * Generate base template for template-based DOCX generation
 * 
 * This script creates a styled Word template document that can be used
 * with TemplateCalendarDocxService for customizable document generation.
 */

import { CalendarDocxService } from '../src/services/CalendarDocxService';
import * as path from 'path';
import * as fs from 'fs';

async function generateTemplate() {
  console.log('🎨 Generating base template for template-based DOCX generation...');
  
  try {
    // Ensure templates directory exists
    const templatesDir = path.join(__dirname, '../src/templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      console.log(`✅ Created templates directory: ${templatesDir}`);
    }
    
    // Generate styled template using existing service
    await CalendarDocxService.generateStyledTemplate();
    
    // Move the generated template to the templates directory
    const generatedPath = path.join(process.cwd(), 'generated-docs', 'study-plan-template.docx');
    const targetPath = path.join(templatesDir, 'study-plan-template.docx');
    
    if (fs.existsSync(generatedPath)) {
      fs.copyFileSync(generatedPath, targetPath);
      console.log(`✅ Template copied to: ${targetPath}`);
      console.log(`📁 Template location: ${path.resolve(targetPath)}`);
    } else {
      console.error(`❌ Generated template not found at: ${generatedPath}`);
      process.exit(1);
    }
    
    console.log('\n✨ Template generation complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Open the template in Microsoft Word');
    console.log('2. Customize styles, colors, and formatting as desired');
    console.log('3. Save the template (the template system will use it automatically)');
    console.log('\n💡 Tip: The template uses docxtemplater syntax for dynamic content');
    
  } catch (error) {
    console.error('❌ Failed to generate template:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  generateTemplate();
}

export { generateTemplate };
