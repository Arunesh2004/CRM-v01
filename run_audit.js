const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

function countFiles(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      count += countFiles(fullPath);
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        count++;
      }
    }
  }
  return count;
}

function findLargeFiles(dir, maxLines = 500) {
  let largeFiles = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      largeFiles = largeFiles.concat(findLargeFiles(fullPath, maxLines));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length;
      if (lines > maxLines) {
        largeFiles.push({ file: fullPath.replace(rootDir, ''), lines });
      }
    }
  }
  return largeFiles;
}

function runAudit() {
  console.log("Running Deep Codebase Audit...");

  let markdown = `# Codebase Deep Audit Report\n\n`;

  // A. Application structure
  markdown += `## A. Application Structure\n`;
  markdown += `- Total TS/TSX files in src: ${countFiles(srcDir)}\n`;
  
  // Find large files (candidates for simplification / splitting)
  markdown += `\n## Candidates for Simplification (Files > 500 lines)\n`;
  const largeFiles = findLargeFiles(srcDir).sort((a, b) => b.lines - a.lines);
  for (const lf of largeFiles.slice(0, 30)) {
    markdown += `- \`${lf.file}\` (${lf.lines} lines)\n`;
  }

  // Find Duplicate Dependencies / Unused Dependencies
  // We can use a heuristic or depcruise, but for this fast script we just list package.json size
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  markdown += `\n## V. Dependencies\n`;
  markdown += `- Dependencies: ${Object.keys(pkg.dependencies || {}).length}\n`;
  markdown += `- DevDependencies: ${Object.keys(pkg.devDependencies || {}).length}\n`;

  // Identifying unused exports
  try {
    console.log("Running ts-prune to find dead code...");
    execSync('npx ts-prune > ts-prune-output.txt', { stdio: 'ignore' });
    const pruneLines = fs.readFileSync('ts-prune-output.txt', 'utf8').split('\n').length;
    markdown += `\n## Dead Code Candidates\n`;
    markdown += `- Identified ${pruneLines} potentially unused exports via ts-prune.\n`;
  } catch(e) {
    // ts-prune might not be installed or fails
    markdown += `\n## Dead Code Candidates\n- Unable to run ts-prune.\n`;
  }

  fs.writeFileSync(path.join(rootDir, 'audit_report.md'), markdown);
  console.log("Audit complete. See audit_report.md");
}

runAudit();
