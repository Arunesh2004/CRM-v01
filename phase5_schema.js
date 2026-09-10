const fs=require('fs'); 
const lines=fs.readFileSync('database/schema.prisma','utf8'); 
console.log('Subscription in schema:', lines.includes('model Subscription')); 
console.log('Invoice in schema:', lines.includes('model Invoice'));
