const fs = require('fs');
const doc = fs.readFileSync('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\scratch\\AI-Security-CRM-SaaS\\docs\\FINAL_ENTERPRISE_ACCEPTANCE_REPORT.md', 'utf8');

// 1. /100 patterns (invented scores)
const inv100Pattern = /\d+\/100/g;
const inv100 = (doc.match(inv100Pattern) || []);
console.log('=== /100 patterns (should be 0) ===', inv100.length, inv100.join(', '));

// 2. Feature Completeness blocks (should be removed)
const fc = (doc.match(/Feature Completeness/g) || []);
console.log('=== "Feature Completeness" blocks (should be 0) ===', fc.length);

// 3. Score tables with %
const spPattern = /(Implementation|Architecture|Runtime|Business Rule|Enterprise) Score.*\d+%/g;
const sp = (doc.match(spPattern) || []);
console.log('=== Score % patterns (should be 0) ===', sp.length, sp.join(' | '));

// 4. Overall Confidence with %
const ocPattern = /Overall Confidence.*\d+%/g;
const oc = (doc.match(ocPattern) || []);
console.log('=== Overall Confidence % (should be 0) ===', oc.length);

// 5. Evidence strength labels (qualitative, should be many)
const esPattern = /Directly Observed|Unavailable|Strong|Limited|Moderate/g;
const es = (doc.match(esPattern) || []);
console.log('=== Evidence strength labels (should be >50) ===', es.length);

// 6. FAIL occurrences
const failPattern = /\bFAIL\b/g;
const fail = (doc.match(failPattern) || []);
console.log('=== FAIL occurrences ===', fail.length);

// 7. DEFERRED occurrences
const defPattern = /\bDEFERRED\b/g;
const def = (doc.match(defPattern) || []);
console.log('=== DEFERRED occurrences ===', def.length);

// 8. Confidence with %
const confPattern = /Confidence.*\d+%/g;
const confPct = (doc.match(confPattern) || []).filter(l => !l.includes('18.4') && !l.includes('84%') && !l.includes('88%') && !l.includes('2%'));
console.log('=== Confidence with % (should be 0) ===', confPct.length, confPct.slice(0, 3).join(' | '));

// 9. Any X/10 scores
const tenPattern = /\d+\/10\b/g;
const ten = (doc.match(tenPattern) || []);
console.log('=== /10 patterns (should be 0) ===', ten.length, ten.join(', '));

console.log('\n=== VALIDATION COMPLETE ===');
