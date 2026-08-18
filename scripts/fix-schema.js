const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// Remove the mistakenly added lines from everywhere first
schema = schema.replace(/\s*territories\s*Territory\[\]/g, '');
schema = schema.replace(/\s*userTerritories\s*UserTerritory\[\]/g, '');
schema = schema.replace(/\s*salesQuotas\s*SalesQuota\[\]/g, '');
schema = schema.replace(/\s*dealSnapshots\s*DealSnapshot\[\]/g, '');

// Now add back exactly where needed
schema = schema.replace(/model Tenant \{([\s\S]*?)\}/, (match, body) => {
  if (!body.includes('territories')) {
    return match.replace(/\}$/, `  territories            Territory[]\n  userTerritories        UserTerritory[]\n  salesQuotas            SalesQuota[]\n  dealSnapshots          DealSnapshot[]\n}`);
  }
  return match;
});

schema = schema.replace(/model User \{([\s\S]*?)\}/, (match, body) => {
  if (!body.includes('userTerritories')) {
    return match.replace(/\}$/, `  userTerritories        UserTerritory[]\n  salesQuotas            SalesQuota[]\n}`);
  }
  return match;
});

schema = schema.replace(/model Deal \{([\s\S]*?)\}/, (match, body) => {
  if (!body.includes('dealSnapshots')) {
    return match.replace(/\}$/, `  dealSnapshots          DealSnapshot[]\n}`);
  }
  return match;
});

schema = schema.replace(/model PipelineStage \{([\s\S]*?)\}/, (match, body) => {
  if (!body.includes('dealSnapshots')) {
    return match.replace(/\}$/, `  dealSnapshots          DealSnapshot[]\n}`);
  }
  return match;
});

fs.writeFileSync(schemaPath, schema);
console.log('Fixed schema relations');
