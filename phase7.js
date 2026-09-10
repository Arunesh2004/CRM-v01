const fs = require('fs');
const sql = fs.readFileSync('database/migrations/20260910000000_canonical_baseline/migration.sql', 'utf8');
console.log('Subscription:', sql.includes('CREATE TABLE "Subscription"'));
console.log('Invoice:', sql.includes('CREATE TABLE "Invoice"'));
console.log('UserInvitation RLS:', sql.includes('ALTER TABLE "UserInvitation" ENABLE ROW LEVEL SECURITY'));
