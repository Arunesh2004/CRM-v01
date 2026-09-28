const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf-8'));
const inventory = {};

report.forEach(file => {
  const relPath = path.relative(process.cwd(), file.filePath).replace(/\\/g, '/');
  
  // Strict check for production src
  if (!relPath.startsWith('src/')) return;
  if (relPath.startsWith('src/tests/')) return;
  
  file.messages.forEach(msg => {
    if (msg.severity === 2) {
      const rule = msg.ruleId || 'unknown';
      if (!inventory[rule]) inventory[rule] = [];
      inventory[rule].push({
        file: relPath,
        line: msg.line,
        message: msg.message
      });
    }
  });
});

let out = '# Production Src Lint Inventory\n\n';
for (const [rule, items] of Object.entries(inventory)) {
  out += `## ${rule}\n\n`;
  items.forEach(i => {
    out += `- **${i.file}:${i.line}** - ${i.message}\n`;
  });
  out += '\n';
}

fs.writeFileSync('C:/Users/Administrator/.gemini/antigravity-ide/brain/4abfe41c-a2d6-4c10-914b-acb61bc14b2b/PRODUCTION_LINT_INVENTORY.md', out);
