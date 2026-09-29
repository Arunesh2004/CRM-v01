const { execSync } = require('child_process');

function setEnv(key, value) {
    try {
        console.log(`Removing ${key}...`);
        execSync(`cmd.exe /c npx --yes vercel@latest env rm ${key} production -y`);
    } catch (e) {
        console.log(`${key} might not exist or couldn't be removed.`);
    }
    
    console.log(`Adding ${key}...`);
    execSync(`cmd.exe /c npx --yes vercel@latest env add ${key} production`, {
        input: value
    });
    console.log(`${key} added successfully.`);
}

setEnv('INNGEST_ENV', 'crm-v01-staging');
