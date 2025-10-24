const { execSync } = require('child_process');

console.log('Running debug script with tsx...');
try {
  const output = execSync('npx tsx debug-tasks.ts', { 
    encoding: 'utf8',
    cwd: __dirname 
  });
  console.log(output);
} catch (error) {
  console.error('Error:', error.message);
}
