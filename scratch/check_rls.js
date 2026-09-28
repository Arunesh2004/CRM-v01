const fs = require('fs');
const mig = fs.readFileSync('database/migrations/20260910000000_canonical_baseline/migration.sql', 'utf8');
const tables = ['AITool','CCTVNode','Invoice','Permission','RecordingIngestionJob','RetentionDeletionJob','Subscription','Tenant','UserInvitation'];
tables.forEach(t => {
    const enable = mig.includes('ALTER TABLE "' + t + '" ENABLE ROW LEVEL SECURITY');
    const force = mig.includes('ALTER TABLE "' + t + '" FORCE ROW LEVEL SECURITY');
    const policyMatches = [...mig.matchAll(new RegExp('CREATE POLICY "([^"]+)" ON "' + t + '"', 'g'))];
    const policies = policyMatches.map(m => m[1]);
    console.log(`${t}: ENABLE=${enable}, FORCE=${force}, POLICIES=${policies.join(',')}`);
});
