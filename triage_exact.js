const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf-8'));

let totalReportedErrors = 0;
let totalReportedWarnings = 0;
let calculatedErrors = 0;
let calculatedWarnings = 0;

const categories = {
  PRODUCTION_SRC: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  SUPPORTED_TESTS: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  SECURITY_TESTS: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  TOOLING_SCRIPTS: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  HISTORICAL_SCRATCH: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  GENERATED: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  CONFIG: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() },
  OTHER: { errors: 0, warnings: 0, errorRules: {}, warningRules: {}, errorFiles: new Set(), warningFiles: new Set() }
};

function getCategory(relPath) {
  if (relPath.startsWith('src/tests/security/') || relPath.startsWith('tests/security/')) return 'SECURITY_TESTS';
  if (relPath.startsWith('src/tests/') || relPath.startsWith('tests/e2e/') || relPath.startsWith('tests/integration/') || relPath.startsWith('tests/unit/')) return 'SUPPORTED_TESTS';
  if (relPath.startsWith('src/')) return 'PRODUCTION_SRC';
  if (relPath.startsWith('scripts/')) return 'TOOLING_SCRIPTS';
  if (relPath.endsWith('.config.js') || relPath.endsWith('.config.ts') || relPath === 'package.json') return 'CONFIG';
  if (relPath.includes('generated') || relPath.includes('.next') || relPath.includes('build')) return 'GENERATED';
  
  if (relPath.startsWith('tests/')) return 'HISTORICAL_SCRATCH'; // The root tests folder has many historical scratch .js tests
  
  if (/^test-.*\.js$/.test(relPath) || relPath.includes('verify-rls') || /^phase.*\.ts$/.test(relPath) || relPath.includes('audit') || /^test-.*\.mjs$/.test(relPath)) return 'HISTORICAL_SCRATCH';
  
  return 'OTHER';
}

for (const file of report) {
  totalReportedErrors += file.errorCount;
  totalReportedWarnings += file.warningCount;
  
  const relPath = path.relative(process.cwd(), file.filePath).replace(/\\/g, '/');
  const cat = getCategory(relPath);
  
  for (const msg of file.messages) {
    const rule = msg.ruleId || 'unknown';
    if (msg.severity === 2) {
      calculatedErrors++;
      categories[cat].errors++;
      categories[cat].errorRules[rule] = (categories[cat].errorRules[rule] || 0) + 1;
      categories[cat].errorFiles.add(relPath);
    } else if (msg.severity === 1) {
      calculatedWarnings++;
      categories[cat].warnings++;
      categories[cat].warningRules[rule] = (categories[cat].warningRules[rule] || 0) + 1;
      categories[cat].warningFiles.add(relPath);
    }
  }
}

console.log(`Reported Errors: ${totalReportedErrors}, Calculated Errors: ${calculatedErrors}`);
console.log(`Reported Warnings: ${totalReportedWarnings}, Calculated Warnings: ${calculatedWarnings}`);
if (totalReportedErrors !== calculatedErrors || totalReportedWarnings !== calculatedWarnings) {
  console.log('MATHEMATICAL INCONSISTENCY DETECTED!');
}

for (const [catName, data] of Object.entries(categories)) {
  console.log(`\n=== ${catName} ===`);
  console.log(`ERRORS: ${data.errors} (across ${data.errorFiles.size} files)`);
  for (const [rule, count] of Object.entries(data.errorRules).sort((a,b)=>b[1]-a[1])) {
    console.log(`  - ${rule}: ${count}`);
  }
  
  console.log(`WARNINGS: ${data.warnings} (across ${data.warningFiles.size} files)`);
  for (const [rule, count] of Object.entries(data.warningRules).sort((a,b)=>b[1]-a[1])) {
    console.log(`  - ${rule}: ${count}`);
  }
}
