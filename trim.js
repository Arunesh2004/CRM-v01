const fs = require('fs');
const files = [
  'src/app/sign-in/[[...sign-in]]/page.tsx',
  'src/app/sign-up/[[...sign-up]]/page.tsx',
  'src/app/unauthorized/page.tsx',
  'src/middleware.ts',
  'src/app/(crm)/CRMLayoutClient.tsx',
  'src/tests/security/auth-phase2.test.ts'
];
files.forEach(f => {
  if(fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, content.replace(/[ \t]+$/gm, ''));
  }
});
