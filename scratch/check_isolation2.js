const fs = require('fs');

function checkValue(filename, key) {
    if (!fs.existsSync(filename)) return;
    const content = fs.readFileSync(filename, 'utf-8');
    let val = '';
    content.split('\n').forEach(line => {
        if (line.startsWith(key + '=')) {
            val = line.substring(key.length + 1).trim();
        }
    });
    if (!val) {
        console.log(`${filename}: ${key} MISSING`);
    } else {
        // Hash it to safely prove distinctness without revealing anything
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(val).digest('hex').substring(0, 8);
        console.log(`${filename}: ${key} -> hash[${hash}] length[${val.length}]`);
    }
}

checkValue('.env.production', 'DATABASE_URL');
checkValue('.env.staging', 'DATABASE_URL');
checkValue('.env.production', 'REDIS_URL');
checkValue('.env.staging', 'REDIS_URL');
checkValue('.env.production', 'CLERK_SECRET_KEY');
checkValue('.env.staging', 'CLERK_SECRET_KEY');
