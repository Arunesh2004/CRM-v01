const fs = require('fs');

const content = fs.readFileSync('.env.staging', 'utf-8');
const lines = content.split('\n');
console.log(`First 10 lines:`);
lines.slice(0, 10).forEach(line => console.log(line));
