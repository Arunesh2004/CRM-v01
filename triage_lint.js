const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf-8'));

let totalErrors = 0;
let totalWarnings = 0;

const stats = {
  src: { errors: 0, warnings: 0, files: 0, rules: {} },
  tests: { errors: 0, warnings: 0, files: 0, rules: {} },
  scripts: { errors: 0, warnings: 0, files: 0, rules: {} },
  historical: { errors: 0, warnings: 0, files: 0, rules: {} },
  config: { errors: 0, warnings: 0, files: 0, rules: {} },
  generated: { errors: 0, warnings: 0, files: 0, rules: {} },
  other: { errors: 0, warnings: 0, files: 0, rules: {} }
};

for (const file of report) {
  let errors = file.errorCount;
  let warnings = file.warningCount;
  if (errors === 0 && warnings === 0) continue;
  
  totalErrors += errors;
  totalWarnings += warnings;
  
  const relPath = path.relative(process.cwd(), file.filePath).replace(/\\/g, '/');
  
  let category = 'other';
  if (relPath.startsWith('src/tests/')) {
    category = 'tests';
  } else if (relPath.startsWith('src/')) {
    category = 'src';
  } else if (relPath.startsWith('tests/')) {
    category = 'tests';
  } else if (relPath.startsWith('scripts/')) {
    category = 'scripts';
  } else if (/^test-.*\.js$/.test(relPath) || relPath.includes('verify-rls') || /^phase.*\.ts$/.test(relPath) || relPath.includes('audit')) {
    category = 'historical';
  } else if (relPath.endsWith('.config.js') || relPath.endsWith('.config.ts') || relPath === 'package.json') {
    category = 'config';
  } else if (relPath.includes('generated') || relPath.includes('build')) {
    category = 'generated';
  } else if (!relPath.includes('/')) {
    category = 'historical';
  }
  
  stats[category].errors += errors;
  stats[category].warnings += warnings;
  stats[category].files++;
  
  for (const msg of file.messages) {
    const rule = msg.ruleId || 'unknown';
    stats[category].rules[rule] = (stats[category].rules[rule] || 0) + 1;
  }
}

console.log(`Total Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log('---');

for (const cat in stats) {
  console.log(`\nCategory: ${cat.toUpperCase()}`);
  console.log(`Errors: ${stats[cat].errors}, Warnings: ${stats[cat].warnings}, Files: ${stats[cat].files}`);
  const sortedRules = Object.entries(stats[cat].rules).sort((a, b) => b[1] - a[1]);
  for (const [rule, count] of sortedRules) {
    console.log(`  - ${rule}: ${count}`);
  }
}
