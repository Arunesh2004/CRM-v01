const dotenv = require('dotenv');
const env = dotenv.parse(require('fs').readFileSync('.env.production'));
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0,12));
console.log('CLERK_SECRET_KEY:', env.CLERK_SECRET_KEY?.substring(0,12));
console.log('NEXT_PUBLIC_CLERK_PROXY_URL:', env.NEXT_PUBLIC_CLERK_PROXY_URL);
console.log('CLERK_PROXY_URL:', env.CLERK_PROXY_URL);
