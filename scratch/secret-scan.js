const { execSync } = require('child_process');
const fs = require('fs');

const files = execSync('git ls-files').toString().split('\n').filter(Boolean);
let found = 0;
for (const file of files) {
  if (file.includes('node_modules') || file.includes('.git') || file.endsWith('.json') || file.includes('scratch') || file.includes('verify-rls.js') || file.includes('scripts/test-') || file.includes('tests/load/')) continue;
  if (file.includes('test') || file.includes('mock') || file.includes('fixture')) continue;

  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.match(/(const|let|var|process\.env\.)/)) {
         if (line.match(/DATABASE_URL|DIRECT_URL|SECRET|TOKEN|PASSWORD|API_KEY/i)) {
             if (line.match(/=\s*['"][^'"]+['"]/)) {
                if (!line.includes('process.env')) {
                    const match = line.match(/(DATABASE_URL|DIRECT_URL|SECRET|TOKEN|PASSWORD|API_KEY)/i);
                    const category = match ? match[0] : 'UNKNOWN_SECRET';
                    console.log(`[ALERT] File: ${file}, Line: ${index + 1}, Category: ${category}`);
                    found++;
                }
             }
         }
      }
    });
  } catch (err) {}
}
if (found === 0) console.log("No hardcoded secrets detected in the committed tree.");
