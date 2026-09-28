function safeUrlCheck(urlStr, name) {
    if (!urlStr) {
        console.log(`${name}: MISSING`);
        return;
    }
    if (urlStr === '[SENSITIVE]') {
        console.log(`${name}: MASKED BY VERCEL`);
        return;
    }
    try {
        const u = new URL(urlStr);
        let projectRef = 'UNKNOWN';
        if (u.hostname.includes('.supabase.co')) {
            projectRef = u.hostname.split('.')[1] || 'UNKNOWN';
        } else if (u.hostname.includes('supabase.com')) {
            projectRef = u.hostname.split('.')[0];
        }
        console.log(`${name}: Hostname[${u.hostname}] ProjectRef[${projectRef}] Database[${u.pathname.substring(1)}] Port[${u.port || 'default'}]`);
    } catch (e) {
        console.log(`${name}: INVALID URL FORMAT`);
    }
}

safeUrlCheck(process.env.DATABASE_URL, 'DATABASE_URL');
safeUrlCheck(process.env.DIRECT_URL, 'DIRECT_URL');
