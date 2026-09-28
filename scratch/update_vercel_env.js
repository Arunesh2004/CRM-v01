const { execSync } = require('child_process');

const pk = "pk_test_cHJvcGVyLWZsYW1pbmdvLTk1LmNsZXJrLmFjY291bnRzLmRldiQ";
const sk = "sk_test_joHlZA8tlJffPi806U2yeS7NjXt36G59uDPBE1HLyV";

function setEnv(key, value) {
    try {
        console.log(`Removing ${key}...`);
        execSync(`cmd.exe /c npx vercel env rm ${key} production -y`);
    } catch (e) {
        console.log(`${key} might not exist or couldn't be removed.`);
    }
    
    console.log(`Adding ${key}...`);
    execSync(`cmd.exe /c npx vercel env add ${key} production`, {
        input: value
    });
    console.log(`${key} added successfully.`);
}

setEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', pk);
setEnv('CLERK_SECRET_KEY', sk);
