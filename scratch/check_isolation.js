const fs = require('fs');

function parseDb(filename) {
    if (!fs.existsSync(filename)) {
        console.log(`${filename}: MISSING`);
        return;
    }
    const content = fs.readFileSync(filename, 'utf-8');
    let dbUrl = '';
    content.split('\n').forEach(line => {
        if (line.startsWith('DATABASE_URL=')) {
            dbUrl = line.split('=')[1].trim().replace(/['"]/g, '');
        }
    });
    if (!dbUrl) {
        console.log(`${filename}: DATABASE_URL MISSING`);
        return;
    }
    try {
        const url = new URL(dbUrl);
        // Supabase host is typically: db.[PROJECT_ID].supabase.co
        const hostParts = url.hostname.split('.');
        const projectId = hostParts.length > 2 ? hostParts[1] : url.hostname;
        console.log(`${filename} -> Host/Project ID: [${projectId.substring(0, 4)}***] | DB Name: [${url.pathname.substring(1)}]`);
    } catch (e) {
        console.log(`${filename}: DATABASE_URL INVALID FORMAT`);
    }
}

function parseRedis(filename) {
    if (!fs.existsSync(filename)) return;
    const content = fs.readFileSync(filename, 'utf-8');
    let redisUrl = '';
    content.split('\n').forEach(line => {
        if (line.startsWith('REDIS_URL=')) {
            redisUrl = line.split('=')[1].trim().replace(/['"]/g, '');
        }
    });
    if (!redisUrl) {
        console.log(`${filename}: REDIS_URL MISSING`);
        return;
    }
    try {
        const url = new URL(redisUrl);
        console.log(`${filename} -> Redis Host: [${url.hostname.substring(0, 5)}***]`);
    } catch (e) {
        console.log(`${filename}: REDIS_URL INVALID FORMAT`);
    }
}

parseDb('.env.production');
parseDb('.env.staging');
parseRedis('.env.production');
parseRedis('.env.staging');
