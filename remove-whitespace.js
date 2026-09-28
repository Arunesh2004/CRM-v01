const fs = require('fs');
['src/components/revenue/QuoteForm.tsx', 'src/tests/components/QuoteForm.test.tsx'].forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, c.replace(/[ \t]+$/gm, ''));
});
