const fs = require('fs');
const path = require('path');

function printEnvKeys(filename) {
    if (!fs.existsSync(filename)) return;
    const content = fs.readFileSync(filename, 'utf-8');
    const keys = [];
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            keys.push(trimmed.split('=')[0]);
        }
    });
    console.log(`--- Keys for ${filename} ---`);
    console.log(keys.join(', '));
}

const envFiles = [
    '.env', '.env.local', '.env.preview', '.env.staging', '.env.test', '.env.production'
];

envFiles.forEach(f => printEnvKeys(f));
