#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

interface CycleData {
  cycleId: string;
  cycleType: string;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  cycleDuration: number;
  cycleIntensity: string;
  cycleDescription: string;
  blocks: BlockData[];
}

interface BlockData {
  blockId: string;
  blockName: string;
  blockStartDate: string;
  blockEndDate: string;
  blockDescription: string;
  subjectCode: string;
  subjectName: string;
}

interface ComparisonResult {
  file: string;
  branch1: string;
  branch2: string;
  cycleDifferences: CycleDifference[];
  blockDifferences: BlockDifference[];
  summary: {
    totalCycles: { branch1: number; branch2: number };
    totalBlocks: { branch1: number; branch2: number };
    dateChanges: number;
    structuralChanges: number;
  };
}

interface CycleDifference {
  cycleId: string;
  cycleType: string;
  type: 'added' | 'removed' | 'modified';
  changes: {
    field: string;
    branch1Value: any;
    branch2Value: any;
  }[];
}

interface BlockDifference {
  blockId: string;
  blockName: string;
  cycleType: string;
  type: 'added' | 'removed' | 'modified';
  changes: {
    field: string;
    branch1Value: any;
    branch2Value: any;
  }[];
}

class CycleDateComparator {
  private tempDir: string;
  private branch1Dir: string;
  private branch2Dir: string;

  constructor() {
    this.tempDir = join(process.cwd(), 'temp-comparison');
    this.branch1Dir = join(this.tempDir, 'branch1');
    this.branch2Dir = join(this.tempDir, 'branch2');
  }

  async compareBranches(branch1: string, branch2: string): Promise<ComparisonResult[]> {
    console.log(`🔍 Comparing cycles and blocks between branches: ${branch1} vs ${branch2}`);
    
    // Setup temporary directories
    this.setupTempDirectories();
    
    try {
      // Generate docs for both branches
      await this.generateDocsForBranch(branch1, this.branch1Dir);
      await this.generateDocsForBranch(branch2, this.branch2Dir);
      
      // Compare the generated files
      const results = await this.compareGeneratedFiles(branch1, branch2);
      
      // Generate report
      this.generateReport(results, branch1, branch2);
      
      return results;
    } finally {
      // Cleanup
      this.cleanup();
    }
  }

  private setupTempDirectories(): void {
    if (existsSync(this.tempDir)) {
      execSync(`rm -rf "${this.tempDir}"`);
    }
    mkdirSync(this.tempDir, { recursive: true });
    mkdirSync(this.branch1Dir, { recursive: true });
    mkdirSync(this.branch2Dir, { recursive: true });
  }

  private async generateDocsForBranch(branch: string, outputDir: string): Promise<void> {
    console.log(`📦 Generating docs for branch: ${branch}`);
    
    // Checkout branch
    execSync(`git checkout ${branch}`, { stdio: 'inherit' });
    
    // Install dependencies if needed
    if (!existsSync('node_modules')) {
      console.log('📦 Installing dependencies...');
      execSync('pnpm install', { stdio: 'inherit' });
    }
    
    // Generate docs
    console.log('📄 Generating documentation...');
    const originalGeneratedDocs = join(process.cwd(), 'generated-docs');
    const tempGeneratedDocs = join(outputDir, 'generated-docs');
    
    // Run generate-docs command
    execSync('pnpm generate-docs', { stdio: 'inherit' });
    
    // Copy generated docs to temp directory
    if (existsSync(originalGeneratedDocs)) {
      execSync(`cp -r "${originalGeneratedDocs}" "${tempGeneratedDocs}"`);
    }
  }

  private async compareGeneratedFiles(branch1: string, branch2: string): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];
    
    const branch1DocsDir = join(this.branch1Dir, 'generated-docs');
    const branch2DocsDir = join(this.branch2Dir, 'generated-docs');
    
    if (!existsSync(branch1DocsDir) || !existsSync(branch2DocsDir)) {
      throw new Error('Generated docs directories not found');
    }
    
    // Get all .js files from both directories
    const branch1Files = this.getJsFiles(branch1DocsDir);
    const branch2Files = this.getJsFiles(branch2DocsDir);
    
    const allFiles = new Set([...branch1Files, ...branch2Files]);
    
    for (const fileName of allFiles) {
      const branch1File = join(branch1DocsDir, fileName);
      const branch2File = join(branch2DocsDir, fileName);
      
      const result: ComparisonResult = {
        file: fileName,
        branch1,
        branch2,
        cycleDifferences: [],
        blockDifferences: [],
        summary: {
          totalCycles: { branch1: 0, branch2: 0 },
          totalBlocks: { branch1: 0, branch2: 0 },
          dateChanges: 0,
          structuralChanges: 0
        }
      };
      
      if (existsSync(branch1File) && existsSync(branch2File)) {
        // Both files exist - compare them
        const branch1Data = this.parseJsFile(branch1File);
        const branch2Data = this.parseJsFile(branch2File);
        
        result.cycleDifferences = this.compareCycles(branch1Data.cycles, branch2Data.cycles);
        result.blockDifferences = this.compareBlocks(branch1Data.blocks, branch2Data.blocks);
        
        result.summary.totalCycles = {
          branch1: branch1Data.cycles.length,
          branch2: branch2Data.cycles.length
        };
        result.summary.totalBlocks = {
          branch1: branch1Data.blocks.length,
          branch2: branch2Data.blocks.length
        };
        
        result.summary.dateChanges = this.countDateChanges(result.cycleDifferences, result.blockDifferences);
        result.summary.structuralChanges = this.countStructuralChanges(result.cycleDifferences, result.blockDifferences);
        
      } else if (existsSync(branch1File)) {
        // File only exists in branch1
        const branch1Data = this.parseJsFile(branch1File);
        result.cycleDifferences = branch1Data.cycles.map(cycle => ({
          cycleId: cycle.cycleId,
          cycleType: cycle.cycleType,
          type: 'removed' as const,
          changes: []
        }));
        result.blockDifferences = branch1Data.blocks.map(block => ({
          blockId: block.blockId,
          blockName: block.blockName,
          cycleType: this.getCycleTypeForBlock(block.blockId, branch1Data.cycles),
          type: 'removed' as const,
          changes: []
        }));
        
      } else if (existsSync(branch2File)) {
        // File only exists in branch2
        const branch2Data = this.parseJsFile(branch2File);
        result.cycleDifferences = branch2Data.cycles.map(cycle => ({
          cycleId: cycle.cycleId,
          cycleType: cycle.cycleType,
          type: 'added' as const,
          changes: []
        }));
        result.blockDifferences = branch2Data.blocks.map(block => ({
          blockId: block.blockId,
          blockName: block.blockName,
          cycleType: this.getCycleTypeForBlock(block.blockId, branch2Data.cycles),
          type: 'added' as const,
          changes: []
        }));
      }
      
      results.push(result);
    }
    
    return results;
  }

  private getJsFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => file.endsWith('.js'));
  }

  private parseJsFile(filePath: string): { cycles: CycleData[]; blocks: BlockData[] } {
    const content = readFileSync(filePath, 'utf-8');
    
    // Extract the studyPlanData object
    const match = content.match(/window\.studyPlanData\s*=\s*({[\s\S]*});?\s*$/);
    if (!match) {
      throw new Error(`Could not parse studyPlanData from ${filePath}`);
    }
    
    try {
      const data = eval(`(${match[1]})`);
      const cycles: CycleData[] = data.cycles || [];
      const blocks: BlockData[] = [];
      
      // Extract blocks from cycles
      cycles.forEach(cycle => {
        if (cycle.blocks) {
          blocks.push(...cycle.blocks);
        }
      });
      
      return { cycles, blocks };
    } catch (error) {
      throw new Error(`Error parsing JSON from ${filePath}: ${error}`);
    }
  }

  private compareCycles(cycles1: CycleData[], cycles2: CycleData[]): CycleDifference[] {
    const differences: CycleDifference[] = [];
    const cycles1Map = new Map(cycles1.map(c => [c.cycleId, c]));
    const cycles2Map = new Map(cycles2.map(c => [c.cycleId, c]));
    
    // Find added cycles
    for (const [cycleId, cycle2] of cycles2Map) {
      if (!cycles1Map.has(cycleId)) {
        differences.push({
          cycleId,
          cycleType: cycle2.cycleType,
          type: 'added',
          changes: []
        });
      }
    }
    
    // Find removed cycles
    for (const [cycleId, cycle1] of cycles1Map) {
      if (!cycles2Map.has(cycleId)) {
        differences.push({
          cycleId,
          cycleType: cycle1.cycleType,
          type: 'removed',
          changes: []
        });
      }
    }
    
    // Find modified cycles
    for (const [cycleId, cycle1] of cycles1Map) {
      const cycle2 = cycles2Map.get(cycleId);
      if (cycle2) {
        const changes = this.compareCycleFields(cycle1, cycle2);
        if (changes.length > 0) {
          differences.push({
            cycleId,
            cycleType: cycle1.cycleType,
            type: 'modified',
            changes
          });
        }
      }
    }
    
    return differences;
  }

  private compareBlocks(blocks1: BlockData[], blocks2: BlockData[]): BlockDifference[] {
    const differences: BlockDifference[] = [];
    const blocks1Map = new Map(blocks1.map(b => [b.blockId, b]));
    const blocks2Map = new Map(blocks2.map(b => [b.blockId, b]));
    
    // Find added blocks
    for (const [blockId, block2] of blocks2Map) {
      if (!blocks1Map.has(blockId)) {
        differences.push({
          blockId,
          blockName: block2.blockName,
          cycleType: this.getCycleTypeForBlock(blockId, []),
          type: 'added',
          changes: []
        });
      }
    }
    
    // Find removed blocks
    for (const [blockId, block1] of blocks1Map) {
      if (!blocks2Map.has(blockId)) {
        differences.push({
          blockId,
          blockName: block1.blockName,
          cycleType: this.getCycleTypeForBlock(blockId, []),
          type: 'removed',
          changes: []
        });
      }
    }
    
    // Find modified blocks
    for (const [blockId, block1] of blocks1Map) {
      const block2 = blocks2Map.get(blockId);
      if (block2) {
        const changes = this.compareBlockFields(block1, block2);
        if (changes.length > 0) {
          differences.push({
            blockId,
            blockName: block1.blockName,
            cycleType: this.getCycleTypeForBlock(blockId, []),
            type: 'modified',
            changes
          });
        }
      }
    }
    
    return differences;
  }

  private compareCycleFields(cycle1: CycleData, cycle2: CycleData): { field: string; branch1Value: any; branch2Value: any }[] {
    const changes: { field: string; branch1Value: any; branch2Value: any }[] = [];
    const fieldsToCompare = ['cycleStartDate', 'cycleEndDate', 'cycleDuration', 'cycleIntensity', 'cycleName', 'cycleDescription'];
    
    for (const field of fieldsToCompare) {
      const value1 = (cycle1 as any)[field];
      const value2 = (cycle2 as any)[field];
      
      if (value1 !== value2) {
        changes.push({
          field,
          branch1Value: value1,
          branch2Value: value2
        });
      }
    }
    
    return changes;
  }

  private compareBlockFields(block1: BlockData, block2: BlockData): { field: string; branch1Value: any; branch2Value: any }[] {
    const changes: { field: string; branch1Value: any; branch2Value: any }[] = [];
    const fieldsToCompare = ['blockStartDate', 'blockEndDate', 'blockName', 'blockDescription', 'subjectCode', 'subjectName'];
    
    for (const field of fieldsToCompare) {
      const value1 = (block1 as any)[field];
      const value2 = (block2 as any)[field];
      
      if (value1 !== value2) {
        changes.push({
          field,
          branch1Value: value1,
          branch2Value: value2
        });
      }
    }
    
    return changes;
  }

  private getCycleTypeForBlock(blockId: string, cycles: CycleData[]): string {
    // Try to determine cycle type from block ID or find it in cycles
    for (const cycle of cycles) {
      if (cycle.blocks && cycle.blocks.some(block => block.blockId === blockId)) {
        return cycle.cycleType;
      }
    }
    
    // Fallback: extract from block ID
    const match = blockId.match(/^(c\d+)/i);
    return match ? match[1].toUpperCase() : 'Unknown';
  }

  private countDateChanges(cycleDifferences: CycleDifference[], blockDifferences: BlockDifference[]): number {
    let count = 0;
    
    for (const diff of cycleDifferences) {
      for (const change of diff.changes) {
        if (change.field.includes('Date')) {
          count++;
        }
      }
    }
    
    for (const diff of blockDifferences) {
      for (const change of diff.changes) {
        if (change.field.includes('Date')) {
          count++;
        }
      }
    }
    
    return count;
  }

  private countStructuralChanges(cycleDifferences: CycleDifference[], blockDifferences: BlockDifference[]): number {
    let count = 0;
    
    for (const diff of cycleDifferences) {
      if (diff.type === 'added' || diff.type === 'removed') {
        count++;
      }
    }
    
    for (const diff of blockDifferences) {
      if (diff.type === 'added' || diff.type === 'removed') {
        count++;
      }
    }
    
    return count;
  }

  private generateReport(results: ComparisonResult[], branch1: string, branch2: string): void {
    const reportPath = join(process.cwd(), `cycle-comparison-report-${Date.now()}.md`);
    let report = `# Cycle and Block Date Comparison Report\n\n`;
    report += `**Branches Compared:** ${branch1} vs ${branch2}\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // Summary
    const totalFiles = results.length;
    const filesWithChanges = results.filter(r => 
      r.cycleDifferences.length > 0 || r.blockDifferences.length > 0
    ).length;
    
    const totalDateChanges = results.reduce((sum, r) => sum + r.summary.dateChanges, 0);
    const totalStructuralChanges = results.reduce((sum, r) => sum + r.summary.structuralChanges, 0);
    
    report += `## Summary\n\n`;
    report += `- **Total Files Compared:** ${totalFiles}\n`;
    report += `- **Files with Changes:** ${filesWithChanges}\n`;
    report += `- **Total Date Changes:** ${totalDateChanges}\n`;
    report += `- **Total Structural Changes:** ${totalStructuralChanges}\n\n`;
    
    // Detailed results
    for (const result of results) {
      if (result.cycleDifferences.length === 0 && result.blockDifferences.length === 0) {
        continue;
      }
      
      report += `## File: ${result.file}\n\n`;
      
      if (result.cycleDifferences.length > 0) {
        report += `### Cycle Changes\n\n`;
        for (const diff of result.cycleDifferences) {
          report += `#### ${diff.cycleType} (${diff.type})\n`;
          report += `- **Cycle ID:** ${diff.cycleId}\n`;
          
          if (diff.changes.length > 0) {
            report += `- **Changes:**\n`;
            for (const change of diff.changes) {
              report += `  - ${change.field}: \`${change.branch1Value}\` → \`${change.branch2Value}\`\n`;
            }
          }
          report += `\n`;
        }
      }
      
      if (result.blockDifferences.length > 0) {
        report += `### Block Changes\n\n`;
        for (const diff of result.blockDifferences) {
          report += `#### ${diff.blockName} (${diff.type})\n`;
          report += `- **Block ID:** ${diff.blockId}\n`;
          report += `- **Cycle Type:** ${diff.cycleType}\n`;
          
          if (diff.changes.length > 0) {
            report += `- **Changes:**\n`;
            for (const change of diff.changes) {
              report += `  - ${change.field}: \`${change.branch1Value}\` → \`${change.branch2Value}\`\n`;
            }
          }
          report += `\n`;
        }
      }
      
      report += `---\n\n`;
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Report generated: ${reportPath}`);
  }

  private cleanup(): void {
    if (existsSync(this.tempDir)) {
    //   execSync(`rm -rf "${this.tempDir}"`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: tsx compare-cycle-dates.ts <branch1> <branch2>');
    console.log('Example: tsx compare-cycle-dates.ts main feature-branch');
    process.exit(1);
  }
  
  const [branch1, branch2] = args;
  
  try {
    const comparator = new CycleDateComparator();
    await comparator.compareBranches(branch1, branch2);
    console.log('✅ Comparison completed successfully!');
  } catch (error) {
    console.error('❌ Error during comparison:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { CycleDateComparator };
