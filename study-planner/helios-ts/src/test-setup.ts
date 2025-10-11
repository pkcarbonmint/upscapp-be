/**
 * Test setup file for Vitest
 * Ensures resource files are accessible during testing
 */

import { beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

beforeAll(async () => {
  // Set up environment for testing with resource files
  
  // Ensure we're in the project root for resource access
  const projectRoot = path.resolve(process.cwd());
  console.log(`🧪 Test environment setup - working directory: ${projectRoot}`);
  
  // Check if resource files exist
  const resourcesPath = path.join(projectRoot, 'resources');
  const studyMaterialsPath = path.join(resourcesPath, 'study-materials.json');
  
  try {
    await fs.promises.access(studyMaterialsPath);
    console.log('✅ Study materials file is accessible in test environment');
  } catch (error) {
    console.warn('⚠️ Study materials file not found in test environment:', resourcesPath);
    console.log('   This may be expected if resources haven\'t been created yet');
  }
});
