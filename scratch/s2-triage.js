const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lint-results2.json', 'utf8'));

const groups = {
  'src/app/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'src/lib/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'src/modules/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'src/workers/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'src/inngest/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'src/tests/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'scripts/**': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'root tooling/config files': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} },
  'other maintained': { count: 0, errors: 0, warnings: 0, files: new Set(), rules: {} }
};

const syntaxErrors = [];
const hookErrors = [];
const securityFilesData = {};

const secFiles = [
  'src/lib/auth.ts', 'src/app/api/auth/login/route.ts', 'src/app/api/auth/logout/route.ts',
  'src/app/api/pusher/auth/route.ts', 'src/lib/auth/password.ts', 'src/lib/auth/SessionProvider.tsx'
];

data.forEach(d => {
  const f = d.filePath.replace(/\\/g, '/');
  const rel = f.split('AI-Security-CRM-SaaS/')[1] || f;
  
  let g = 'other maintained';
  if (rel.startsWith('src/app/')) g = 'src/app/**';
  else if (rel.startsWith('src/lib/')) g = 'src/lib/**';
  else if (rel.startsWith('src/modules/')) g = 'src/modules/**';
  else if (rel.startsWith('src/workers/')) g = 'src/workers/**';
  else if (rel.startsWith('src/inngest/')) g = 'src/inngest/**';
  else if (rel.startsWith('src/tests/') || rel.startsWith('tests/')) g = 'src/tests/**';
  else if (rel.startsWith('scripts/')) g = 'scripts/**';
  else if (!rel.includes('/')) g = 'root tooling/config files';

  if (d.messages.length > 0) {
    d.messages.forEach(m => {
      groups[g].count++;
      if (m.severity === 2) groups[g].errors++;
      else groups[g].warnings++;
      groups[g].files.add(rel);
      
      const r = m.ruleId || 'syntax-error';
      groups[g].rules[r] = (groups[g].rules[r] || 0) + 1;

      if (r === 'syntax-error' || !m.ruleId) {
        syntaxErrors.push({ file: rel, line: m.line, col: m.column, msg: m.message });
      }
      
      if (r === 'react-hooks/rules-of-hooks' || r === 'react-hooks/set-state-in-effect') {
        hookErrors.push({ rule: r, file: rel, line: m.line });
      }
      
      if (secFiles.some(sf => rel.endsWith(sf)) && r === '@typescript-eslint/no-explicit-any') {
        if (!securityFilesData[rel]) securityFilesData[rel] = [];
        securityFilesData[rel].push({ line: m.line, msg: m.message });
      }
    });
  }
});

console.log("--- GROUP COUNTS ---");
for (const [g, v] of Object.entries(groups)) {
  const top = Object.entries(v.rules).sort((a,b) => b[1] - a[1]).slice(0, 10).map(x => `${x[0]}(${x[1]})`).join(', ');
  console.log(`${g} | Total: ${v.count} | E: ${v.errors} | W: ${v.warnings} | Files: ${v.files.size}`);
  console.log(`  Top rules: ${top}`);
}

console.log("\n--- SYNTAX ERRORS ---");
console.log(JSON.stringify(syntaxErrors, null, 2));

console.log("\n--- HOOK ERRORS ---");
console.log(JSON.stringify(hookErrors, null, 2));

console.log("\n--- SECURITY FILES ANY USAGE ---");
console.log(JSON.stringify(securityFilesData, null, 2));
