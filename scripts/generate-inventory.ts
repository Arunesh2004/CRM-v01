import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const inventory: Record<string, string[]> = {};

walkDir('./src/modules', (filePath) => {
  if (filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const exports: string[] = [];
    
    // Simple regex to catch exports
    const exportRegex = /export\s+(?:async\s+)?(?:function|const)\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    if (exports.length > 0) {
      inventory[filePath] = exports;
    }
  }
});

fs.writeFileSync('inventory.json', JSON.stringify(inventory, null, 2));
console.log('Inventory saved to inventory.json');
