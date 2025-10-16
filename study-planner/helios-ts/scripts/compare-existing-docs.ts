#!/usr/bin/env tsx

import { readFileSync, existsSync, readdirSync } from 'fs';
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
  cycleDifferences: CycleDifference[];
  blockDifferences: BlockDifference[];
  summary: {
    totalCycles: { dir1: number; dir2: number };
    totalBlocks: { dir1: number; dir2: number };
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
    dir1Value: any;
    dir2Value: any;
  }[];
}

interface BlockDifference {
  blockId: string;
  blockName: string;
  cycleType: string;
  type: 'added' | 'removed' | 'modified';
  changes: {
    field: string;
    dir1Value: any;
    dir2Value: any;
  }[];
}

class ExistingDocsComparator {
  private dir1: string;
  private dir2: string;

  constructor(dir1: string, dir2: string) {
    this.dir1 = dir1;
    this.dir2 = dir2;
  }

  async compareDirectories(): Promise<ComparisonResult[]> {
    console.log(`🔍 Comparing cycles and blocks between directories:`);
    console.log(`   Directory 1: ${this.dir1}`);
    console.log(`   Directory 2: ${this.dir2}`);
    
    if (!existsSync(this.dir1)) {
      throw new Error(`Directory 1 does not exist: ${this.dir1}`);
    }
    
    if (!existsSync(this.dir2)) {
      throw new Error(`Directory 2 does not exist: ${this.dir2}`);
    }
    
    const results: ComparisonResult[] = [];
    
    // Get all .js files from both directories
    const dir1Files = this.getJsFiles(this.dir1);
    const dir2Files = this.getJsFiles(this.dir2);
    
    const allFiles = new Set([...dir1Files, ...dir2Files]);
    
    console.log(`📁 Found ${dir1Files.length} files in directory 1, ${dir2Files.length} files in directory 2`);
    
    for (const fileName of allFiles) {
      const file1Path = join(this.dir1, fileName);
      const file2Path = join(this.dir2, fileName);
      
      const result: ComparisonResult = {
        file: fileName,
        cycleDifferences: [],
        blockDifferences: [],
        summary: {
          totalCycles: { dir1: 0, dir2: 0 },
          totalBlocks: { dir1: 0, dir2: 0 },
          dateChanges: 0,
          structuralChanges: 0
        }
      };
      
      if (existsSync(file1Path) && existsSync(file2Path)) {
        // Both files exist - compare them
        console.log(`📄 Comparing ${fileName}...`);
        
        try {
          const data1 = this.parseJsFile(file1Path);
          const data2 = this.parseJsFile(file2Path);
          
          result.cycleDifferences = this.compareCycles(data1.cycles, data2.cycles);
          result.blockDifferences = this.compareBlocks(data1.blocks, data2.blocks);
          
          result.summary.totalCycles = {
            dir1: data1.cycles.length,
            dir2: data2.cycles.length
          };
          result.summary.totalBlocks = {
            dir1: data1.blocks.length,
            dir2: data2.blocks.length
          };
          
          result.summary.dateChanges = this.countDateChanges(result.cycleDifferences, result.blockDifferences);
          result.summary.structuralChanges = this.countStructuralChanges(result.cycleDifferences, result.blockDifferences);
          
        } catch (error) {
          console.error(`❌ Error parsing ${fileName}:`, error);
          continue;
        }
        
      } else if (existsSync(file1Path)) {
        // File only exists in directory 1
        console.log(`📄 ${fileName} only exists in directory 1`);
        try {
          const data1 = this.parseJsFile(file1Path);
          result.cycleDifferences = data1.cycles.map(cycle => ({
            cycleId: cycle.cycleId,
            cycleType: cycle.cycleType,
            type: 'removed' as const,
            changes: []
          }));
          result.blockDifferences = data1.blocks.map(block => ({
            blockId: block.blockId,
            blockName: block.blockName,
            cycleType: this.getCycleTypeForBlock(block.blockId, data1.cycles),
            type: 'removed' as const,
            changes: []
          }));
        } catch (error) {
          console.error(`❌ Error parsing ${fileName}:`, error);
          continue;
        }
        
      } else if (existsSync(file2Path)) {
        // File only exists in directory 2
        console.log(`📄 ${fileName} only exists in directory 2`);
        try {
          const data2 = this.parseJsFile(file2Path);
          result.cycleDifferences = data2.cycles.map(cycle => ({
            cycleId: cycle.cycleId,
            cycleType: cycle.cycleType,
            type: 'added' as const,
            changes: []
          }));
          result.blockDifferences = data2.blocks.map(block => ({
            blockId: block.blockId,
            blockName: block.blockName,
            cycleType: this.getCycleTypeForBlock(block.blockId, data2.cycles),
            type: 'added' as const,
            changes: []
          }));
        } catch (error) {
          console.error(`❌ Error parsing ${fileName}:`, error);
          continue;
        }
      }
      
      results.push(result);
    }
    
    return results;
  }

  private getJsFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(file => file.endsWith('.js'));
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

  private compareCycleFields(cycle1: CycleData, cycle2: CycleData): { field: string; dir1Value: any; dir2Value: any }[] {
    const changes: { field: string; dir1Value: any; dir2Value: any }[] = [];
    const fieldsToCompare = ['cycleStartDate', 'cycleEndDate', 'cycleDuration', 'cycleIntensity', 'cycleName', 'cycleDescription'];
    
    for (const field of fieldsToCompare) {
      const value1 = (cycle1 as any)[field];
      const value2 = (cycle2 as any)[field];
      
      if (value1 !== value2) {
        changes.push({
          field,
          dir1Value: value1,
          dir2Value: value2
        });
      }
    }
    
    return changes;
  }

  private compareBlockFields(block1: BlockData, block2: BlockData): { field: string; dir1Value: any; dir2Value: any }[] {
    const changes: { field: string; dir1Value: any; dir2Value: any }[] = [];
    const fieldsToCompare = ['blockStartDate', 'blockEndDate', 'blockName', 'blockDescription', 'subjectCode', 'subjectName'];
    
    for (const field of fieldsToCompare) {
      const value1 = (block1 as any)[field];
      const value2 = (block2 as any)[field];
      
      if (value1 !== value2) {
        changes.push({
          field,
          dir1Value: value1,
          dir2Value: value2
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

  generateReport(results: ComparisonResult[], dir1Name: string, dir2Name: string): string {
    const reportPath = join(process.cwd(), `cycle-comparison-report-${Date.now()}.md`);
    let report = `# Cycle and Block Date Comparison Report\n\n`;
    report += `**Directories Compared:** ${dir1Name} vs ${dir2Name}\n`;
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
    
    if (filesWithChanges === 0) {
      report += `✅ **No differences found between the directories!**\n\n`;
      fs.writeFileSync(reportPath, report);
      return reportPath;
    }
    
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
              report += `  - ${change.field}: \`${change.dir1Value}\` → \`${change.dir2Value}\`\n`;
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
              report += `  - ${change.field}: \`${change.dir1Value}\` → \`${change.dir2Value}\`\n`;
            }
          }
          report += `\n`;
        }
      }
      
      report += `---\n\n`;
    }
    
    fs.writeFileSync(reportPath, report);
    return reportPath;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: tsx compare-existing-docs.ts <directory1> <directory2>');
    console.log('Example: tsx compare-existing-docs.ts generated-docs generated-docs.new');
    console.log('Example: tsx compare-existing-docs.ts /path/to/branch1/generated-docs /path/to/branch2/generated-docs');
    process.exit(1);
  }
  
  const [dir1, dir2] = args;
  
  try {
    const comparator = new ExistingDocsComparator(dir1, dir2);
    const results = await comparator.compareDirectories();
    
    const reportPath = comparator.generateReport(results, dir1, dir2);
    console.log(`📊 Report generated: ${reportPath}`);
    
    // Print summary to console
    const totalFiles = results.length;
    const filesWithChanges = results.filter(r => 
      r.cycleDifferences.length > 0 || r.blockDifferences.length > 0
    ).length;
    
    const totalDateChanges = results.reduce((sum, r) => sum + r.summary.dateChanges, 0);
    const totalStructuralChanges = results.reduce((sum, r) => sum + r.summary.structuralChanges, 0);
    
    console.log('\n📈 Summary:');
    console.log(`   Files compared: ${totalFiles}`);
    console.log(`   Files with changes: ${filesWithChanges}`);
    console.log(`   Date changes: ${totalDateChanges}`);
    console.log(`   Structural changes: ${totalStructuralChanges}`);
    
    if (filesWithChanges === 0) {
      console.log('✅ No differences found!');
    } else {
      console.log('⚠️  Differences found - check the report for details');
    }
    
  } catch (error) {
    console.error('❌ Error during comparison:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ExistingDocsComparator };
