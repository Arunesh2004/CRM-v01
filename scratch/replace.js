const fs = require('fs');
const file = 'src/lib/providers/ai/gemini-engine.provider.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "import { AIConfig } from '../../config/ai.config';",
  "import { AIConfig } from '../../config/ai.config';\nimport { ProviderRateLimitError, ProviderTransientError, ProviderPermanentError, ProviderConfigurationError } from '../../observability/errors';"
);
content = content.replace(
  "if (!isTransient || attempt > AIConfig.GEMINI_MAX_RETRIES) {\n            throw err;\n          }",
  `if (!isTransient || attempt > AIConfig.GEMINI_MAX_RETRIES) {
            const isRateLimit = msg.includes('429') || status === 429;
            const isAuth = msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || status === 401 || status === 403;

            if (isAuth) {
              throw new ProviderConfigurationError(\`Gemini AI Authentication/Configuration Error: \${err.message}\`);
            } else if (isRateLimit) {
              throw new ProviderRateLimitError(\`Gemini AI Rate Limit: \${err.message}\`);
            } else if (isTransient) {
              throw new ProviderTransientError(\`Gemini AI Transient Failure after retries: \${err.message}\`);
            } else {
              throw new ProviderPermanentError(\`Gemini AI Permanent Error: \${err.message}\`);
            }
          }`
);
fs.writeFileSync(file, content);
console.log('done');
