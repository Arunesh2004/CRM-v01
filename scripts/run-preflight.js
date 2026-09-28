const fs = require('fs');
const content = fs.readFileSync('docs/INFRASTRUCTURE_VERIFICATION_REPORT.md', 'utf8');
const match = content.match(/DATABASE_URL="([^"]+)"/);
if (match) {
  process.env.DB_URL = match[1];
  require('./preflight.js');
} else {
  console.error("URL not found");
}
