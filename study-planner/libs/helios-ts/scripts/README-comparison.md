# Cycle and Block Date Comparison Scripts

This directory contains scripts to compare dates for cycles and blocks between different versions of generated documentation files.

## Scripts Available

### 1. `compare-cycle-dates.ts` - Full Git Branch Comparison

This script compares cycles and blocks between two git branches by:
1. Checking out each branch
2. Building the project
3. Generating documentation
4. Comparing the results

**Usage:**
```bash
# Using pnpm script
pnpm compare-cycles <branch1> <branch2>

# Direct execution
tsx scripts/compare-cycle-dates.ts <branch1> <branch2>
```

**Example:**
```bash
pnpm compare-cycles main feature-branch
```

### 2. `compare-existing-docs.ts` - Compare Existing Directories

This script compares cycles and blocks between two existing directories containing generated .js files.

**Usage:**
```bash
# Using pnpm script
pnpm compare-docs <directory1> <directory2>

# Direct execution
tsx scripts/compare-existing-docs.ts <directory1> <directory2>
```

**Examples:**
```bash
# Compare two existing generated-docs directories
pnpm compare-docs generated-docs generated-docs.new

# Compare docs from different branches (if you've already generated them)
pnpm compare-docs /path/to/branch1/generated-docs /path/to/branch2/generated-docs
```

## What Gets Compared

### Cycle Data
- `cycleStartDate` - Start date of the cycle
- `cycleEndDate` - End date of the cycle
- `cycleDuration` - Duration in weeks
- `cycleIntensity` - Intensity level (Foundation, Revision, etc.)
- `cycleName` - Name of the cycle
- `cycleDescription` - Description of the cycle

### Block Data
- `blockStartDate` - Start date of the block
- `blockEndDate` - End date of the block
- `blockName` - Name of the block
- `blockDescription` - Description of the block
- `subjectCode` - Subject code
- `subjectName` - Subject name

## Output

Both scripts generate:
1. **Console Output** - Real-time progress and summary
2. **Markdown Report** - Detailed comparison report saved as `cycle-comparison-report-<timestamp>.md`

### Report Contents

The generated report includes:

#### Summary Section
- Total files compared
- Files with changes
- Total date changes
- Total structural changes

#### Detailed Changes
For each file with differences:
- **Cycle Changes**: Added, removed, or modified cycles
- **Block Changes**: Added, removed, or modified blocks
- **Field-by-field comparisons** showing old vs new values

## Example Output

```
🔍 Comparing cycles and blocks between directories:
   Directory 1: generated-docs
   Directory 2: generated-docs.new
📁 Found 14 files in directory 1, 14 files in directory 2
📄 Comparing T1.js...
📄 Comparing T2.js...
...
📊 Report generated: /path/to/cycle-comparison-report-1703123456789.md

📈 Summary:
   Files compared: 14
   Files with changes: 3
   Date changes: 15
   Structural changes: 2
⚠️  Differences found - check the report for details
```

## Use Cases

### 1. Before/After Refactoring
Compare generated docs before and after making changes to cycle planning logic:
```bash
# Generate docs before changes
git checkout main
pnpm generate-docs
mv generated-docs generated-docs-main

# Generate docs after changes
git checkout feature-branch
pnpm generate-docs
mv generated-docs generated-docs-feature

# Compare
pnpm compare-docs generated-docs-main generated-docs-feature
```

### 2. Branch Comparison
Compare two different branches:
```bash
pnpm compare-cycles main feature-branch
```

### 3. Configuration Changes
Compare the impact of configuration changes:
```bash
# Change configuration
# Generate docs
pnpm generate-docs
mv generated-docs generated-docs-old

# Change configuration again
# Generate docs
pnpm generate-docs

# Compare
pnpm compare-docs generated-docs-old generated-docs
```

## Troubleshooting

### Common Issues

1. **"Directory does not exist"**
   - Ensure the directories contain generated .js files
   - Check that `pnpm generate-docs` has been run

2. **"Could not parse studyPlanData"**
   - Ensure the .js files are properly formatted
   - Check that the files contain `window.studyPlanData = {...}`

3. **Memory issues with large files**
   - The scripts use `--max-old-space-size=8192` to handle large files
   - If still having issues, try processing fewer files at once

### Performance Tips

- The scripts process files sequentially to avoid memory issues
- Large files (like T1.js) may take a few seconds to parse
- The comparison is optimized for the specific structure of generated docs

## Integration with CI/CD

These scripts can be integrated into CI/CD pipelines to:
- Validate that changes don't break existing functionality
- Ensure date calculations remain consistent
- Detect unintended changes in cycle/block structures

Example GitHub Actions step:
```yaml
- name: Compare Generated Docs
  run: |
    pnpm generate-docs
    pnpm compare-docs generated-docs-baseline generated-docs
```
