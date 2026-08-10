const fs = require('fs');

let schema = fs.readFileSync('database/schema.prisma', 'utf8');

// Add fields to Tenant
schema = schema.replace(
  /model Tenant \{[\s\S]*?updatedAt\s+DateTime\s+@updatedAt/,
  match => match + '\n  deletedAt DateTime?\n  deletedById String?\n  deletionReason String?'
);

// Models to add deletedAt DateTime? (if not already present)
const modelsWithDeletedAt = [
  'User', 'Role', 'Message', 'Conversation', 'Call', 'CallRecording', 
  'CallTranscript', 'AISummary', 'Incident', 'Camera', 'AIEvent', 
  'Subscription', 'Invoice', 'Payment'
];

modelsWithDeletedAt.forEach(model => {
  const regex = new RegExp(`(model ${model} \\{[\\s\\S]*?)(^\\s*@@)`, 'm');
  schema = schema.replace(regex, (match, p1, p2) => {
    if (!p1.includes('deletedAt')) {
      return p1 + '  deletedAt DateTime?\n\n' + p2;
    }
    return match;
  });
});

// Remove onDelete: Cascade from Tenant relations (except DeviceSession and Notification, which are kept cascade, and AuditLog which is Restrict)
// We will simply replace "tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)"
// with "tenant Tenant @relation(fields: [tenantId], references: [id])" for all except the exclusions.

const lines = schema.split('\n');
let currentModel = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('model ')) {
    currentModel = line.split(' ')[1];
  }
  
  if (line.includes('tenant ') && line.includes('@relation') && line.includes('onDelete: Cascade')) {
    if (currentModel !== 'DeviceSession' && currentModel !== 'Notification') {
      lines[i] = line.replace(/,\s*onDelete:\s*Cascade/, '');
    }
  }
}

schema = lines.join('\n');
fs.writeFileSync('database/schema.prisma', schema);
console.log('Schema updated successfully.');
