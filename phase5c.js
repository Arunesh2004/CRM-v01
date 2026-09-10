const fs = require('fs');
const m = JSON.parse(fs.readFileSync('docs/forensics/S3.8B_PRODUCTION_MIGRATIONS_FULL.json'));
console.log('Total:', m.length);
const canonical = m.find(x => x.migration_name.includes('canonical_baseline'));
console.log('Canonical applied:', !!canonical, canonical ? canonical.finished_at : null);
