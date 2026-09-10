const fs=require('fs'); 
const lines=fs.readFileSync('database/schema.prisma','utf8').split('\n'); 
let idx=lines.findIndex(l=>l.includes('model UserInvitation')); 
if(idx!==-1) console.log(lines.slice(idx, idx+30).join('\n'));
